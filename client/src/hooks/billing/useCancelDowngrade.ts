import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";
import { toast } from "sonner";

export function useCancelDowngrade() {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.cancelScheduledDowngrade(organizationId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeSubscription", organizationId] });
      toast.success(data.message || "Downgrade cancelled successfully.");
    },
    onError: (error: unknown) => {
      const e = error as any;
      toast.error(e?.response?.data?.message || "Failed to cancel downgrade.");
    },
  });
}
