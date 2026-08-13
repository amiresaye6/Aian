/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateMeetingPayload, MeetingAttendee, UpdateMeetingPayload } from '@/types/meeting';
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
  const response = await api.get<{ success: boolean; data: any[] }>('/eyes/catalog');
  const catalog = response.data.data;
  
  const mappedProviders: any[] = [];
  
  for (const eye of catalog) {
    for (const provider of eye.providers) {
      if (!provider.availableInV1) continue; // Only show available providers in the eyes list, or keep them all if we want to show coming soon
      
      mappedProviders.push({
        key: provider.key,
        name: provider.name,
        category: eye.name, 
        tagline: eye.description || `Connect ${provider.name} workspace`,
        brand: provider.name,
        glyph: provider.logoUrl, // Pass logoUrl into glyph
        logoUrl: provider.logoUrl,
        resourceLabel: "resources", 
        permissions: [],
        scopes: [],
        sampleResources: [],
        defaultWorkspaceName: "Workspace",
      });
    }
  }
  return mappedProviders;
};
// Gets all connections for an organization
export const getConnections = async (organizationId: string) => {
  const response = await api.get<{ success: boolean; data: any[] }>(`/organizations/${organizationId}/eyes`);
  const eyes = response.data.data;
  return eyes.map(eye => ({
    key: eye.providerKey || eye.eyeType,
    name: eye.providerName || eye.eyeType,
    category: eye.category,
    tagline: eye.tagline || `Connect ${eye.providerName} workspace`,
    brand: eye.providerName,
    glyph: eye.logoUrl,
    logoUrl: eye.logoUrl,
    resourceLabel: "resources",
    permissions: [],
    scopes: [],
    sampleResources: [],
    defaultWorkspaceName: "Workspace",
    organizationEyeId: eye.id,
    connectionId: eye.connectionId,
  }));
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

export const getMembers = async (connectionId: string) => {
  const response = await api.get(`/eyes/${connectionId}/members`);
  return response.data.data || response.data;
};


export async function getPendingCount(connectionId: string) {
  const orgId = useAuthStore.getState().orgId;
  const res = await api.get(`/eyes/${connectionId}/stats/pending-count?organizationId=${orgId}`);
  return res.data.data || res.data;
}


// meeting's providers specific

export const getScheduledMeetings = async (
  connectionId: string,
  provider: string,
  pageSize = 10,
  nextPageToken?: string,
) => {
  const response = await api.get(`/${provider}/scheduled/${connectionId}`, {
    params: {
      pageSize,
      ...(nextPageToken ? { nextPageToken } : {}),
    },
  });
  return response.data.data;
};

export const getLiveMeetings = async (
  connectionId: string,
  provider: string,
  pageSize = 10,
  nextPageToken?: string,
) => {
  const response = await api.get(`/${provider}/live/${connectionId}`, {
    params: {
      pageSize,
      ...(nextPageToken ? { nextPageToken } : {}),
    },
  });
  return response.data.data;
};

export const createMeeting = async (
  connectionId: string,
  provider: string,
  payload: CreateMeetingPayload,
) => {
  const response = await api.post(`/${provider}/create-meeting/${connectionId}`, payload);
  return response.data.data ?? response.data;
};

export const updateMeeting = async (
  connectionId: string,
  provider: string,
  meetingId: string,
  payload: UpdateMeetingPayload,
) => {
  const response = await api.patch(
    `/${provider}/update-meeting/${connectionId}/${meetingId}`,
    payload,
  );
  return response.data.data ?? response.data;
};

export const deleteMeeting = async (
  connectionId: string,
  provider: string,
  meetingId: string,
) => {
  const response = await api.delete(`/${provider}/delete-meeting/${connectionId}/${meetingId}`);
  return response.data.data ?? response.data;
};

export const addRegistrants = async (
  connectionId: string,
  provider: string,
  meetingId: string,
  attendees?: string[]
) => {
  const response = await api.post(
    `/${provider}/add-registrants/${connectionId}/${meetingId}`,
    { attendees },
  );
  return response.data.data ?? response.data;
};

