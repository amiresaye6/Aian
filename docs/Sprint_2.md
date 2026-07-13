# AIAN Sprint 2 — Provider Connections, Collection, Normalization, and Ingestion

## Sprint Goal

By the end of Sprint 2, an organization owner can connect the four V1 providers, choose which resources Aian should monitor, collect provider activity through webhooks or polling, convert the collected data into a unified `KnowledgeItem` shape, store it safely in temporary ingestion storage, and trigger a batch handoff to the future Knowledge Processor.

Sprint 2 starts after Sprint 1 has delivered authentication, organizations, members, roles, permissions, provider selection, Eye pages, and the owner dashboard.

Sprint 2 ends before actual Knowledge Processor logic such as cleaning, classification, chunking, embeddings, vector storage, or RAG.

```text
Provider Connection
→ Connection Verification
→ Resource Selection
→ Event Collection
→ Provider Adapter
→ Unified Knowledge Item
→ Temporary Ingestion Storage
→ Batch Trigger
→ Knowledge Processor Handoff Contract
```

---

# 1. Team Ownership

| Developer  | Main Ownership                                                                               |
| ---------- | -------------------------------------------------------------------------------------------- |
| Amir       | Shared foundation, Slack Eye, scheduler, batches, ingestion infrastructure, global contracts |
| Hager      | GitHub Eye: authentication/installation, repository configuration, collection                |
| Donia      | GitHub Eye: adapter, normalization, frontend, GitHub testing and integration support         |
| Elazzazy   | Zoom Meeting Eye                                                                             |
| Amir Maula | Jira Task Eye                                                                                |
---

# 2. V1 Eyes and Providers

| Eye         | V1 Provider | Main Data Collected                                                                                                        | Explicitly Excluded in V1                                 |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Chat Eye    | Slack       | Selected public-channel messages, thread replies, author metadata, channel metadata                                        | Direct messages, private channels, attachments, reactions |
| Meeting Eye | Zoom        | Meeting metadata, participants, transcript text, recording link                                                            | Permanent storage of video files                          |
| Task Eye    | Jira Cloud  | Selected projects, issues, descriptions, comments, statuses, assignees, reporters, labels, sprints                         | Attachments and worklogs                                  |
| Coding Eye  | GitHub      | Selected repositories, PRs, PR descriptions, review comments, discussion comments, related commits, issues, issue comments | Source code, raw code diffs, file content                 |

---

# 3. Shared Foundation — Amir Must Complete Before Sprint 2 Starts

The goal is that every provider developer receives a stable contract and only needs to implement their provider details.

## 3.1 Create Shared Provider Contracts

Create these shared TypeScript contracts inside the backend.

```text
server/src/integrations/contracts/
├── provider.enum.ts
├── eye-type.enum.ts
├── provider-connection.interface.ts
├── provider-resource.interface.ts
├── provider-cursor.interface.ts
├── provider-adapter.interface.ts
├── collection-strategy.interface.ts
├── provider-client.interface.ts
├── collection-result.interface.ts
└── knowledge-item.interface.ts
```

Required enums:

```ts
enum EyeType {
  CHAT = 'CHAT',
  MEETING = 'MEETING',
  TASK = 'TASK',
  CODING = 'CODING',
}

enum Provider {
  SLACK = 'SLACK',
  ZOOM = 'ZOOM',
  JIRA = 'JIRA',
  GITHUB = 'GITHUB',
}
```

Required adapter contract:

```ts
interface ProviderAdapter {
  normalizeEvent(input: ProviderEventInput): KnowledgeItem[];
  getIdempotencyKey(item: KnowledgeItem): string;
  getExternalResourceId(input: ProviderEventInput): string;
  getExternalEventId(input: ProviderEventInput): string | null;
}
```

Required collection contract:

```ts
interface CollectionStrategy {
  collect(
    connection: ProviderConnection,
    cursor?: ProviderCursor,
  ): Promise<CollectionResult>;
}
```

Required provider client contract:

```ts
interface ProviderClient {
  verifyConnection(connection: ProviderConnection): Promise<ConnectionVerificationResult>;
  getResources(connection: ProviderConnection): Promise<ProviderResource[]>;
  refreshCredentials?(connection: ProviderConnection): Promise<RefreshedCredentials>;
}
```

