import { Provider } from './provider.enum';
import { EyeType } from './eye-type.enum';

/**
 * Standardized error codes for all provider operations.
 * Every provider module must use these codes instead of ad-hoc error strings.
 */
export enum ProviderErrorCode {
  /** Could not establish a connection to the provider. */
  PROVIDER_CONNECTION_FAILED = 'PROVIDER_CONNECTION_FAILED',

  /** The OAuth token has expired and could not be refreshed. */
  PROVIDER_TOKEN_EXPIRED = 'PROVIDER_TOKEN_EXPIRED',

  /** The provider denied access (missing scopes, revoked permissions). */
  PROVIDER_PERMISSION_DENIED = 'PROVIDER_PERMISSION_DENIED',

  /** The provider returned a rate limit response (429). */
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',

  /** A webhook payload failed signature validation. */
  PROVIDER_WEBHOOK_INVALID = 'PROVIDER_WEBHOOK_INVALID',

  /** The requested resource does not exist or is inaccessible. */
  PROVIDER_RESOURCE_NOT_FOUND = 'PROVIDER_RESOURCE_NOT_FOUND',

  /** Data collection from the provider failed. */
  PROVIDER_COLLECTION_FAILED = 'PROVIDER_COLLECTION_FAILED',

  /** The adapter failed to normalize a provider event. */
  PROVIDER_NORMALIZATION_FAILED = 'PROVIDER_NORMALIZATION_FAILED',
}

/**
 * Custom error class for provider-related errors.
 * Provides structured error information for logging and collection run records.
 *
 * Usage:
 * ```ts
 * throw new ProviderError(
 *   ProviderErrorCode.PROVIDER_TOKEN_EXPIRED,
 *   Provider.SLACK,
 *   EyeType.CHAT,
 *   'Slack access token expired and refresh failed',
 *   originalError,
 * );
 * ```
 */
export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    public readonly provider: Provider,
    public readonly eyeType: EyeType,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
