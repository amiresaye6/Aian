import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";

export const useSubscriptionPlan = (slug: string) => {
  return useQuery({
    queryKey: ["subscription-plan", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Plan slug is required");
      const response = await billingApi.getPlanBySlug(slug);
      return response.data;
    },
    enabled: !!slug,
  });
};
