/**
 * Represents a selectable resource from a provider.
 * Examples: a Slack channel, a GitHub repo, a Jira project.
 *
 * Returned by `ProviderClient.getResources()` so the owner can pick which ones to monitor.
 */
export interface ProviderResource {
  /** The resource's ID in the provider's system. */
  externalResourceId: string;

  /** Human-readable resource name (e.g., '#general', 'acme/api'). */
  name: string;

  /** Type of resource (e.g., 'channel', 'repository', 'project'). */
  resourceType: string;

  /** Provider-specific metadata about this resource. */
  metadata: Record<string, unknown>;
}
