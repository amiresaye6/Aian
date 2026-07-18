import { useQuery } from "@tanstack/react-query";
import { getAvailableResource } from "@/api/integrations";

export function useProviderResources(connectionId: string | null) {
  return useQuery({
    queryKey: ["integrations", "resources", connectionId],
    queryFn: async () => {
      const res = await getAvailableResource(connectionId as string);
      console.log(res);
      return res;
    },
    enabled: !!connectionId,
  });
}