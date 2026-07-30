import { api } from "@/api/axios";
import { PaginatedEntitiesResponse, ResolvedEntity } from "@/types/entities";

export const entitiesApi = {
  getEntities: async (organizationId: string, type?: string, page: number = 1, limit: number = 20): Promise<PaginatedEntitiesResponse> => {
    const params = new URLSearchParams({
      organizationId,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (type && type !== "All") {
      params.append("type", type);
    }

    const response = await api.get<PaginatedEntitiesResponse>(`/entities?${params.toString()}`);
    // If the backend wraps in { success: true, data: PaginatedEntitiesResponse }
    return (response.data as any).success ? (response.data as any).data : response.data;
  },

  getEntityDetails: async (entityId: string): Promise<ResolvedEntity> => {
    const response = await api.get<any>(`/entities/${entityId}`);
    return response.data?.data || response.data;
  },
};
