import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { GraphResponse } from '@/shared/types/graph';

export function useNodeNeighbors(nodeId: string | null) {
  return useQuery({
    queryKey: ['graph', 'neighbors', nodeId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: GraphResponse }>(`/graph/nodes/${nodeId}/neighbors`);
      return res.data.data;
    },
    enabled: !!nodeId,
    staleTime: 30_000,
  });
}