## 3.2 Define the Unified Knowledge Item

All providers must output this shape.

```ts
type KnowledgeItem = {
  id: string;
  organizationId: string;

  eyeType: EyeType;
  provider: Provider;

  sourceType: string;
  eventType: string;

  externalResourceId: string;
  externalEventId: string | null;
  parentExternalResourceId: string | null;

  title: string | null;
  content: string;

  author: {
    externalId?: string;
    name?: string;
    email?: string;
  } | null;

  participants: Array<{
    externalId?: string;
    name?: string;
    email?: string;
  }>;

  contextLocation: string | null;
  sourceUrl: string | null;

  occurredAt: Date;
  receivedAt: Date;

  visibility: 'ORGANIZATION' | 'RESTRICTED';
  metadata: Record<string, unknown>;

  rawPayloadReference: string;
  version: string | null;
};
```

No developer may change this shape alone. Any change must be agreed on by the team because every Eye and the future Knowledge Processor depend on it.

## 3.3 Create Prisma Models and Database Foundation

Amir creates the shared database tables and Prisma migrations before Sprint 2 starts.

Required tables:

```text
provider_connections
provider_resource_selections
provider_cursors
raw_provider_events
knowledge_items
ingestion_batches
ingestion_batch_items
organization_processing_settings
collection_runs
```

The provider developers should not create their own duplicate tables for Slack, GitHub, Zoom, or Jira events. Provider-specific details belong in `metadata` or raw payload storage unless a future need proves otherwise.

## 3.4 Create Shared Repositories

Create repositories that all Eyes will use.

```text
server/src/ingestion/repositories/
├── provider-connection.repository.ts
├── provider-resource-selection.repository.ts
├── provider-cursor.repository.ts
├── raw-provider-event.repository.ts
├── knowledge-item.repository.ts
├── ingestion-batch.repository.ts
├── processing-settings.repository.ts
└── collection-run.repository.ts
```

Each provider developer should use these repositories instead of writing direct Prisma queries throughout their provider module.

## 3.5 Create Global Provider Client Factory

Create the factory that returns the correct provider client.

```ts
providerClientFactory.create(Provider.SLACK);
providerClientFactory.create(Provider.ZOOM);
providerClientFactory.create(Provider.JIRA);
providerClientFactory.create(Provider.GITHUB);
```

The factory should expose a common entry point while each provider owns its own client implementation.

## 3.6 Create Shared Webhook Framework

Amir creates the shared webhook framework before the sprint begins.

Required responsibilities:

```text
Receive webhook request
→ identify provider
→ validate provider signature
→ save raw payload
→ queue or invoke provider-specific normalization
→ return provider-required response quickly
```

Required folder shape:

```text
server/src/collection/webhooks/
├── webhook.controller.ts
├── webhook.service.ts
├── webhook-signature-validator.interface.ts
├── webhook-signature-validator.factory.ts
└── webhook-event-dispatcher.service.ts
```

Provider developers only implement their provider-specific signature validator and event handler.

## 3.7 Create Shared Collection Base Flow

Create a base collector flow so all providers follow the same lifecycle.

```text
Validate connection
→ fetch event/resource data
→ save raw provider event
→ normalize with adapter
→ generate idempotency key
→ prevent duplicate storage
→ save Knowledge Item
→ update cursor
→ save collection run result
```

Each provider developer implements only the provider-specific fetch logic.

## 3.8 Create Shared Error and Logging Rules

All provider modules must use the same error format and collection logging rules.

Required provider errors:

```text
PROVIDER_CONNECTION_FAILED
PROVIDER_TOKEN_EXPIRED
PROVIDER_PERMISSION_DENIED
PROVIDER_RATE_LIMITED
PROVIDER_WEBHOOK_INVALID
PROVIDER_RESOURCE_NOT_FOUND
PROVIDER_COLLECTION_FAILED
PROVIDER_NORMALIZATION_FAILED
```

Every collection attempt must create a `collection_runs` record containing:

```text
organizationId
eyeType
provider
collectionMethod
startedAt
finishedAt
status
itemsFetched
itemsStored
itemsIgnored
errorCode
errorMessage
```

