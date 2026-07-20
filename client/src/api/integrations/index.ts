import api from '../axios';
import { useAuthStore } from '@/store/auth/auth.store';

export type ProviderKey = 'jira' | 'github' | 'slack' | 'zoom' | string;

// eyeType values must match backend EyeType enum keys (lowercase, per DB seed)
export type EyeType = 'chat' | 'meeting' | 'task' | 'coding';

const PROVIDER_TO_EYE_TYPE: Record<ProviderKey, EyeType> = {
  slack: 'chat',
  zoom: 'meeting',
  jira: 'task',
  github: 'coding',
};
/**
 * Global endpoints that don't depend on a specific provider key
 */

// Gets provider metadata from backend
export const getProvidersMetadata = async () => {
  const response = await api.get('/providers/metadata');
  return response.data.data;
};

// Gets all connections for an organization
export const getConnections = async (organizationId: string) => {
  const response = await api.get(`/eyes?organizationId=${organizationId}`);
  return response.data.data;
};

// Gets details for a specific connection
export const getConnection = async (connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}`);
  return response.data.data;
};

// Deletes/revokes a connection
export const deleteConnection = async (connectionId: string) => {
  const response = await api.delete(`/eyes/${connectionId}`);
  return response.data.data;
};

/**
 * Provider-specific endpoints
 */

// 1. Connect Page - Gets the install/OAuth redirect URL
export const getInstallUrl = (provider: ProviderKey, organizationEyeId: string): string => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1234/api/v1';
  return `${API_URL}/integrations/${provider}/install?organizationEyeId=${organizationEyeId}`;
};

// 2. Resources Page - Gets available resources
export const getAvailableResources = async (provider: ProviderKey, connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}/resources/available`);
  return response.data.data;
};

// Gets currently selected resources
export async function getSelectedResources(providerKey: ProviderKey, connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.get(`/eyes/${connectionId}/resources/selected?organizationId=${orgId}`);
  return res.data.data || res.data;
}

export async function revokeConnection(connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.delete(`/eyes/${connectionId}?organizationId=${orgId}`);
  return res.data.data || res.data;
}

export async function getHealth(connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.get(`/eyes/${connectionId}/health?organizationId=${orgId}`);
  return res.data.data || res.data;
}

export async function getRecentKnowledge(connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.get(`/eyes/${connectionId}/knowledge/recent?organizationId=${orgId}`);
  return res.data.data || res.data;
}

export async function getKnowledgeStats(connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.get(`/eyes/${connectionId}/knowledge/stats?organizationId=${orgId}`);
  return res.data.data || res.data;
}

// Saves selected resources
export const saveSelectedResources = async (provider: ProviderKey, connectionId: string, resourceIds: string[]) => {
  const response = await api.post(`/eyes/${connectionId}/resources/selected`, { resourceIds });
  return response.data.data;
};

// 3. Sync Config Page - Updates settings
export const updateSyncConfig = async (provider: ProviderKey, connectionId: string, config: any) => {
  const response = await api.put(`/eyes/${connectionId}/settings`, config);
  return response.data.data;
};

// 4. Syncing Page
export const startHistoricalSync = async (provider: ProviderKey, connectionId: string) => {
  const response = await api.post(`/eyes/${connectionId}/sync/historical/start`);
  return response.data.data;
};

export const getHistoricalSyncStatus = async (provider: ProviderKey, connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}/sync/historical/status`);
  return response.data.data;
};

// 5. Jira Specific - Site Selection
export const getPendingSites = async (connectionId: string) => {
  const response = await api.get(`/integrations/jira/pending-sites?connectionId=${connectionId}`);
  return response.data.data;
};

export const selectJiraSite = async (connectionId: string, selectedCloudId: string) => {
  const response = await api.post(`/integrations/jira/select-site`, {
    providerConnectionId: connectionId,
    selectedCloudId,
  });
  return response.data.data;
};
