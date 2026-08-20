import type {
  BillingCycle,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

// ─── Plan Response ───────────────────────────────────────────────────────────

export interface PlanResponse {
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

// ─── Subscription Response ───────────────────────────────────────────────────

export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  planId: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  paymentProvider: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  pendingDowngradePlanId: string | null;
  gracePeriodEnd: Date | null;
  overageHardCapCents: number | null;
  plan: PlanResponse;
}

// ─── Payment Response ────────────────────────────────────────────────────────

export interface PaymentResponse {
  id: string;
  organizationId: string;
  subscriptionId: string;
  paymentProvider: string;
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  billingCycle: BillingCycle;
  status: PaymentStatus;
  paidAt: Date | null;
}

// ─── Checkout Result ─────────────────────────────────────────────────────────

export interface CheckoutResult {
  paymentUrl: string;
  paymentId: string;
  orderId: string | number;
}

// ─── Payment Verification ────────────────────────────────────────────────────

export interface PaymentVerificationResult {
  status: PaymentStatus;
  paymentId: string;
  subscriptionId: string | null;
  planName: string;
  billingCycle: BillingCycle;
  amountCents: number;
  currency: string;
  paidAt: Date | null;
}

// ─── Quota Types ─────────────────────────────────────────────────────────────

export interface QuotaStatusResponse {
  status: 'ok' | 'warning' | 'exceeded';
  used: number;
  limit: number;
  percentage: number;
}

export interface FullQuotaSummary {
  tokens: QuotaStatusResponse;
  storage: QuotaStatusResponse;
  members: QuotaStatusResponse;
}
