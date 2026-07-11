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
