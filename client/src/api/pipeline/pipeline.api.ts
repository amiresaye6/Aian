// @ts-nocheck
import { api } from "@/api/axios";
import {
  ProcessingSettings,
  IngestionBatch,
  KnowledgeItem,
  PipelineStatusResponse,
  SyncNowResponse,
  PaginatedResponse,
} from "@/types/pipeline";

export const pipelineApi = {
  // Processing Settings
  getProcessingSettings: async (organizationId: string) => {
    const response = await api.get(
      `/organizations/${organizationId}/settings/processing`
    );
    return response.data?.data || response.data;
  },

  updateProcessingSettings: async (organizationId: string, data: Partial<ProcessingSettings>) => {
    const response = await api.put(
      `/organizations/${organizationId}/settings/processing`,
      data
    );
    return response.data?.data || response.data;
  },

  // Sync Operations
  triggerSyncNow: async (organizationId: string): Promise<SyncNowResponse> => {
    const response = await api.post(`/sync/${organizationId}/now`);
    return response.data?.data || response.data;
  },

  getPipelineStatus: async (organizationId: string): Promise<PipelineStatusResponse> => {
    const response = await api.get<PipelineStatusResponse>(
      `/sync/${organizationId}/pipeline-status`
    );
    return response.data?.data || response.data;
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
