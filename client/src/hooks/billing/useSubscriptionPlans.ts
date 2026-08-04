import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await billingApi.getPlans();
      return res.data;
    },
  });
};
