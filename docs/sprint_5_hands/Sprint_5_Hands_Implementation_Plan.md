# AIAN — Hands Subsystem Implementation Plan (Sprint 5)

## 0. What this adds to the Draft Plan

The original draft got the shape right: Orchestrator → Skills → Providers, provider-independent interfaces, and structured I/O. However, it needs to be mapped to the actual **NestJS + Prisma** backend architecture we've built in Sprints 1 and 2. 

This document tailors the Hands Subsystem to our existing codebase:
- A **conversation/session layer** that stores multi-turn state (e.g., using Prisma or Redis).
- **DM vs. group separation** directly within our existing `SlackEventsController`.
- **Idempotency + audit logging** leveraging our existing Prisma schema patterns.
- **A concrete mapping** of our existing `EmailService`, `MessagesService`, and `RetrievalService` onto the new architecture, avoiding any rewrites.
- Following standard NestJS paradigms (Modules, `@Injectable()` services, Dependency Injection).

---

## 1. Foundational Design Principles (NestJS Context)

| # | Principle | Why it matters here |
|---|---|---|
| 1 | **Ports & Adapters (Hexagonal Architecture)** | `MessagingSkill` is the port. `MessagesService` uses `ProviderClientFactory` as the adapter layer. |
| 2 | **Structured I/O, schema-enforced** | Validate inputs using `zod` at the Skill boundary before executing any actions. |
| 3 | **Skills are dumb, stateless `@Injectable()` services** | Same input → same behavior. All "judgment" lives in the Orchestrator. |
| 4 | **Idempotency by construction** | Every mutating call carries an `idempotencyKey` checked against the database. |
| 5 | **Fail structured, never throw to the LLM** | Skills return `{success: false, error: {...}}`, not exceptions. |
| 6 | **Human-in-the-loop for destructive actions** | Deletions and cancellations require explicit user confirmation. |
| 7 | **Composability via Dependency Injection** | Skills inject shared services (like `EmailService`), avoiding duplication. |
| 8 | **State lives in the Session Store** | Skills remain stateless; `SessionService` handles the conversation flow backed by a new Prisma `Session` model. |
| 9 | **Audit everything that mutates** | Log via `AuditLogService` into a new Prisma `AuditLog` table. |
| 10 | **Async-first for slow providers** | Avoid blocking the HTTP response on the Slack webhook. |

---

## 2. Layered Architecture (NestJS)

```text
                              User (Slack DM)
                                    │
                        ┌───────────▼────────────┐
                        │ SlackEventsController  │  (existing, now splits DM vs group)
                        └─────┬─────────────┬─────┘
                              │             │
                     (DM: dedicated)   (group/channel: unchanged)
                              │             │
                     ┌────────▼───────┐     ▼
                     │ SessionService │   WebhookService (Eyes Pipeline)
                     │ (Prisma Store) │
                     └────────┬───────┘
                              │
                     ┌────────▼────────┐
                     │OrchestratorService│ (via AiGatewayService + tool loop)
                     └────────┬────────┘
                              │  Command objects
                     ┌────────▼────────┐
                     │ SkillRegistry   │
                     └───┬───┬───┬───┬──┘
                         │   │   │   │
                 Knowledge Messaging Meeting Task  Notification Email
                         │   │   │   │
                     ┌───▼───▼───▼───▼──┐
                     │ Existing Services │ (MessagesService, EmailService)
                     └───┬───┬───┬───┬──┘
                       Slack Zoom Jira GitHub
```

---

## 3. Core Contracts

These are the shared types every Skill implements against. Put these in `server/src/hands/core/`.

```typescript
// server/src/hands/core/types.ts

export interface SkillContext {
  organizationId: string;
  actorUserId: string;     // who triggered this
  connectionId: string;    // specific provider connection used
  sessionId: string;
  idempotencyKey: string;
  traceId: string;
}

export interface SkillError {
  code: string;             // e.g. "PROVIDER_TIMEOUT", "NOT_FOUND"
  message: string;
  retryable: boolean;
}

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SkillError;
  meta: {
    skill: string;
    provider: string;
    durationMs: number;
    idempotencyKey: string;
  };
}
```

Every input type is a Zod schema to validate at runtime before triggering existing services.

---

## 4. Skill → Adapter, Concretely (Messaging Skill)

The Skill acts as a thin, resilient wrapper around our existing globally available services.

