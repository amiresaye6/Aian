# Skill Development Guide

The Aian orchestrator operates using **Skills**—atomic, isolated actions that allow the AI agent to interact with internal services or external providers. 

This guide outlines the absolute pipeline and standard operating procedure for developers to add new skills to the `hands` orchestrator module.

## 1. Directory Structure
All skills and related schemas live in `server/src/hands/skills/`.
```
server/src/hands/
├── core/
│   ├── registry.service.ts
│   ├── resilience.service.ts
│   └── types.ts
└── skills/
    ├── schemas.ts         <-- Define input types here
    ├── email.skill.ts     <-- Example skill
    └── messaging.skill.ts <-- Example skill
```

## 2. Defining the Input Schema
Every skill must have a strictly typed input schema using `zod`. This is critical because the AI orchestrator uses these schemas and descriptions to know what arguments to supply.

Open `server/src/hands/skills/schemas.ts` and add your schema:

```typescript
import { z } from 'zod';

export const MyNewSkillInputSchema = z.object({
  targetId: z.string().describe('The ID of the target resource.'),
  actionPayload: z.string().describe('Detailed description of the payload required by the AI.'),
});

// Always export the inferred type for strict typing in the handler
export type MyNewSkillInput = z.infer<typeof MyNewSkillInputSchema>;
```
> **Tip:** Write highly descriptive `.describe()` blocks. The orchestrator LLM directly reads these to structure its tool calls.

## 3. Creating the Skill Class
Create a new file for your skill (e.g., `my-new.skill.ts`) in the `skills` directory. 

A skill must:
1. Implement `OnModuleInit`
2. Inject the `SkillRegistryService` and `ResilienceService`
3. Inject the target internal service doing the actual work
4. Call `this.registry.register()` in `onModuleInit`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResilienceService } from '../core/resilience.service';
import { SkillRegistryService } from '../core/registry.service';
import { SkillContext, SkillResult } from '../core/types';
import { MyNewSkillInputSchema } from './schemas';
import { MyTargetService } from '../../path-to/my-target.service';

@Injectable()
export class MyNewSkill implements OnModuleInit {
  constructor(
    private readonly targetService: MyTargetService,
    private readonly resilienceService: ResilienceService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit() {
    this.registry.register({
      name: 'MyNewSkill.performAction',
      description: 'A detailed prompt describing exactly what this skill does and when the agent should use it.',
      schema: MyNewSkillInputSchema,
      destructive: false, // Set to true if it deletes/mutates data dangerously
      handler: (ctx: SkillContext, input: any) => this.performAction(ctx, input),
    });
  }

  async performAction(ctx: SkillContext, input: any): Promise<SkillResult<any>> {
    // 1. Validate Input
    const parsed = MyNewSkillInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.message,
          retryable: false,
        },
        meta: {
          skill: 'MyNewSkill',
          provider: 'unknown',
          durationMs: 0,
          idempotencyKey: ctx.idempotencyKey,
        },
      };
    }

    // 2. Execute via ResilienceService (handles retries, circuit breaking, etc.)
    return this.resilienceService.execute(
      ctx,
      'MyNewSkill',
      'performAction',
      'your-provider-name', // e.g. 'github', 'jira', 'email'
      parsed.data,
      async () => {
        // 3. Delegate to your actual service
        const result = await this.targetService.doSomething(
          ctx.organizationId,
          parsed.data.targetId,
          parsed.data.actionPayload
        );
        return result; // The ResilienceService automatically wraps this in a success result
      },
    );
  }
}
```

### Context Breakdown (`SkillContext`)
The orchestrator automatically passes a `SkillContext` object containing:
- `organizationId`: The org executing the session.
- `actorUserId`: The user initiating the workflow.
- `connectionId`: Useful if connecting to an external integration (Slack, Jira).
- `sessionId`: Orchestrator session ID.
- `idempotencyKey` & `traceId`: For logging and resilience.

## 4. Registering the Skill
Your skill will not be discovered until you register it as a Provider in the `HandsModule`.

Open `server/src/hands/hands.module.ts`:
```typescript
import { MyNewSkill } from './skills/my-new.skill';

@Module({
  imports: [/* ... */],
  providers: [
    // ... existing providers
    MyNewSkill, // <-- Register your skill here
  ],
  exports: [OrchestratorService],
})
export class HandsModule {}
```

## 5. Standard Practices & Rules
- **No Direct Business Logic:** A Skill should act exclusively as an adapter. It maps AI inputs into structured data and delegates the execution to existing domain services.
- **Fail Gracefully:** Never throw raw exceptions inside the handler. Return them properly using the `SkillResult` schema so the AI Orchestrator can read the error and attempt to fix it dynamically.
- **Resilience:** Always wrap execution in `this.resilienceService.execute(...)`. This hooks into the global auditing logs, tracing, and retry mechanisms.
