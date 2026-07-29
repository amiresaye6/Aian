import api from "../axios";
import {
  SubscriptionPlan,
  SubscriptionResponse,
  CheckoutRequest,
  CheckoutResponse,
  PaymentVerificationResult,
  AiUsageSummary,
  AiUsageLog,
  PaginatedResponse,
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

  getActiveSubscription: async (
    organizationId: string
  ): Promise<{ success: boolean; data: SubscriptionResponse | null }> => {
    const response = await api.get(`/billing/subscription?organizationId=${organizationId}`);
    return response.data;
  },

  getUsageSummary: async (
    organizationId: string,
    filters?: { fromDate?: string; toDate?: string }
  ): Promise<{ success: boolean; data: AiUsageSummary }> => {
    const params = new URLSearchParams({ organizationId });
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    
    const response = await api.get(`/billing/usage/summary?${params.toString()}`);
    return response.data;
  },

  getUsageLogs: async (
    organizationId: string,
    filters?: {
      feature?: string;
      modelUsed?: string;
      fromDate?: string;
      toDate?: string;
    },
    pagination?: { page?: number; limit?: number },
    sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
  ): Promise<{ success: boolean; data: PaginatedResponse<AiUsageLog> }> => {
    const params = new URLSearchParams({ organizationId });
    
    if (filters?.feature) params.append("feature", filters.feature);
    if (filters?.modelUsed) params.append("modelUsed", filters.modelUsed);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    
    if (sorting?.sortBy) params.append("sortBy", sorting.sortBy);
    if (sorting?.sortOrder) params.append("sortOrder", sorting.sortOrder);

    const response = await api.get(`/billing/usage/logs?${params.toString()}`);
    return response.data;
  },
};
