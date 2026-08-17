import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth/auth.store";

export const useUpdateHardCap = () => {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useMutation({
    mutationFn: (overageHardCapCents: number | null) => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.updateHardCap(organizationId, overageHardCapCents);
    },
    onSuccess: () => {
      toast.success("Overage hard cap updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["activeSubscription", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["quotaDashboard", organizationId] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 
        "Failed to update overage hard cap. Please try again."
      );
    },
  });
};
