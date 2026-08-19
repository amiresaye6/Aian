import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuth } from "@/context/AuthContext";

export function useTransactionsSummary(filters?: { fromDate?: string; toDate?: string }) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["transactions-summary", organization?.id, filters],
    queryFn: () => {
      if (!organization?.id) throw new Error("Organization ID is required");
      return billingApi.getTransactionsSummary(organization.id, filters);
    },
    enabled: !!organization?.id,
  });
}

export function useTransactionsLogs(
  filters?: { status?: string; type?: string; fromDate?: string; toDate?: string },
  pagination?: { page?: number; limit?: number },
  sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["transactions-logs", organization?.id, filters, pagination, sorting],
    queryFn: () => {
      if (!organization?.id) throw new Error("Organization ID is required");
      return billingApi.getTransactionsLogs(organization.id, filters, pagination, sorting);
    },
    enabled: !!organization?.id,
    placeholderData: keepPreviousData,
  });
}
