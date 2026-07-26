import { api } from "@/api/axios";
import { KnowledgeArtifact, PaginatedArtifacts, BulkRetryDto } from "@/types/knowledge";

export const artifactsApi = {
  getArtifacts: async (organizationId: string, page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({
      organizationId,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append("status", status);
    }
    const response = await api.get<PaginatedArtifacts>(`/artifacts?${params.toString()}`);
    return response.data?.data || response.data;
  },

  getArtifact: async (artifactId: string) => {
    const response = await api.get<KnowledgeArtifact>(`/artifacts/${artifactId}`);
    return response.data?.data || response.data;
  },

  getArtifactLogs: async (artifactId: string) => {
    const response = await api.get<{ error: any }>(`/artifacts/${artifactId}/logs`);
    return response.data?.data || response.data;
  },

  retryArtifact: async (artifactId: string) => {
    const response = await api.post(`/artifacts/${artifactId}/retry-extraction`);
    return response.data?.data || response.data;
  },

  bulkRetryArtifacts: async (dto: BulkRetryDto) => {
    const response = await api.post(`/artifacts/retry-extraction`, dto);
    return response.data?.data || response.data;
  },
};
