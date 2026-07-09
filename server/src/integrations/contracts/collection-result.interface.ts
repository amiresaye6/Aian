import { ProviderCursor } from './provider-cursor.interface';

/**
 * Result returned by a CollectionStrategy after fetching data from a provider.
 */
export interface CollectionResult {
  /** Raw event payloads collected from the provider. */
  rawEvents: Array<{
    /** The raw payload as received from the provider. */
    payload: Record<string, unknown>;

    /** Provider-assigned event type (e.g., 'message', 'pull_request'). */
    providerEventType: string;

    /** Provider-assigned event ID for deduplication. */
    providerEventId?: string;
  }>;

  /**
   * Updated cursor value to resume from on the next collection.
   * Null if the provider doesn't support cursor-based pagination.
   */
  newCursor: Partial<ProviderCursor> | null;

  /** Whether there is more data to fetch (for paginated collection). */
  hasMore: boolean;

  /** Collection statistics. */
  stats: CollectionStats;
}

/**
 * Statistics about a collection run.
 */
export interface CollectionStats {
  /** Total events fetched from the provider API. */
  itemsFetched: number;

  /** Events successfully stored as KnowledgeItems. */
  itemsStored: number;

  /** Events skipped (duplicates or filtered out). */
  itemsIgnored: number;
}
