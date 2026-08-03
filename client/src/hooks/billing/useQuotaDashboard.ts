import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";

export function useQuotaDashboard() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ["quotaDashboard", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getQuotaDashboard(organizationId);
    },
    enabled: !!organizationId,
  });
}
