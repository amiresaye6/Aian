import { useQuery } from "@tanstack/react-query";
import { getOwnerDashboard } from "@/api/dashboard";

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ["dashboard", "owner"],
    queryFn: getOwnerDashboard,
  });
}