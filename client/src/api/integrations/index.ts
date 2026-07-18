import api from '../axios';

export type ProviderKey = 'jira' | 'github' | 'slack' | 'zoom';

// eyeType values must match backend EyeType enum keys (lowercase, per DB seed)
export type EyeType = 'chat' | 'meeting' | 'task' | 'coding';

const PROVIDER_TO_EYE_TYPE: Record<ProviderKey, EyeType> = {
  slack: 'chat',
  zoom: 'meeting',
  jira: 'task',
  github: 'coding',
};
/**
  API Mapping
 * If the backend team builds entirely separate controllers for each Eye 
 * (e.g. /api/jira/... vs /api/slack/...), we map the provider to its specific route prefix here.
 * This keeps the React components completely generic.
 */
const getBaseUrl = (provider: ProviderKey): string => {
  const ENDPOINTS: Record<ProviderKey, string> = {
    jira: '/jira',
    github: '/github',
    slack: '/slack',
    zoom: '/zoom',
  };

  return ENDPOINTS[provider] || `/integrations/${provider}`;
};


/**
 * 1. Connect Page (/eyes/[provider]/connect)
 * Gets the OAuth connection URL and initial scopes required.
 */
export const getConnectUrl = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/connect-url`);
  return response.data;
};

/**
 * 2. Redirect Page (/eyes/[provider]/redirect)
 * Exchanges the OAuth code for an access token to finalize authorization.
 */
export const authorizeIntegration = async (provider: ProviderKey, code: string) => {
  const response = await api.post(`${getBaseUrl(provider)}/authorize`, { code });
  return response.data;
};

/**
 * 3. Resources Page (/eyes/[provider]/resources)
 * Fetches the available resources (repos, channels, projects) from the provider.
 */
export const getAvailableResources = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/resources`);
  return response.data;
};

export const saveSelectedResources = async (provider: ProviderKey, selectedIds: string[]) => {
  const response = await api.post(`${getBaseUrl(provider)}/resources`, { selectedIds });
  return response.data;
};

// GitHub App Installation Flow
// GitHub uses a different connection model than classic OAuth:
// the browser is redirected to GitHub directly (no JSON "connect URL"
// to fetch first), and the backend callback finalizes the connection
// server-side, then redirects back to /eyes/github/success itself.
// ─────────────────────────────────────────────────────────────

/**
 * Builds the full backend URL that starts the GitHub App installation.
 * This is NOT an axios call — the Connect page must navigate the full
 * browser to this URL (window.location.href), not fetch it as JSON,
 * because the backend's /install route responds with an HTTP redirect
 * straight to GitHub's installation page.
 */
export const getGithubInstallUrl = (organizationEyeId: string): string => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1234/api/v1';
  return `${apiBaseUrl}/integrations/github/install?organizationEyeId=${organizationEyeId}`;
};

/**
 * 3. Resources Page (/eyes/[provider]/resources)
 * Fetches the available resources (repos, channels, projects) from the provider.
 *
 * Matches the real Sprint 2 contract:
 * GET /organizations/:organizationId/eyes/:eyeType/resources
 */
/**
 * 3. Resources — matches actual backend: ResourcesController
 * GET /eyes/:connectionId/resources/available
 */
export const getAvailableResource = async (connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}/resources/available`);
  return response.data.data;
};

export const getSelectedResources = async (connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}/resources/selected`);
  return response.data.data;
};

export const saveSelectedResource = async (
  connectionId: string,
  resourceIds: string[],
) => {
  const response = await api.post(`/eyes/${connectionId}/resources/selected`, {
    resourceIds,
  });
  return response.data.data;
};

/**
 * 4. Sync Config Page (/eyes/[provider]/sync-config)
 * Gets and updates the sync frequency, retention, and privacy settings.
 */
export const getSyncConfig = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/sync-config`);
  return response.data;
};

export const updateSyncConfig = async (provider: ProviderKey, config: any) => {
  const response = await api.patch(`${getBaseUrl(provider)}/sync-config`, config);
  return response.data;
};

/**
 * 5. Syncing Page (/eyes/[provider]/syncing)
 * Starts the initial background sync and polls for progress.
 */
export const startInitialSync = async (provider: ProviderKey) => {
  const response = await api.post(`${getBaseUrl(provider)}/sync/start`);
  return response.data;
};

export const getSyncProgress = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/sync/progress`);
  return response.data;
};

/**
 * 6. Details Page (/eyes/[provider]/details)
 * Gets the high-level overview, metric counts, and recent knowledge captured.
 */
export const getIntegrationDetails = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/details`);
  return response.data;
};

/**
 * 7. Health Page (/eyes/[provider]/health)
 * Gets heartbeat, latency metrics, and recent sync event logs.
 */
export const getIntegrationHealth = async (provider: ProviderKey) => {
  const response = await api.get(`${getBaseUrl(provider)}/health`);
  return response.data;
};

/**
 * General Action: Disconnect
 * Revokes the token and removes the integration.
 */
export const disconnectIntegration = async (provider: ProviderKey) => {
  const response = await api.delete(`${getBaseUrl(provider)}/disconnect`);
  return response.data;
};
