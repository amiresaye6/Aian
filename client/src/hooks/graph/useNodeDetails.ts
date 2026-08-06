import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';

export function useNodeDetails(nodeId: string | null) {
  return useQuery({
    queryKey: ['graph', 'node-details', nodeId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/graph/nodes/${nodeId}/details`);
      return res.data.data;
    },
    enabled: !!nodeId,
  });
}
