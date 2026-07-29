// @ts-nocheck
import { api } from "@/api/axios";
import { KnowledgeArtifact, PaginatedArtifacts, BulkRetryDto } from "@/types/knowledge";

export const artifactsApi = {
  getArtifacts: async (organizationId: string, page = 1, limit = 20, status?: string): Promise<PaginatedArtifacts> => {
    const params = new URLSearchParams({
      organizationId,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append("status", status);
    }
    const response = await api.get<any>(`/artifacts?${params.toString()}`);
    return response.data?.data || response.data;
  },

  getArtifact: async (artifactId: string): Promise<KnowledgeArtifact> => {
    const response = await api.get<any>(`/artifacts/${artifactId}`);
    return response.data?.data || response.data;
  },

  getArtifactLogs: async (artifactId: string): Promise<{ error?: any; logs?: any }> => {
    const response = await api.get<any>(`/artifacts/${artifactId}/logs`);
    return response.data?.data || response.data;
  },

  retryArtifact: async (artifactId: string): Promise<any> => {
    const response = await api.post(`/artifacts/${artifactId}/retry-extraction`);
    return response.data?.data || response.data;
  },

  bulkRetryArtifacts: async (dto: BulkRetryDto): Promise<any> => {
    const response = await api.post(`/artifacts/retry-extraction`, dto);
    return response.data?.data || response.data;
  },
};