## 3.9 Create Scheduler and Batch Foundation

Amir owns the organization-level scheduler and ingestion batch system.

The scheduler must support:

```text
Time trigger
Threshold trigger
Manual Sync Now trigger
Batch locking
Processor handoff placeholder
Retry state
Acknowledgment state
```

The automatic rule:

```text
Create a batch when:
time interval is reached
OR
pending Knowledge Item threshold is reached.
```

Manual sync bypasses both rules.

## 3.10 Create Processor Handoff Contract

Create the placeholder interface that Sprint 3 will replace with the real Knowledge Processor.

```ts
interface KnowledgeProcessorGateway {
  handoffBatch(batchId: string): Promise<ProcessorHandoffResult>;
}
```

For Sprint 2, it can log the batch, send it to a placeholder queue, or mark it as handed off in a mock implementation.

The provider developers must not call the processor directly.

They only store `KnowledgeItem` records. The scheduler decides when they move into a batch.

<!-- ## 3.11 Create Shared Frontend Components

Amir prepares reusable frontend components so each provider page has the same visual behavior.

```text
client/src/components/integrations/
├── EyeStatusCard.tsx
├── ProviderConnectionStatus.tsx
├── ConnectProviderButton.tsx
├── ProviderResourceSelector.tsx
├── ConnectionHealthBadge.tsx
├── LastCollectionInfo.tsx
├── CollectionErrorPanel.tsx
├── PendingKnowledgeItemCounter.tsx
└── ManualSyncButton.tsx
```

Each provider developer uses these components and supplies provider-specific content.

--- -->

# 4. Amir — Slack Eye, Shared Infrastructure, Scheduler, and Batches

## 4.1 Slack Eye Responsibilities

Amir owns the full Slack Eye.

### Backend Tasks

* Create Slack OAuth flow.
* Create Slack callback handler.
* Encrypt and store Slack access and refresh credentials if provided.
* Implement Slack connection verification.
* Fetch accessible Slack channels.
* Save selected monitored channels.
* Implement Slack event handling where supported.
* Implement Slack polling fallback using cursor-based collection.
* Implement Slack adapter.
* Normalize Slack messages and thread replies into `KnowledgeItem`.
* Add Slack idempotency rules.
* Update Slack collection cursor.
* Handle Slack rate limits and token errors.
* Add Slack Eye health reporting.

### Slack Data Scope

```text
Selected public channels
Channel messages
Thread replies
Channel metadata
Basic author metadata
```

### Slack Data Excluded in V1

```text
Direct messages
Private channels
Attachments
Emoji reactions
Files
```

### Slack Adapter Source Types

```text
slack_message
slack_thread_reply
```

### Slack Frontend Tasks

* Slack Eye overview page.
* Connect Slack button.
* Slack connection status.
* Channel selection interface.
* Selected channel list.
* Last collection time.
* Pending item count.
* Manual collect button.
* Connection errors and reconnect action.

## 4.2 Shared Infrastructure Responsibilities

Amir must complete all shared foundation tasks from Section 3 before provider work starts.

Amir also owns:

```text
Provider contracts
Prisma migration and shared tables
Repositories
Webhook framework
Collection base flow
Global provider errors
Collection run logging
Scheduler
Batch system
Processor handoff placeholder
Shared integration UI components
```

## 4.3 Scheduler Responsibilities

* Create `organization_processing_settings`.
* Add time interval configuration.
* Add pending Knowledge Item threshold configuration.
* Add retention period configuration.
* Build scheduled job that checks organization trigger conditions.
* Build `Sync Now` endpoint.
* Create ingestion batches.
* Lock eligible pending Knowledge Items.
* Prevent the same item from entering two batches.
* Trigger processor handoff placeholder.
* Record batch status.
* Retry failed handoffs.
* Unlock items safely when a batch fails.
* Add cleanup job for acknowledged temporary data.

---

# 5. Hager — GitHub Connection and Collection

Hager owns GitHub authentication, installation, provider connection, repository selection, webhook collection, and reconciliation polling.

## 5.1 Backend Tasks

