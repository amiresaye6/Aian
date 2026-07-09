import {
  ProviderConnection,
  ConnectionVerificationResult,
  RefreshedCredentials,
} from './provider-connection.interface';
import { ProviderResource } from './provider-resource.interface';

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
}
