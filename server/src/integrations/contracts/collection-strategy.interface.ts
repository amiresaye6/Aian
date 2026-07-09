import { ProviderConnection } from './provider-connection.interface';
import { ProviderCursor } from './provider-cursor.interface';
import { CollectionResult } from './collection-result.interface';

/**
 * Collection Strategy Contract.
 *
 * Each provider implements this interface to define how data is fetched
 * from the external service. There are typically two strategies per provider:
 *
 * 1. **Webhook-based** — data is pushed to Aian in real time
 * 2. **Polling-based** — Aian pulls data on a schedule using cursors
 *
 * The base collector calls this strategy during the collection flow.
 */
export interface CollectionStrategy {
  /**
   * Collect data from the provider.
   *
   * @param connection - The active provider connection with credentials
   * @param cursor - Optional cursor to resume from a previous collection point
   * @returns CollectionResult containing items, updated cursor, and stats
   */
  collect(
    connection: ProviderConnection,
    cursor?: ProviderCursor,
  ): Promise<CollectionResult>;
}
