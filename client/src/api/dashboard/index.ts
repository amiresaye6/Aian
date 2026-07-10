import { api } from "@/api/axios";
import { DashboardOwnerData } from "@/types/dashboard";

export async function getOwnerDashboard(): Promise<DashboardOwnerData> {
  const response = await api.get<{ success: boolean; data: DashboardOwnerData }>(
    "/dashboard/owner"
  );
  return response.data.data;
}