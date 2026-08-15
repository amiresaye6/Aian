import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";
import { toast } from "sonner";

export function useDowngradeSubscription() {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useMutation({
    mutationFn: async (planSlug: string) => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.schedulePlanDowngrade(organizationId, planSlug);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeSubscription", organizationId] });
      toast.success(data.message || "Downgrade scheduled successfully.");
    },
    onError: (error: unknown) => {
      const e = error as any;
      toast.error(e?.response?.data?.message || "Failed to schedule downgrade.");
    },
  });
}
