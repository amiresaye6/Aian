import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";

export function useAdminTransactionsSummary(filters?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: ["admin-transactions-summary", filters],
    queryFn: () => adminApi.getAllTransactionsSummary(filters),
  });
}

export function useAdminTransactionsLogs(
  filters?: { status?: string; type?: string; fromDate?: string; toDate?: string },
  pagination?: { page?: number; limit?: number },
  sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
) {
  return useQuery({
    queryKey: ["admin-transactions-logs", filters, pagination, sorting],
    queryFn: () => adminApi.getAllTransactionsLogs(filters, pagination, sorting),
    placeholderData: keepPreviousData,
  });
}
