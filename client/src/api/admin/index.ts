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
};
