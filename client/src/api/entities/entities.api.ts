import { api } from "@/api/axios";
import { PaginatedEntitiesResponse, ResolvedEntity } from "@/types/entities";

export const entitiesApi = {
  getEntities: async (organizationId: string, type?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams({
      organizationId,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (type && type !== "All") {
      params.append("type", type);
    }

    const response = await api.get<PaginatedEntitiesResponse>(`/entities?${params.toString()}`);
    // Unwrap standard { success: true, data: { ... } } structure
    //console.log(response.data?.data || response.data)
    //console.log(organizationId);
    return response.data?.data || response.data;
  },

  getEntityDetails: async (entityId: string) => {
    const response = await api.get<ResolvedEntity>(`/entities/${entityId}`);
    return response.data?.data || response.data;
  },
};
