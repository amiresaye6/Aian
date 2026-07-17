import { KnowledgeItem } from './knowledge-item.interface';

/**
 * Raw event input from a provider (webhook payload or polling result).
 * Passed to the ProviderAdapter for normalization.
 */
export interface ProviderEventInput {
  /** The raw payload exactly as received from the provider. */
  rawPayload: Record<string, unknown>;

  /** Reference key to the stored raw event record. */
  rawEventReference: string;

  /** The organization ID this event belongs to. */
  organizationId: string;

  /** The connection ID that received this event. */
  connectionId: string;

  /** 
   * The specific event type extracted from the provider (e.g. from headers or body).
   * Optional so that polling or other methods that don't have it won't break.
   */
  providerEventType?: string;
}

/**
 * Provider Adapter Contract.
 *
 * Each provider (Slack, GitHub, Zoom, Jira) implements this interface
 * to convert their raw events into the unified KnowledgeItem shape.
 *
 * The adapter is stateless — it receives raw input and returns normalized output.
 */
export interface ProviderAdapter {
  /**
   * Normalize a raw provider event into one or more KnowledgeItems.
   * A single event may produce multiple items (e.g., a Slack message with thread replies).
   */
  normalizeEvent(input: ProviderEventInput): KnowledgeItem[];

  /**
   * Generate a deterministic idempotency key for a KnowledgeItem.
   * Used to prevent duplicate storage when the same event is received twice.
   */
  getIdempotencyKey(item: KnowledgeItem): string;

  /**
   * Extract the external resource ID from a raw event.
   * Used to route events to the correct resource selection.
   */
  getExternalResourceId(input: ProviderEventInput): string;

  /**
   * Extract the external event ID from a raw event.
   * Returns null if the event type doesn't have a meaningful event ID.
   */
  getExternalEventId(input: ProviderEventInput): string | null;
}
