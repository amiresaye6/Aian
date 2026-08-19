import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/store/auth/auth.store";

export function useTransactionsSummary(filters?: { fromDate?: string; toDate?: string }) {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ["transactions-summary", organizationId, filters],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getTransactionsSummary(organizationId, filters);
    },
    enabled: !!organizationId,
  });
}

export function useTransactionsLogs(
  filters?: { status?: string; type?: string; fromDate?: string; toDate?: string },
  pagination?: { page?: number; limit?: number },
  sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
) {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  return useQuery({
    queryKey: ["transactions-logs", organizationId, filters, pagination, sorting],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization ID is required");
      return billingApi.getTransactionsLogs(organizationId, filters, pagination, sorting);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}
