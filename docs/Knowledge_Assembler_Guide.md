# Knowledge Assembler Integration Guide (Stage 1)

This guide is for developers building the **Knowledge Assembly** stage (Sprint 3 - Stage 1).
The goal of an assembler is to take an array of raw `KnowledgeItem` events from a specific provider and transform them into cohesive semantic `KnowledgeArtifacts` (e.g., combining 50 Slack messages into a single `Conversation` artifact).

## The `KnowledgeAssembler` Interface

Every provider must implement the following interface and register itself with the `AssemblerFactory` in its module.

```typescript
import { KnowledgeItem, KnowledgeArtifact } from "@prisma/client";

export interface KnowledgeAssembler {
  supports(provider: string): boolean;
  assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]>;
}
```

### Core Responsibilities of an Assembler:

1. **Grouping:** Group raw items by their parent resource (e.g., Slack Channel ID, Jira Ticket Key, GitHub PR ID).
2. **Sorting:** Sort items chronologically (`occurredAt`).
3. **Data Enrichment (CRITICAL):** Raw items often lack context. For example, Slack items only have `U12345` for a user ID. The Assembler **MUST** use the provider's Client API (e.g., `SlackClientService`) to fetch the real user's name and map it into the final text. The AI cannot understand `U12345`.
4. **Formatting:** Concatenate the text into a clean, human-readable script.
5. **Participant Extraction:** Aggregate all unique users who participated in the resource.

### Artifact Size Boundaries (Min / Max Limits)

Assemblers must enforce strict sizing boundaries to ensure the AI in Stage 2 does not crash from context overload, nor waste processing on tiny fragments:

- **Endless Streams (e.g., Slack):** Enforce a strict maximum limit (e.g., max 100 messages per artifact). If the batch contains 250 messages for a single channel, the assembler must slice them chronologically into 3 separate `conversation` artifacts (Part 1, Part 2, Part 3). Minimum limits are not strictly required, but tiny batches should ideally be deferred.
- **Entity-Bound Items (e.g., Jira, GitHub):** Naturally bounded by the entity (PR or Ticket). However, if an entity has hundreds of comments, chunk them (e.g., max 50 comments per artifact part).
- **Long Transcripts (e.g., Zoom):** If a transcript exceeds a safe token count (e.g., 10,000 words), split the `meeting_outcome` artifact into sequential parts.

### Title Generation Strategy

The `title` field is critical for GraphRAG Semantic Search. A good title is "Discussion on AIAN Arabic Support", not "Slack Channel C1234".

- **Code-Driven (Jira / GitHub):** The assembler can extract the exact title directly from the payload (e.g., `PR #1: Add Arabic Support`). Do this in Stage 1!
- **AI-Driven (Slack / Zoom):** The assembler cannot understand what a Slack thread is about. **DO NOT waste an API call to generate a title here.** In Stage 1, assign a placeholder (e.g., `Slack Channel C1234 (Processing...)`). In Stage 2, the Global AI Extractor will read the text and automatically update the `title` field while extracting nodes.

---

## 1. Slack Assembler (Chatting Eye)

**Artifact Type:** `conversation`
**Grouping Key:** `externalResourceId` (Channel ID) or `parentExternalResourceId` (Thread ID).

### Enrichment Requirement

Raw Slack items contain `author.externalId: "U0BGXU4AVSS"`.
You must use the `SlackClientService` (or a local cache) to map `"U0BGXU4AVSS"` to actual names (like `"Amir"`).

### Why Enrichment is Critical

If you do not enrich the data, your concatenated Slack conversation will look like this to the AI:

```text
[2026-07-13T15:34:10.262Z] U0BGXU4AVSS: Besm Allah Alrahman Alraheem
[2026-07-13T15:35:45.087Z] U0BH3MGJ0Q4: :wave: Hi everyone!
[2026-07-13T15:36:00.764Z] U0BGXU4AVSS: nice to meet u too, amir.
[2026-07-13T15:43:45.002Z] U0BGXU4AVSS: اتهبلت
[2026-07-13T15:52:41.868Z] U0BH02A0NAW: ده كل اللى عملته انا فى sprint 1...
[2026-07-14T18:40:53.763Z] U0BGZ4PQJ94: :rocket: _Hello from Aian!_ I am _Aian_...
```

_(The AI will have no idea who U0BGXU4AVSS or U0BH3MGJ0Q4 are)._

### Expected Output Example

After correctly mapping the IDs using the Slack API, the resulting `KnowledgeArtifact` should look like this:

```json
{
  "id": "e9b2c3d4-...",
  "organizationId": "6f52307e-fe81-4a40-afff-f45af6f9f546",
  "type": "conversation",
  "provider": "SLACK",
  "title": "Slack Conversation in Channel C0BKLRBAX32",
  "content": "[2026-07-13T15:34:10Z] Amir: Besm Allah Alrahman Alraheem\n[2026-07-13T15:35:45Z] Sarah: :wave: Hi everyone!\n[2026-07-13T15:36:00Z] Amir: nice to meet u too, amir.",
  "participants": [
    { "externalId": "U0BGXU4AVSS", "name": "Amir" },
    { "externalId": "U0BH3MGJ0Q4", "name": "Sarah" }
  ],
  "metadata": {
    "resourceId": "C0BKLRBAX32",
    "team_id": "T0BGJHG4U6B",
    "messageCount": 3
  },
  "extractedAt": null,
  "createdAt": "2026-07-21T14:14:26Z",
  "updatedAt": "2026-07-21T14:14:26Z"
}
```

