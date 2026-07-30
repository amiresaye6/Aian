import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";

export function useActiveSubscription() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ["activeSubscription", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getActiveSubscription(organizationId);
    },
    enabled: !!organizationId,
  });
}
