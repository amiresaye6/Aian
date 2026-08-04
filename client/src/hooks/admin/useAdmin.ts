import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: async () => adminApi.getOrganizations(),
  });
}

export function useAdminOrganizationDetails(id: string) {
  return useQuery({
    queryKey: ["admin", "organization", id],
    queryFn: async () => adminApi.getOrganizationDetails(id),
    enabled: !!id,
  });
}

export function useAdminUpdateOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending_connections" | "active" | "suspended" }) => 
      adminApi.updateOrganizationStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "organization", variables.id] });
    },
  });
}

export function useAdminRevenueMetrics() {
  return useQuery({
    queryKey: ["admin", "revenue"],
    queryFn: async () => adminApi.getRevenueMetrics(),
  });
}

export function useAdminAlerts() {
  return useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: async () => adminApi.getAlerts(),
  });
}
