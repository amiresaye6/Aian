# Sprint 2 Ingestion Pipeline: Provider Developer Guide

Welcome to the **Aian Global Ingestion Pipeline** documentation. 

This guide is a comprehensive reference manual for developers and AI assistants building Provider Integrations (e.g., **Slack, Zoom, Jira, GitHub**). The ingestion pipeline provides generic infrastructure for database storage, webhooks, and AI batching, allowing you to focus entirely on the provider's specific API logic.

---

## 1. Provider Module Architecture

When building a new provider (e.g., Jira), you will create a standalone NestJS module (`JiraModule`). Your module must implement specific interfaces (Contracts) and register them with the Global Pipeline.

A complete provider module contains:
1. **OAuth Controller**: Handles redirects and token generation.
2. **Provider Client**: Handles API calls (health checks, fetching resources).
3. **Provider Adapter**: Normalizes raw provider payloads into standardized `KnowledgeItem`s.
4. **Webhook Validator**: Verifies the authenticity of incoming provider webhooks.

---

## 2. Global Services to Use (Do NOT write your own Prisma queries for core models)

You must inject and use the shared global services. This ensures security and standardization across all integrations.

### `ProviderConnectionRepository`
Manages OAuth connections.
```typescript
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';

// Example: Creating a new connection after OAuth
const connection = await this.connectionRepo.create({
  organizationEyeId: 'eye-uuid-here',
  providerId: Provider.JIRA,
  status: 'connected',
  accessTokenEncrypted: 'encrypted-token-here',
  scopes: ['read:jira-work', 'read:jira-user'],
});
```

### `EncryptionService`
Used to encrypt tokens before saving them.
```typescript
import { EncryptionService } from '../../common/encryption.service';

const encrypted = this.encryptionService.encrypt(rawAccessToken);
const decrypted = this.encryptionService.decrypt(connection.accessTokenEncrypted);
```

---

## 3. Integration Roadmap (Step-by-Step with Examples)

When building a new provider, follow these exact steps:

### Step 1: Enums and Seeding
Ensure your provider is listed in `src/integrations/contracts/provider.enum.ts` (e.g., `Provider.JIRA`) and is seeded into the database in `prisma/seed.ts`.

---

### Step 2: The OAuth Flow Controller
The pipeline provides a generic webhook endpoint, but **OAuth is provider-specific**. Create `<provider>-auth.controller.ts`.

**Example: Jira Auth Controller**
```typescript
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../common/encryption.service';
import { Provider } from '../contracts';

@Controller('integrations/jira')
export class JiraAuthController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Get('install')
  install(@Query('organizationEyeId') eyeId: string, @Res() res) {
    // 1. Construct Provider OAuth URL
    const url = `https://auth.atlassian.com/authorize?client_id=XYZ&scope=read:jira-work&state=${eyeId}`;
    return res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res) {
    // 2. Exchange code for access token via Jira API
    const accessToken = await exchangeCodeForToken(code); 
    
    // 3. Encrypt and save using global services
    await this.connectionRepo.create({
      organizationEyeId: state,
      providerId: Provider.JIRA,
      status: 'connected',
      accessTokenEncrypted: this.encryptionService.encrypt(accessToken),
      scopes: ['read:jira-work'],
    });

    return res.send('Successfully connected to Jira!');
  }
}
```

---

### Step 3: Implement Client & Adapter
Create `<provider>-client.service.ts` (implements `ProviderClient`) and `<provider>-adapter.service.ts` (implements `ProviderAdapter`).

**Example: GitHub Client (Fetching Resources & Health)**
```typescript
import { Injectable } from '@nestjs/common';
import { ProviderClient, ProviderConnection, ProviderResource } from '../contracts';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class GithubClientService implements ProviderClient {
  constructor(private readonly encryptionService: EncryptionService) {}

  async verifyConnection(connection: ProviderConnection) {
    // Decrypt token and call GitHub user API to verify health
    const token = this.encryptionService.decrypt(connection.accessTokenEncrypted);
    return { isValid: true, message: 'Connected' };
  }

  async getResources(connection: ProviderConnection): Promise<ProviderResource[]> {
    // Call GitHub API to list repositories the user can access
    return [
      {
        externalResourceId: 'repo_789',
        name: 'acme/frontend-app',
        resourceType: 'repository',
        metadata: { private: true },
      }
    ];
  }
}
```

**Example: Zoom Adapter (Normalizing Raw Data)**
```typescript
import { Injectable } from '@nestjs/common';
import { ProviderAdapter, ProviderEventInput, KnowledgeItem } from '../contracts';