---

## 2. Jira Assembler (Task Eye)

**Artifact Type:** `ticket_lifecycle`
**Grouping Key:** `externalResourceId` (Jira Issue ID / Key).

### Enrichment Requirement

Jira items usually contain full names in the `metadata` (e.g., `assignee`, `reporter`) and `participants`. Your job is to format the ticket's title, status changes, and any comments into a timeline.

### Expected Output Example

Based on the raw Jira `issue_updated` item, the resulting artifact should look like this:

```json
{
  "id": "a1b2c3d4-...",
  "organizationId": "955a0d32-118a-4b61-a5d4-00adaf0935c9",
  "type": "ticket_lifecycle",
  "provider": "JIRA",
  "title": "SCRUM-12: Task 4 — GitHub Connection & Collection",
  "content": "Ticket Created/Updated: SCRUM-12\nTitle: Task 4 — GitHub Connection & Collection\nStatus: To Do\nPriority: Medium\nReporter: Amir Mawla\nAssignee: hager nofal\n\n[2026-07-20T21:37:22Z] Amir Mawla updated the issue.",
  "participants": [
    {
      "name": "hager nofal",
      "externalId": "712020:24f2e357-bee1-431f-bff6-25aa2c3774ed"
    },
    {
      "name": "Amir Mawla",
      "externalId": "712020:52a7ea38-6fd4-4631-964b-730994caac6e"
    }
  ],
  "metadata": {
    "issueKey": "SCRUM-12",
    "projectId": "10000",
    "projectKey": "SCRUM"
  },
  "extractedAt": null,
  "createdAt": "2026-07-21T14:14:26Z",
  "updatedAt": "2026-07-21T14:14:26Z"
}
```

---

## 3. GitHub Assembler (Coding Eye)

**Artifact Type:** `implementation_story`
**Grouping Key:** `parentExternalResourceId` (Pull Request ID/Number) or `externalResourceId`.

### Enrichment Requirement

A Pull Request artifact should group the `pr_opened` event, all `commit` events, and `review_comment` events into one story. The content should read like a changelog.

### Expected Output Example

Based on the raw GitHub `pr_opened` item:

```json
{
  "id": "c3d4e5f6-...",
  "organizationId": "09eea833-26de-4c5a-b06c-3d615ef168de",
  "type": "implementation_story",
  "provider": "GITHUB",
  "title": "PR #1 (doniaamohamed/docker): Add Arabic/English language support (i18n)",
  "content": "[2026-07-20T21:56:41Z] doniaamohamed opened PR #1:\n\nThis PR introduces the foundation for bilingual support (Arabic/English) across AIAN.\nWhat's included:\n- Language toggle component in the top navigation\n- Arabic translation strings for the Owner Dashboard\n- RTL layout handling for the sidebar\n\nWhy: Several organizations using AIAN operate primarily in Arabic...",
  "participants": [{ "name": "doniaamohamed", "externalId": "256154840" }],
  "metadata": {
    "repositoryId": 1248237251,
    "prNumber": 1,
    "state": "open"
  },
  "extractedAt": null,
  "createdAt": "2026-07-21T14:14:26Z",
  "updatedAt": "2026-07-21T14:14:26Z"
}
```

---

## 4. Zoom Assembler (Meeting Eye)

**Artifact Type:** `meeting_outcome`
**Grouping Key:** `externalResourceId` (Meeting ID).

### Enrichment Requirement

Zoom transcripts are already mostly formatted. The assembler should prepend the AI-generated `summarization` (found in the metadata) to the top of the content so the Stage 2 Global AI gets the summary immediately, followed by the raw transcript.

### Expected Output Example

Based on the raw Zoom `bot.completed` item:

```json
{
  "id": "f7e8d9c0-...",
  "organizationId": "63836439-fe55-4f9b-9436-8250849361f3",
  "type": "meeting_outcome",
  "provider": "ZOOM",
  "title": "Zoom Meeting Transcript",
  "content": "=== MEETING SUMMARY ===\nيتحدث باسم مهندس محمد إبراهيم إلى الجمهور عن تقدّم العمل على التكامل مع تطبيق Zoom، ويذكر أنهم في المرحلة الأخيرة تقريبًا، ومن المتوقع خلال ساعات قليلة إنهاء المشروع بالكامل—بفضل الله.\n\n=== FULL TRANSCRIPT ===\n[2026-07-21T03:19:25Z]\n[Unknown]: السلام عليكم\n[Muhammad Elazzazy]: انا باسم مهندس محمد ابراهيم جاي اتكلم معاكم النهاردة في اجاز عن موضوع بسيط وهو ان احنا تقريبا\n[Muhammad Elazzazy]: انتهينا من التكامل مع\n...",
  "participants": [
    { "name": "Muhammad Elazzazy", "externalId": "Ws9lYbOZT56qC8fzSVx-zg" }
  ],
  "metadata": {
    "durationSeconds": 111,
    "audioUrl": "https://meeting-baas-v2-artifacts..."
  },
  "extractedAt": null,
  "createdAt": "2026-07-21T14:14:26Z",
  "updatedAt": "2026-07-21T14:14:26Z"
}
```
