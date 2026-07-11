import { useMutation } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { CheckoutRequest } from "@/types/billing/billing";

export const useCheckout = () => {
  return useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      const response = await billingApi.checkout(data);
      return response.data;
    },
  });
};
