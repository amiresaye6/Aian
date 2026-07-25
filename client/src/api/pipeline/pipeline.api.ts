import { api } from "@/api/axios";
import {
  ProcessingSettings,
  IngestionBatch,
  KnowledgeItem,
  SyncStatusResponse,
  PaginatedResponse,
} from "@/types/pipeline";

export const pipelineApi = {
  // Processing Settings
  getProcessingSettings: async (organizationId: string) => {
    const response = await api.get<ProcessingSettings>(
      `/organizations/${organizationId}/settings/processing`
    );
    return response.data;
  },

  updateProcessingSettings: async (organizationId: string, data: Partial<ProcessingSettings>) => {
    const response = await api.put<ProcessingSettings>(
      `/organizations/${organizationId}/settings/processing`,
      data
    );
    return response.data;
  },

  // Sync Operations
  triggerSyncNow: async (organizationId: string) => {
    const response = await api.post(`/sync/${organizationId}/now`);
    return response.data;
  },

  getSyncStatus: async (organizationId: string) => {
    const response = await api.get<SyncStatusResponse>(`/sync/${organizationId}/status`);
    return response.data;
  },

  // Batches & Items
  getBatches: async (organizationId: string) => {
    const response = await api.get<PaginatedResponse<IngestionBatch>>(
      `/batches?organizationId=${organizationId}`
    );
    return response.data;
  },

  getBatchDetails: async (batchId: string) => {
    const response = await api.get<IngestionBatch>(`/batches/${batchId}`);
    return response.data;
  },

  getBatchItems: async (batchId: string, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<KnowledgeItem>>(
      `/batches/${batchId}/items?page=${page}&limit=${limit}`
    );
    return response.data;
  },
};