@Injectable()
export class ZoomAdapterService implements ProviderAdapter {
  
  normalizeEvent(input: ProviderEventInput): KnowledgeItem[] {
    // You can now rely on providerEventType extracted safely by the validator
    if (input.providerEventType === 'meeting.transcript_completed') {
      const event = input.rawPayload as any;
      
      return [{
        id: undefined as any, // Generated by DB
        organizationId: input.organizationId,
        eyeType: 'meeting' as any,
        provider: 'zoom' as any,
        sourceType: 'meeting_transcript',
        eventType: 'transcript_completed',
        externalResourceId: event.payload.object.id,
        externalEventId: event.payload.object.uuid,
        content: "Transcript text downloaded via API...",
        occurredAt: new Date(event.event_ts),
        visibility: 'ORGANIZATION',
        rawPayloadReference: input.rawEventReference,
        metadata: { host_id: event.payload.object.host_id },
        version: null,
      } as KnowledgeItem];
    }
    return []; // Ignore unhandled events
  }

  getIdempotencyKey(item: KnowledgeItem): string {
    // Guarantees we never process the same transcript twice
    return `zoom:${item.organizationId}:${item.externalEventId}:transcript`;
  }

  // Extractors for logging/routing
  getExternalResourceId(input: ProviderEventInput) { return input.rawPayload?.payload?.object?.id || 'unknown'; }
  getExternalEventId(input: ProviderEventInput) { return input.rawPayload?.payload?.object?.uuid || null; }
}
```

---

### Step 4: Implement Webhook Validator
Create `<provider>-webhook.validator.ts`. The global pipeline exposes `POST /api/v1/webhooks/<CONNECTION_ID>`. You must validate the provider's signature and extract the event type.

**Example: Slack Webhook Validator**
```typescript
import { Injectable } from '@nestjs/common';
import { WebhookSignatureValidator } from '../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SlackWebhookValidator implements WebhookSignatureValidator {
  async validate(req: Request, rawBody: Buffer, secret: string): Promise<boolean> {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    
    // Calculate the HMAC using the connection's webhook secret
    const sigBasestring = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    const expected = 'v0=' + crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  getEventType(req: Request): string {
    // Extract the specific event type from the provider's payload or headers
    if (req.body?.event?.type) {
      return req.body.event.type;
    }
    return 'webhook';
  }
}
```

---

### Step 5: Module Registration
Create `<provider>.module.ts`. You must register your components dynamically in the factory during the `onModuleInit` lifecycle hook.

**Example: Slack Module Registration**
```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { SlackClientService } from './slack-client.service';
import { SlackAdapterService } from './slack-adapter.service';
import { SlackWebhookValidator } from './slack-webhook.validator';
import { SlackAuthController } from './slack-auth.controller';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { ProviderClientFactory } from '../provider-client.factory';
import { Provider } from '../contracts';

@Module({
  controllers: [SlackAuthController],
  providers: [SlackClientService, SlackAdapterService, SlackWebhookValidator],
})
export class SlackModule implements OnModuleInit {
  constructor(
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly slackClient: SlackClientService,
    private readonly slackAdapter: SlackAdapterService,
    private readonly slackValidator: SlackWebhookValidator,
  ) {}

  onModuleInit() {
    // Inject your specific instances into the global pipeline
    this.clientFactory.registerClient(Provider.SLACK, this.slackClient);
    this.clientFactory.registerAdapter(Provider.SLACK, this.slackAdapter);
    this.validatorFactory.registerValidator(Provider.SLACK, this.slackValidator);
  }
}
```
*Note: Don't forget to import your new module into `src/integrations/integrations.module.ts`!*
