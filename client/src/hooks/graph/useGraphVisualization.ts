import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { GraphResponse } from '@/shared/types/graph';

export interface GraphFilters {
  limit?: number;
  minDegree?: number;
  entityTypes?: string;
  relationshipTypes?: string;
}

export function useGraphVisualization(filters: GraphFilters) {
  return useQuery({
    queryKey: ['graph', 'visualize', filters],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: GraphResponse }>('/graph/visualize', { params: filters });
      return res.data.data;
    },
    staleTime: 30_000,
  });
}