* Create GitHub App configuration.
* Implement GitHub App installation flow.
* Save encrypted installation information.
* Implement GitHub installation verification.
* Fetch repositories available to the installation.
* Save selected monitored repositories.
* Implement GitHub webhook signature validation.
* Implement GitHub webhook handlers.
* Implement reconciliation polling for selected repositories.
* Store GitHub raw webhook payloads.
* Store GitHub polling payloads.
* Update GitHub collection cursor.
* Handle GitHub rate limits.
* Handle revoked installation and permission errors.
* Expose GitHub connection health information.

## 5.2 GitHub Collection Scope

```text
Repository metadata
Pull requests
Pull request descriptions
Pull request review comments
Pull request discussion comments
Issues
Issue comments
Commit metadata
Commit messages
```

## 5.3 GitHub Exclusions

```text
Source code
Raw file contents
Raw code diffs
Repository cloning
Secrets
Actions logs
```

## 5.4 GitHub Collection Rules

```text
Webhook first
→ collect supported events immediately

Reconciliation polling
→ periodically fetch updated PRs, issues, and commits
→ recover missed webhook events
→ rely on idempotency to prevent duplicates
```

## 5.5 GitHub Frontend Tasks

* GitHub Eye connection page.
* GitHub App installation button.
* Installation verification status.
* Repository selection page.
* Repository search/filter.
* Selected repository summary.
* Connection health status.
* Reconnect or reinstall action.
* Last collection information.

## 5.6 Hager Deliverables

```text
GitHub App can be installed.
Aian can verify the installation.
Owner can select repositories.
GitHub webhooks are received and validated.
Polling fallback works.
Raw GitHub events are saved.
GitHub events are available for Donia’s adapter layer.
```

---

# 6. Donia — GitHub Adapter, Normalization, GitHub UI Completion, and Testing

Donia owns the GitHub conversion layer from raw GitHub events into unified Aian Knowledge Items.

## 6.1 Backend Tasks

* Create `GitHubAdapter`.
* Implement normalization for pull request events.
* Implement normalization for PR review comments.
* Implement normalization for PR discussion comments.
* Implement normalization for issue events.
* Implement normalization for issue comments.
* Implement normalization for commit metadata and commit messages.
* Generate GitHub idempotency keys.
* Define GitHub external resource IDs.
* Define GitHub external event IDs.
* Link related GitHub events to parent resources.
* Save normalized items using shared repositories.
* Add validation for malformed GitHub payloads.
* Add unit tests for each supported GitHub event type.
* Add integration tests with Hager’s webhook and polling output.

## 6.2 GitHub Adapter Source Types

```text
github_pull_request
github_pull_request_comment
github_pull_request_review
github_issue
github_issue_comment
github_commit
```

## 6.3 Example GitHub Resource Relationships

```text
Repository
→ Pull Request
→ Pull Request Review
→ Pull Request Comment
```

```text
Repository
→ Issue
→ Issue Comment
```

All related events should share a meaningful `parentExternalResourceId` when applicable.

## 6.4 Frontend Tasks

* Complete GitHub Eye overview UI.
* Show GitHub collection statistics.
* Show pending Knowledge Item count.
* Show recent collection activity.
* Show GitHub-specific errors.
* Add manual collection trigger UI using shared components.
* Ensure GitHub pages use the common Eye UI structure.

## 6.5 Donia Deliverables

```text
Every supported GitHub event becomes a valid KnowledgeItem.
Duplicate GitHub webhook deliveries do not create duplicate items.
Related PR and issue activity remains linked.
GitHub normalization is covered by tests.
GitHub Eye UI displays real backend state.
```

---

# 7. Elazzazy — Zoom Meeting Eye

Elazzazy owns the Zoom connection, meeting collection, transcript collection, recording-link handling, and Zoom normalization.

## 7.1 Backend Tasks

* Create Zoom OAuth flow.
* Create Zoom callback handler.
* Encrypt and store Zoom credentials.
* Implement Zoom connection verification.
* Fetch available Zoom account and meeting scope.
* Save Zoom collection configuration.
* Implement Zoom webhook support where available.
* Implement polling for meeting, recording, and transcript availability.
* Store Zoom raw events.
* Create `ZoomAdapter`.
* Normalize meeting metadata.
* Normalize participant information where available.
* Normalize transcript text.
* Save recording link only.
* Handle transcript-not-ready state.
* Handle transcript-unavailable state.
* Update Zoom cursor.
* Handle token refresh.
* Handle Zoom rate limits and permission failures.
* Expose Zoom Eye health.

