import { EyeType } from './eye-type.enum';
import { Provider } from './provider.enum';

/**
 * The Unified Knowledge Item.
 *
 * ALL provider adapters MUST output this exact shape.
 * No developer may change this interface alone — any change must be
 * agreed on by the entire team because every Eye and the future
 * Knowledge Processor depend on it.
 */
export interface KnowledgeItem {
  /** Unique identifier for this item (UUID). */
  id: string;

  /** The organization this item belongs to. */
  organizationId: string;

  /** Which eye category produced this item. */
  eyeType: EyeType;

  /** Which provider the data came from. */
  provider: Provider;

  /**
   * Provider-specific source type.
   * Examples: 'slack_message', 'github_pull_request', 'zoom_transcript', 'jira_issue'
   */
  sourceType: string;

  /**
   * The type of event that produced this item.
   * Examples: 'message_posted', 'pr_opened', 'meeting_ended', 'issue_created'
   */
  eventType: string;

  /** The external ID of the resource this item belongs to (e.g., channel ID, repo ID). */
  externalResourceId: string;

  /** The external ID of the specific event (e.g., message ts, PR number). Null if not applicable. */
  externalEventId: string | null;

  /** Parent resource ID for hierarchical linking (e.g., PR ID for a PR comment). */
  parentExternalResourceId: string | null;

  /** Human-readable title. Null if not applicable (e.g., a chat message has no title). */
  title: string | null;

  /** The main text content of this item. */
  content: string;

  /** The author/creator of this item. */
  author: {
    externalId?: string;
    name?: string;
    email?: string;
  } | null;

  /** List of participants (e.g., meeting attendees, PR reviewers). */
  participants: Array<{
    externalId?: string;
    name?: string;
    email?: string;
  }>;

  /** Human-readable location context (e.g., '#general channel', 'acme/api repo'). */
  contextLocation: string | null;

  /** Direct URL to the original item in the provider's UI. */
  sourceUrl: string | null;

  /** When the event originally occurred in the provider. */
  occurredAt: Date;

  /** When Aian received/collected this item. */
  receivedAt: Date;

  /** Visibility scope of this item. */
  visibility: 'ORGANIZATION' | 'RESTRICTED';

  /** Provider-specific metadata that doesn't fit the standard fields. */
  metadata: Record<string, unknown>;

  /** Reference key to the raw payload in raw_provider_events (for traceability). */
  rawPayloadReference: string;

  /** Schema version for forward compatibility. */
  version: string | null;
}
