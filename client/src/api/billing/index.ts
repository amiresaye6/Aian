import api from "../axios";
import {
  SubscriptionPlan,
  CheckoutRequest,
  CheckoutResponse,
  PaymentVerificationResult,
} from "@/types/billing/billing";

export const billingApi = {
  getPlans: async (): Promise<{ success: boolean; data: SubscriptionPlan[] }> => {
    const response = await api.get("/billing/plans");
    return response.data;
  },

  getPlanBySlug: async (
    slug: string
  ): Promise<{ success: boolean; data: SubscriptionPlan }> => {
    const response = await api.get(`/billing/plans/${slug}`);
    return response.data;
  },

  checkout: async (
    data: CheckoutRequest
  ): Promise<{ success: boolean; data: CheckoutResponse }> => {
    const response = await api.post("/billing/checkout", data);
    return response.data;
  },

  verifyPayment: async (
    providerPaymentId: string
  ): Promise<{ success: boolean; data: PaymentVerificationResult }> => {
    const response = await api.get(`/billing/verify/${providerPaymentId}`);
    return response.data;
  },
};
