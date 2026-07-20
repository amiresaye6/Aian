import api from '../axios';

export const getProcessingSettings = async (organizationId: string) => {
  const response = await api.get(`/organizations/${organizationId}/settings/processing`);
  return response.data;
};

export const updateProcessingSettings = async (organizationId: string, settings: any) => {
  const response = await api.put(`/organizations/${organizationId}/settings/processing`, settings);
  return response.data;
};
