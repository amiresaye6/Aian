import { Provider } from './provider.enum';
import { EyeType } from './eye-type.enum';

/**
 * Represents a polling/pagination cursor for a specific provider connection and resource.
 * Used by the collection flow to resume fetching from where it left off.
 */
export interface ProviderCursor {
  /** Unique cursor ID (UUID). */
  id: string;

  /** The connection this cursor belongs to. */
  connectionId: string;

  /** The specific resource being tracked (e.g., a channel or repo). Null for connection-level cursors. */
  externalResourceId: string | null;

  /** Provider enum value. */
  provider: Provider;

  /** Eye type enum value. */
  eyeType: EyeType;

  /**
   * The opaque cursor value used by the provider's API.
   * Could be a timestamp, page token, offset, or any provider-specific pagination value.
   */
  cursorValue: string;

  /** When this cursor was last used to fetch data. */
  lastFetchedAt: Date;
}
