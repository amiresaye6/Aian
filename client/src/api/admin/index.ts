import api from "../axios";

export const adminApi = {
  getOrganizations: async () => {
    const response = await api.get("/admin/organizations");
    return response.data;
  },
  
  getOrganizationDetails: async (id: string) => {
    const response = await api.get(`/admin/organizations/${id}`);
    return response.data;
  },
  
  updateOrganizationStatus: async (id: string, status: "pending_connections" | "active" | "suspended") => {
    const response = await api.patch(`/admin/organizations/${id}/status`, { status });
    return response.data;
  },

  getRevenueMetrics: async () => {
    const response = await api.get("/admin/revenue");
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get("/admin/alerts");
    return response.data;
  },

  getAllTransactionsSummary: async (filters?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);

    const response = await api.get(`/admin/transactions/summary?${params.toString()}`);
    return response.data;
  },

  getAllTransactionsLogs: async (
    filters?: { status?: string; type?: string; fromDate?: string; toDate?: string },
    pagination?: { page?: number; limit?: number },
    sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
  ) => {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    
    if (sorting?.sortBy) params.append("sortBy", sorting.sortBy);
    if (sorting?.sortOrder) params.append("sortOrder", sorting.sortOrder);

    const response = await api.get(`/admin/transactions/logs?${params.toString()}`);
    return response.data;
  },
};
