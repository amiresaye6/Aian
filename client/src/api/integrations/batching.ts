import api from '../axios';

export const getBatches = async (organizationId: string) => {
  const response = await api.get(`/batches?organizationId=${organizationId}`);
  return response.data;
};

export const getBatchDetails = async (batchId: string) => {
  const response = await api.get(`/batches/${batchId}`);
  return response.data;
};
