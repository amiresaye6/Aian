import {
  ProviderConnection,
  ConnectionVerificationResult,
  RefreshedCredentials,
} from './provider-connection.interface';
import { ProviderResource } from './provider-resource.interface';
import { MessagePayload, MessageSendResult } from './message-payload.interface';

/**
 * Provider Client Contract.
 *
 * Each provider (Slack, GitHub, Zoom, Jira) implements this interface
 * to handle connection lifecycle operations:
 * - Verifying that a connection is still valid
 * - Fetching the list of resources the org can monitor
 * - Refreshing expired credentials
 *
 * The ProviderClientFactory returns the correct implementation based on the Provider enum.
 */
export interface ProviderClient {
  /**
   * Verify that the connection is still valid and has the required permissions.
   * Called after initial OAuth callback and periodically for health checks.
   */
  verifyConnection(
    connection: ProviderConnection,
  ): Promise<ConnectionVerificationResult>;

  /**
   * Fetch the list of resources available to monitor.
   * Examples: Slack channels, GitHub repos, Jira projects, Zoom meeting scope.
   */
  getResources(connection: ProviderConnection): Promise<ProviderResource[]>;

  /**
   * Refresh expired OAuth credentials.
   * Optional — not all providers use refresh tokens.
   */
  refreshCredentials?(
    connection: ProviderConnection,
  ): Promise<RefreshedCredentials>;

  /**
   * Revoke OAuth credentials on the provider side.
   * Called when the user disconnects the provider.
   */
  revokeCredentials?(connection: ProviderConnection): Promise<void>;

  /**
   * Send an outgoing message through the provider.
   * Optional — only providers that support messaging implement this.
   * Takes a generic MessagePayload and maps it to the provider's API.
   */
  sendMessage?(
    connection: ProviderConnection,
    payload: MessagePayload,
  ): Promise<MessageSendResult>;

  /**
   * Hook executed when the user saves their selected resources for this connection.
   * Optional — providers can use this to join channels, set up webhooks, or send welcome messages.
   */
  onResourcesSelected?(
    connection: ProviderConnection,
    resources: any[], // Type loosely to avoid circular dependency for now, we'll map it to the selection payload
  ): Promise<void>;
}
