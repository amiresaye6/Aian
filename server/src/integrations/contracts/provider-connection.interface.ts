import { Provider } from './provider.enum';
import { EyeType } from './eye-type.enum';

/**
 * Represents an active provider connection for an organization's eye.
 * This is the runtime shape used by provider clients, adapters, and the collection flow.
 *
 * Maps to the `ProviderConnection` Prisma model (formerly `Integration`).
 */
export interface ProviderConnection {
  /** Unique connection ID (UUID). */
  id: string;

  /** The organization eye this connection belongs to. */
  organizationEyeId: string;

  /** The organization that owns this connection. */
  organizationId: string;

  /** Which provider this connection is for. */
  provider: Provider;

  /** Which eye type this connection serves. */
  eyeType: EyeType;

  /** Encrypted OAuth access token. */
  accessTokenEncrypted: string;

  /** Encrypted OAuth refresh token (if the provider supports refresh). */
  refreshTokenEncrypted: string | null;

  /** When the current access token expires. */
  tokenExpiresAt: Date | null;

  /** OAuth scopes granted by the user. */
  scopes: string[];

  /** External account identifier in the provider's system. */
  externalAccountId: string | null;

  /** Human-readable account name in the provider. */
  externalAccountName: string | null;

  /** Provider-specific connection metadata (e.g., Jira site ID, GitHub installation ID). */
  connectionMetadata: Record<string, unknown>;
}

/**
 * Result of verifying a provider connection.
 */
export interface ConnectionVerificationResult {
  /** Whether the connection is valid and functional. */
  isValid: boolean;

  /** Human-readable status message. */
  message: string;

  /** The account name confirmed by the provider. */
  accountName?: string;

  /** The account ID confirmed by the provider. */
  accountId?: string;
}

/**
 * Result of refreshing provider credentials.
 */
export interface RefreshedCredentials {
  /** New encrypted access token. */
  accessTokenEncrypted: string;

  /** New encrypted refresh token (if rotated). */
  refreshTokenEncrypted?: string;

  /** New expiration time. */
  tokenExpiresAt: Date | null;
}