## 7.2 Zoom Transcript Rules

```text
Transcript available
→ collect transcript text
→ create KnowledgeItem

No transcript but recording exists
→ save recording link
→ mark transcript as pending or unavailable
→ create future transcription job placeholder

No transcript and no recording
→ store meeting metadata only
→ mark transcript unavailable
```

## 7.3 Aian Meeting Assistant Preparation

Elazzazy does not need to build the full Meeting Assistant in Sprint 2.

However, Zoom implementation must support this future architecture:

```text
Zoom Transcript Collector
Zoom Recording Transcription Collector
Aian Meeting Assistant Collector
        ↓
Zoom / Meeting Adapter
        ↓
KnowledgeItem
```

Required preparation:

```text
Meeting collection source field
Transcript status field
Recording link field
Meeting assistant placeholder interface
Failure status for unavailable transcript
```

## 7.4 Zoom Source Types

```text
zoom_meeting
zoom_transcript
zoom_recording_reference
```

## 7.5 Zoom Frontend Tasks

* Zoom Eye overview page.
* Connect Zoom button.
* Zoom connection status.
* Meeting collection settings.
* Transcript status display.
* Recording-link availability display.
* Last collection time.
* Eye health and error states.
* Reconnect action.

## 7.6 Elazzazy Deliverables

```text
Owner can connect Zoom.
Aian verifies Zoom access.
Aian collects meeting metadata.
Aian collects transcripts when available.
Aian stores recording links without storing video files.
Zoom data becomes valid KnowledgeItems.
Zoom connection and collection health are visible.
```

---

# 8. Amir Maula — Jira Task Eye

Amir Maula owns the Jira connection, project selection, webhook/polling collection, and Jira normalization.

## 8.1 Backend Tasks

* Create Atlassian OAuth flow.
* Create Jira callback handler.
* Encrypt and store Jira credentials.
* Implement Jira connection verification.
* Fetch accessible Jira sites.
* Allow owner to select a Jira site.
* Fetch available Jira projects.
* Save selected monitored projects.
* Implement Jira webhook support where available.
* Implement cursor-based polling fallback.
* Store Jira raw events.
* Create `JiraAdapter`.
* Normalize issue data.
* Normalize issue comments.
* Normalize status changes.
* Normalize assignee/reporter changes where useful.
* Normalize sprint and label metadata.
* Generate Jira idempotency keys.
* Update Jira cursor.
* Handle token refresh.
* Handle Jira permission and rate-limit errors.
* Expose Jira Eye health.

## 8.2 Jira Collection Scope

```text
Selected projects
Issues
Issue descriptions
Issue comments
Issue statuses
Assignees
Reporters
Labels
Sprint metadata
Updated timestamps
```

## 8.3 Jira Exclusions

```text
Attachments
Worklogs
Full audit history
Advanced automation data
```

## 8.4 Jira Source Types

```text
jira_issue
jira_issue_comment
jira_issue_status_change
```

## 8.5 Jira Frontend Tasks

* Jira Eye overview page.
* Connect Jira button.
* Jira site selection page.
* Project selection page.
* Selected project summary.
* Last collection information.
* Pending item count.
* Connection health.
* Error and reconnect actions.

## 8.6 Amir Maula Deliverables

```text
Owner can connect Jira.
Owner can choose a Jira site and monitored projects.
Aian collects selected-project activity.
Jira events become valid KnowledgeItems.
Polling fallback works.
Jira connection health is visible.
```

---

# 9. Shared Data Rules for Every Developer

Every provider developer must follow these rules.

## 9.1 Do Not Store Provider Data Directly as Final Knowledge

Provider payloads must follow this path:

```text
Provider payload
→ raw_provider_events
→ provider adapter
→ knowledge_items
→ ingestion batch
→ future Knowledge Processor
```

## 9.2 Do Not Call the Knowledge Processor Directly

Only the scheduler and ingestion batch system may hand data to the processor.

```text
Provider developer responsibility:
Collect and normalize.

Amir scheduler responsibility:
Batch and hand off.
```

