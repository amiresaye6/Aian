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
  FullQuotaSummary,
  TransactionLog,
  TransactionSummary,
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

  updateHardCap: async (
    organizationId: string,
    overageHardCapCents: number | null
  ): Promise<{ success: boolean }> => {
    const response = await api.put(`/billing/subscription/hard-cap?organizationId=${organizationId}`, {
      overageHardCapCents,
    });
    return response.data;
  },

  getQuotaDashboard: async (
    organizationId: string
  ): Promise<{ success: boolean; data: FullQuotaSummary }> => {
    const response = await api.get(`/billing/quota-dashboard?organizationId=${organizationId}`);
    return response.data;
  },

  upgradeSubscription: async (
    organizationId: string,
    planSlug: string
  ): Promise<{ 
    success: boolean; 
    paymentUrl?: string; 
    paymentId?: string; 
    orderId?: string | number; 
    proratedAmountCents?: number; 
    newPlan: string;
    appliedImmediately?: boolean;
  }> => {
    const response = await api.post(`/billing/subscription/upgrade?organizationId=${organizationId}`, {
      planSlug,
    });
    return response.data;
  },

  schedulePlanDowngrade: async (
    organizationId: string,
    planSlug: string
  ): Promise<{
    success: boolean;
    message: string;
    effectiveDate: string;
    currentPlan: string;
    targetPlan: string;
  }> => {
    const response = await api.post(`/billing/subscription/downgrade?organizationId=${organizationId}`, {
      planSlug,
    });
    return response.data;
  },

  cancelScheduledDowngrade: async (
    organizationId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/billing/subscription/downgrade?organizationId=${organizationId}`);
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

  getTransactionsSummary: async (
    organizationId: string,
    filters?: { fromDate?: string; toDate?: string }
  ): Promise<{ success: boolean; data: TransactionSummary }> => {
    const params = new URLSearchParams({ organizationId });
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    
    const response = await api.get(`/billing/transactions/summary?${params.toString()}`);
    return response.data;
  },

  getTransactionsLogs: async (
    organizationId: string,
    filters?: {
      status?: string;
      type?: string;
      fromDate?: string;
      toDate?: string;
    },
    pagination?: { page?: number; limit?: number },
    sorting?: { sortBy?: string; sortOrder?: "asc" | "desc" }
  ): Promise<{ success: boolean; data: PaginatedResponse<TransactionLog> }> => {
    const params = new URLSearchParams({ organizationId });
    
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    
    if (sorting?.sortBy) params.append("sortBy", sorting.sortBy);
    if (sorting?.sortOrder) params.append("sortOrder", sorting.sortOrder);

    const response = await api.get(`/billing/transactions/logs?${params.toString()}`);
    return response.data;
  },
};
