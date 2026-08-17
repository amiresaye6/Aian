import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BillingCycle,
  PaymentStatus,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  async findActivePlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findPlanBySlug(slug: string) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { slug },
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async createSubscription(data: {
    organizationId: string;
    planId: string;
    billingCycle: BillingCycle;
    paymentProvider: string;
  }) {
    return this.prisma.subscription.create({
      data: {
        organizationId: data.organizationId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status: 'trialing',
        paymentProvider: data.paymentProvider,
      },
    });
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    updates?: {
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      planId?: string;
    },
  ) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        ...updates,
      },
    });
  }

  async findSubscriptionById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
  }

  async findSubscriptionByOrganizationId(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  async createPayment(data: {
    organizationId: string;
    subscriptionId: string;
    paymentProvider: string;
    providerPaymentId: string;
    amountCents: number;
    currency: string;
    billingCycle: BillingCycle;
  }) {
    return this.prisma.payment.create({
      data: {
        ...data,
        status: 'pending',
      },
    });
  }

  async updatePaymentStatus(
    providerPaymentId: string,
    status: PaymentStatus,
    providerPayload?: Prisma.InputJsonValue,
  ) {
    return this.prisma.payment.update({
      where: { providerPaymentId },
      data: {
        status,
        ...(status === 'paid' && { paidAt: new Date() }),
        ...(providerPayload && { providerPayload }),
      },
    });
  }

  async findPaymentByProviderPaymentId(providerPaymentId: string) {
    return this.prisma.payment.findUnique({
      where: { providerPaymentId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  // ─── Organization ──────────────────────────────────────────────────────────

  async updateOrganizationStatus(
    organizationId: string,
    status: 'pending_connections' | 'active' | 'suspended',
  ) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { status },
    });
  }

  // ─── Plan Lookup ───────────────────────────────────────────────────────────

  async findPlanById(id: string) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
  }

  // ─── Ledger ────────────────────────────────────────────────────────────────

  async createLedgerEvent(data: {
    organizationId: string;
    type: import('@prisma/client').LedgerEventType;
    oldPlanId?: string;
    newPlanId?: string;
    amountCents?: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
    triggeredBy?: string;
    paymentId?: string;
  }) {
    return this.prisma.ledgerEvent.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        oldPlanId: data.oldPlanId,
        newPlanId: data.newPlanId,
        amountCents: data.amountCents,
        currency: data.currency,
        description: data.description,
        metadata: data.metadata ?? {},
        triggeredBy: data.triggeredBy,
        paymentId: data.paymentId,
      },
    });
  }

  // ─── Scheduled Downgrades ──────────────────────────────────────────────────

  async setScheduledDowngrade(
    subscriptionId: string,
    targetPlanId: string,
  ) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { pendingDowngradePlanId: targetPlanId },
    });
  }

  async clearScheduledDowngrade(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { pendingDowngradePlanId: null },
    });
  }

  // ─── Grace Period ──────────────────────────────────────────────────────────

  async setGracePeriod(
    subscriptionId: string,
    gracePeriodEnd: Date,
  ) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'past_due',
        gracePeriodEnd,
      },
    });
  }

  async clearGracePeriod(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        gracePeriodEnd: null,
      },
    });
  }

  // ─── Enhanced Payment Creation ─────────────────────────────────────────────

  async createPaymentWithType(data: {
    organizationId: string;
    subscriptionId: string;
    paymentProvider: string;
    providerPaymentId: string;
    amountCents: number;
    currency: string;
    billingCycle: BillingCycle;
    type: import('@prisma/client').PaymentType;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.payment.create({
      data: {
        organizationId: data.organizationId,
        subscriptionId: data.subscriptionId,
        paymentProvider: data.paymentProvider,
        providerPaymentId: data.providerPaymentId,
        amountCents: data.amountCents,
        currency: data.currency,
        billingCycle: data.billingCycle,
        status: 'pending',
        type: data.type,
        metadata: data.metadata ?? {},
      },
    });
  }

  async findPaymentById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  // ─── Subscription Queries ──────────────────────────────────────────────────

  async findSubscriptionsDueForRenewal(now: Date) {
    return this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { lte: now },
        gracePeriodEnd: null,
      },
      include: { plan: true },
    });
  }

  async findSubscriptionsInExpiredGracePeriod(now: Date) {
    return this.prisma.subscription.findMany({
      where: {
        status: 'past_due',
        gracePeriodEnd: { lte: now },
      },
      include: { plan: true },
    });
  }

  async findSubscriptionsWithPendingDowngrade() {
    return this.prisma.subscription.findMany({
      where: {
        pendingDowngradePlanId: { not: null },
        currentPeriodEnd: { lte: new Date() },
      },
      include: { plan: true },
    });
  }
  // ─── Hard Cap ──────────────────────────────────────────────────────────────

  async updateHardCap(organizationId: string, overageHardCapCents: number | null) {
    const activeSub = await this.findSubscriptionByOrganizationId(organizationId);
    if (!activeSub) return null;

    return this.prisma.subscription.update({
      where: { id: activeSub.id },
      data: { overageHardCapCents },
    });
  }
}
