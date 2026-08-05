import { api } from "@/api/axios";
import { PaginatedEntitiesResponse, ResolvedEntity, MergeEntitiesResponse } from "@/types/entities";

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
    try {
      const response = await api.get<any>(`/entities/${entityId}`);
      return response.data?.data || response.data;
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        const graphResponse = await api.get<any>(`/graph/nodes/${entityId}/details`);
        const graphData = graphResponse.data?.data || graphResponse.data;
        if (!graphData || !graphData.entity) throw err;
        
        return {
          id: graphData.entity.id,
          canonicalName: graphData.entity.canonicalName,
          normalizedName: graphData.entity.normalizedName,
          type: graphData.entity.type,
          confidence: graphData.entity.confidence,
          aliases: graphData.entity.aliases || [],
          mentions: (graphData.artifacts || []).map((a: any) => ({
             id: a.id + '-mock',
             extractedName: graphData.entity.canonicalName,
             confidence: 1,
             createdAt: a.updatedAt,
             artifact: a
          }))
        } as any;
      }
      throw err;
    }
  },

  mergeEntities: async (primaryEntityId: string, secondaryEntityId: string): Promise<MergeEntitiesResponse> => {
    const response = await api.post<any>('/entities/merge', {
      primaryEntityId,
      secondaryEntityId,
    });
    return response.data?.data || response.data;
  },
};
