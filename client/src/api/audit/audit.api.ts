import { api } from "@/api/axios";
import { AuditAnalytics, PaginatedAuditResponse } from "@/types/audit";

export const auditApi = {
  getAuditLogs: async (params: {
    page?: number;
    limit?: number;
    skill?: string;
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedAuditResponse> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.skill && params.skill !== "All") searchParams.append("skill", params.skill);
    if (params.success !== undefined) searchParams.append("success", params.success.toString());
    if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.append("dateTo", params.dateTo);

    const response = await api.get<PaginatedAuditResponse>(`/audit-logs?${searchParams.toString()}`);
    return (response.data as any).success ? (response.data as any).data : response.data;
  },

  getAnalytics: async (): Promise<AuditAnalytics> => {
    const response = await api.get<{ success: boolean; data: AuditAnalytics }>("/audit-logs/analytics");
    return response.data.data;
  },
};
