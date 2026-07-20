import api from '../axios';

// Trigger Sync Now for all connections in an organization
export const syncAllConnections = async (organizationId: string) => {
  const response = await api.post(`/sync/${organizationId}/now`);
  return response.data;
};
