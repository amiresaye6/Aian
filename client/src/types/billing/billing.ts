export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  maxMembers: number;
  storageLimitMb: number;
  sortOrder: number;
  features: string[];
  tagline: string;
  limits: string;
  highlighted: boolean;
  iconName: string;
}

export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  planId: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  paymentProvider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  plan: SubscriptionPlan;
}

export interface CheckoutRequest {
  planSlug: string;
  billingCycle: BillingCycle;
  organizationId: string;
}

export interface CheckoutResponse {
  paymentUrl: string;
  paymentId: string;
  orderId: number;
}

export interface PaymentVerificationResult {
  status: PaymentStatus;
  paymentId: string;
  subscriptionId: string;
  planName: string;
  billingCycle: BillingCycle;
  amountCents: number;
  currency: string;
  paidAt: string | null;
}

export interface AiUsageLog {
  id: string;
  organizationId: string;
  feature: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  stopReason: string | null;
  budgetState: string | null;
  createdAt: string;
}

export interface AiUsageSummaryBreakdown {
  feature: string;
  modelUsed: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AiUsageSummary {
  breakdown: AiUsageSummaryBreakdown[];
  grandTotal: {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}
