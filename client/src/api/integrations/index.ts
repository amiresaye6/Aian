import api from '../axios';

export type ProviderKey = 'jira' | 'github' | 'slack' | 'zoom';

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
