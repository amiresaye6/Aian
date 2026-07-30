import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";

export function useAiUsageSummary(filters?: { fromDate?: string; toDate?: string }) {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ["aiUsageSummary", organizationId, filters],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getUsageSummary(organizationId, filters);
    },
    enabled: !!organizationId,
  });
}

export function useAiUsageLogs(
  filters?: {
    feature?: string;
    modelUsed?: string;
    fromDate?: string;
    toDate?: string;
  },
  pagination?: { page: number; limit: number },
  sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
) {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: [
      "aiUsageLogs",
      organizationId,
      filters,
      pagination?.page,
      pagination?.limit,
      sorting?.sortBy,
      sorting?.sortOrder,
    ],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getUsageLogs(organizationId, filters, pagination, sorting);
    },
    enabled: !!organizationId,
  });
}
