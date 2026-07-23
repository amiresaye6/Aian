import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { KnowledgeArtifactRepository } from './repositories/knowledge-artifact.repository';
import { ExtractionResult, ExtractionResultSchema } from './extraction.schema';
import { KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { EntityResolutionService } from '../resolution/resolution.service';

/**
 * The model that has been tested and proven to reliably output
 * JSON matching our exact schema with correct field names and types.
 * Test date: 2026-07-22. Output verified manually via Postman.
 */
const EXTRACTION_MODEL = 'openai.gpt-oss-120b-1:0';

/**
 * Higher token limit for extraction — long conversations produce large JSON.
 * The Slack bug-fixing conversation used ~4000 tokens and was truncated at 4000.
 */
const EXTRACTION_MAX_TOKENS = 8000;

@Injectable()
export class KnowledgeExtractionService {
  private readonly logger = new Logger(KnowledgeExtractionService.name);

  constructor(
    private readonly artifactRepository: KnowledgeArtifactRepository,
    private readonly aiGateway: AiGatewayService,
    private readonly resolutionService: EntityResolutionService,
  ) {}

  /**
   * Main entry point for Stage 2.
   *
   * Called by KnowledgeProcessorService immediately after a KnowledgeArtifact
   * is persisted by Stage 1 Assembly. Failures are caught and logged without
   * bubbling up — a failed extraction never blocks the parent batch.
   */
  async extractFromArtifact(artifactId: string): Promise<void> {
    this.logger.log(
      `[Stage 2] Starting extraction for artifact: ${artifactId}`,
    );

    const artifact = await this.artifactRepository.findById(artifactId);
    if (!artifact) {
      this.logger.warn(
        `Artifact ${artifactId} not found. Skipping extraction.`,
      );
      return;
    }

    // Idempotency guard: skip if already processed
    if (artifact.extractionStatus === 'completed') {
      this.logger.debug(`Artifact ${artifactId} already extracted. Skipping.`);
      return;
    }

    await this.artifactRepository.markProcessing(artifactId);

    try {
      const prompt = this.buildExtractionPrompt(artifact);
      const startTime = Date.now();

      const result: ExtractionResult =
        await this.aiGateway.generateStructuredOutput(
          prompt,
          ExtractionResultSchema,
          'knowledge_extraction',
          'Extracts structured organizational knowledge facts from a communication artifact.',
          {
            model: EXTRACTION_MODEL,
            maxTokens: EXTRACTION_MAX_TOKENS,
          },
        );

      await this.artifactRepository.saveExtractionResult(artifactId, result);

      // Stage 3: Trigger entity resolution asynchronously.
      // setImmediate ensures it never blocks Stage 2's error handling or logging.
      setImmediate(() => {
        this.resolutionService
          .resolveArtifact(artifactId)
          .catch((err) =>
            this.logger.error(
              `[Stage 3] Resolution trigger failed for artifact ${artifactId}: ${err.message}`,
            ),
          );
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `[Stage 2] Extraction completed for artifact ${artifactId} in ${latency}ms. ` +
          `Entities: ${result.entities.length}, Relationships: ${result.relationships.length}, ` +
          `Decisions: ${result.decisions.length}, ActionItems: ${result.actionItems.length}`,
      );
    } catch (error) {
      // Never block the parent batch — log and move on.
      // The artifact remains in 'failed' state and can be retried later.
      await this.artifactRepository.markFailed(artifactId, error.message);
      this.logger.error(
        `[Stage 2] Extraction failed for artifact ${artifactId}. ` +
          `It will be retried in the next pass. Error: ${error.message}`,
      );
    }
  }

  /**
   * Retry all failed or pending artifacts for an organization.
   * Can be triggered by admin tooling or a scheduled retry job.
   */
  async retryFailedArtifacts(organizationId?: string): Promise<void> {
    const failed =
      await this.artifactRepository.findPendingOrFailed(organizationId);
    this.logger.log(
      `[Stage 2] Retrying extraction for ${failed.length} artifact(s)...`,
    );
    for (const artifact of failed) {
      await this.extractFromArtifact(artifact.id);
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private buildExtractionPrompt(artifact: KnowledgeArtifact): string {
    const artifactTypeLabel = this.getArtifactTypeLabel(artifact.type);
    const participants = Array.isArray(artifact.participants)
      ? (artifact.participants as any[])
          .map((p: any) => p?.name || p?.displayName || p)
          .join(', ')
      : '';
    const metadata = artifact.metadata as any;

    return `Extract structured organizational knowledge from this ${artifactTypeLabel}.

PROVIDER: ${artifact.provider}
TITLE: ${artifact.title ?? 'Untitled'}
${participants ? `PARTICIPANTS: ${participants}` : ''}
${metadata?.channel ? `CHANNEL/CONTEXT: ${metadata.channel}` : ''}

ARTIFACT CONTENT:
---
${artifact.content}
---

Output a JSON object with EXACTLY these top-level keys: summary, topics, entities, relationships, claims, decisions, actionItems.

Do NOT invent your own key names. Do NOT use 'people', 'systems', 'tasks', 'observations', or any other keys.

Rules for each field:

- summary: string. A concise 2-4 sentence summary.

- topics: array of strings. Main topics, technologies, or domains discussed.

- entities: array of objects. Every named person, system, service, project, tool, library, or concept. Each object must have:
  - name: string
  - type: one of exactly: Person, Team, Project, Feature, Task, Bug, Incident, System, Service, API, Database, Repository, PullRequest, Meeting, Decision, Document, Release
  - aliases: array of strings (alternative names, can be empty)
  - confidence: number between 0.0 and 1.0

- relationships: array of objects. Factual relationships between entities. Each object must have:
  - subject: string (entity name)
  - predicate: string (relationship verb, e.g. caused, owns, depends_on, blocked_by, proposed, assigned_to)
  - object: string (entity name)
  - confidence: number between 0.0 and 1.0
  - evidenceQuote: string (exact quote from the text supporting this relationship)

- claims: array of objects. Factual observations or assertions. Each object must have:
  - statement: string
  - confidence: number between 0.0 and 1.0
  - evidenceQuote: string

- decisions: array of objects. Explicitly agreed-upon decisions. Each object must have:
  - decision: string
  - madeBy: string or null
  - confidence: number between 0.0 and 1.0
  - evidenceQuote: string

- actionItems: array of objects. Tasks or next steps. Each object must have:
  - task: string
  - assignee: string or null
  - dueDate: string or null
  - confidence: number between 0.0 and 1.0
  - evidenceQuote: string`;
  }

  private getArtifactTypeLabel(type: ArtifactType): string {
    const labels: Record<ArtifactType, string> = {
      conversation: 'Slack/Chat Conversation',
      ticket_lifecycle: 'Jira/Project Ticket Lifecycle',
      implementation_story:
        'GitHub Implementation Story (PRs, Commits, Reviews)',
      meeting_outcome: 'Zoom/Video Meeting Outcome',
      document: 'Uploaded Document',
    };
    return labels[type] ?? type;
  }
}