## 9.3 Do Not Create Provider-Specific Temporary Tables

Use the shared tables.

Provider-specific fields should go into:

```text
metadata
raw provider payload
provider resource configuration
```

## 9.4 Every Event Must Be Idempotent

The same provider event received twice must not create duplicate Knowledge Items.

## 9.5 Every Provider Must Support Health Information

Each Eye must expose:

```text
Connection status
Last successful collection
Last attempted collection
Pending Knowledge Item count
Latest error
Needs reauthorization state
```

---

# 10. Scheduler and Batch System

## 10.1 Trigger Types

The organization owner configures:

```text
Time trigger:
Every 1, 3, 4, 6, 12, or 24 hours.

Threshold trigger:
Process when pending Knowledge Items reach a configured count.

Manual trigger:
Owner clicks Sync Now.
```

## 10.2 Trigger Rule

```text
Create an ingestion batch when:
time interval is reached
OR
pending item threshold is reached.

Manual Sync Now bypasses both conditions.
```

## 10.3 Batch Lifecycle

```text
PENDING
→ LOCKED
→ HANDED_OFF
→ ACKNOWLEDGED
```

Failure path:

```text
LOCKED
→ FAILED
→ retry
or
→ unlock safely
```

## 10.4 Retention Rules

```text
Pending items:
Never delete automatically.

Locked items:
Never delete until batch resolution.

Acknowledged items:
Delete after configured retention period.

Failed items:
Keep until retry, resolution, or manual deletion.
```

Default retention is 15 days.

---

# 11. Required API Endpoints

## Shared Connection Endpoints

```text
GET    /organizations/:organizationId/eyes
GET    /organizations/:organizationId/eyes/:eyeType
POST   /organizations/:organizationId/eyes/:eyeType/connect
POST   /organizations/:organizationId/eyes/:eyeType/verify
POST   /organizations/:organizationId/eyes/:eyeType/disconnect
POST   /organizations/:organizationId/eyes/:eyeType/reconnect
```

## Provider Callback Endpoints

```text
GET    /integrations/slack/callback
GET    /integrations/zoom/callback
GET    /integrations/jira/callback
GET    /integrations/github/callback
```

## Resource Selection Endpoints

```text
GET    /organizations/:organizationId/eyes/:eyeType/resources
PUT    /organizations/:organizationId/eyes/:eyeType/resources
```

## Webhook Endpoints

```text
POST   /webhooks/slack
POST   /webhooks/zoom
POST   /webhooks/jira
POST   /webhooks/github
```

## Collection and Health Endpoints

```text
GET    /organizations/:organizationId/eyes/:eyeType/health
GET    /organizations/:organizationId/eyes/:eyeType/collection-history
POST   /organizations/:organizationId/eyes/:eyeType/collect-now
```

## Scheduler and Batch Endpoints

```text
GET    /organizations/:organizationId/processing-settings
PUT    /organizations/:organizationId/processing-settings
POST   /organizations/:organizationId/ingestion/sync-now
GET    /organizations/:organizationId/ingestion/batches
GET    /organizations/:organizationId/ingestion/items
```

---

# 12. Sprint Completion Criteria

Sprint 2 is complete when:

```text
1. Amir has delivered the shared contracts, database tables, repositories,
   webhook framework, scheduler, batch system, and processor handoff placeholder.

2. Slack, Zoom, Jira, and GitHub can be connected.

3. Every connection is verified after authorization or installation.

4. Owners can select monitored channels, repositories, projects, and meeting scope.

5. Each provider uses webhooks when suitable and polling when needed.

6. Every supported provider event is saved as a raw event and normalized KnowledgeItem.

7. Duplicate events do not create duplicate KnowledgeItems.

8. Each Eye exposes connection health and collection health.

9. The organization owner can configure processing time interval,
   Knowledge Item threshold, and retention period.

10. The owner can click Sync Now.

11. The scheduler creates batches safely.

12. Batches lock items safely and hand them to the future processor contract.

13. All provider work uses the same shared contracts and repositories.

14. No source code is collected from GitHub.

15. No meeting video is stored permanently.

16. No AI processing, embedding, vector storage, or RAG is required in Sprint 2.
```