```typescript
// server/src/hands/skills/messaging.skill.ts
import { Injectable } from '@nestjs/common';
import { MessagesService } from '../../integrations/messages/messages.service';
import { SendMessageInputSchema, SendMessageInput } from './schemas';
import { withResilience } from '../core/resilience';

@Injectable()
export class MessagingSkill {
  constructor(private readonly messagesService: MessagesService) {}

  async sendMessage(ctx: SkillContext, input: SendMessageInput): Promise<SkillResult<any>> {
    const parsed = SendMessageInputSchema.safeParse(input);
    if (!parsed.success) return validationError("MessagingSkill", parsed.error);

    return withResilience(ctx, "MessagingSkill", "slack", () =>
      this.messagesService.send(ctx.connectionId, {
        targetId: parsed.data.channelId,
        text: parsed.data.text
      })
    );
  }
}
```

The `withResilience()` wrapper is where retry, circuit-breaking, and audit logging live.

---

## 5. Ingress: Separating DMs from Groups

Modify our existing `SlackEventsController` (`server/src/integrations/slack/slack-events.controller.ts`):

```typescript
// Case 2: event_callback (all real events)
const event = body.event;
if (event && event.type === 'message' && event.channel_type === 'im' && !event.bot_id) {
  // Dedicated 1:1 with AIAN — this is a Hands conversation turn
  this.orchestratorService.handleDM({
    teamId: body.team_id,
    userId: event.user,
    channelId: event.channel,
    text: event.text,
    threadTs: event.thread_ts ?? event.ts,
  });
  return { received: true };
}

// Group/channel chatter — unchanged, feeds the Eyes pipeline
await this.webhookService.processWebhook(connection.id, req);
```

---

## 6. Conversation Session & Database Layer

One session per (org, user) DM thread, persisted in PostgreSQL via Prisma to avoid introducing a Redis dependency for local development.

### Schema Additions
We will add two new models to `schema.prisma`:
1. **`HandsSession`**: Tracks the state (`idle`, `collecting_info`, `confirming`, `executing`) and the `pendingAction` JSON payload.
2. **`AuditLog`**: Tracks every skill invocation (`skill`, `method`, `input`, `success`, `error`, `idempotencyKey`) for traceability and idempotency checks.

```typescript
// server/src/hands/orchestrator/session.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type SessionState = "idle" | "collecting_info" | "confirming" | "executing";

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateSession(orgId: string, userId: string) { ... }
  async updateSessionState(sessionId: string, state: SessionState, pendingAction?: any) { ... }
}
```

---

## 7. Mapping our four existing services

| Existing service | Becomes |
|---|---|
| `EmailService` | Injected into `EmailSkill` |
| `MessagesService` | Injected into `MessagingSkill` |
| `SlackEventsController` | Ingress Router — branches on `channel_type === 'im'` |
| `RetrievalService` | Injected into `KnowledgeSkill` (exposed as a tool to Orchestrator) |

None of these need a rewrite. Each gets a thin Skill wrapper so the Orchestrator can call it with generic `Command` objects.

---

## 8. AI Gateway Integration

To avoid calling external AI APIs directly, the `OrchestratorService` will utilize the existing `AiGatewayService` (`server/src/ai/ai-gateway.service.ts`). 

Since `AiProvider` currently only exposes `generateText` and `generateStructuredOutput`, we will expand the `AiProvider` interface to support multi-turn chat loops and tool-calling schemas (e.g., `generateToolCalls()`). The Orchestrator will inject `AiGatewayService` to handle all LLM interactions, ensuring central telemetry and prompt safety.

---

## 9. Folder Structure (New Hands Module)

```text
server/src/
  hands/
    hands.module.ts                   # Main module importing skills/orchestrator
    core/
      types.ts
      resilience.ts
      registry.ts
    skills/
      knowledge.skill.ts
      messaging.skill.ts
      meeting.skill.ts
      task.skill.ts
      notification.skill.ts
      email.skill.ts
      schemas/                        # Zod schemas for all skills
    orchestrator/
      orchestrator.service.ts
      session.service.ts
      system-prompt.ts
    audit/
      audit-log.service.ts
```

---

## 10. 10-Day Roadmap

| Day | Work |
|---|---|
| 1–2 | `src/hands/core`: types, resilience wrappers, Zod schemas, `HandsModule` setup |
| 3 | Wrap existing services: `MessagingSkill`, `EmailSkill` |
| 4 | `MeetingSkill` (new Zoom actions) |
| 5 | `TaskSkill` (new Jira actions) |
| 6 | `NotificationSkill` (composes Messaging + Email) |
| 7 | Ingress router: Modify `SlackEventsController` to split DM vs group, create `SessionService` (Prisma) |
| 8 | `OrchestratorService`, extend `AiProvider` with tool schemas/chat interface, system prompt, `collecting_info` state |
| 9 | Confirmation flow for destructive actions, idempotency, audit logging |
| 10 | End-to-end testing, error-path polish, demo run-through |
