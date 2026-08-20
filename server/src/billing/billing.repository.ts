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
    subscriptionId?: string | null;
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

  // ─── Transactions / Payments ───────────────────────────────────────────────

  async getTransactionsLogs(
    organizationId: string,
    filters: { fromDate?: string; toDate?: string; status?: string; type?: string },
    pagination: { page?: number; limit?: number },
    sort: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    const { fromDate, toDate, status, type } = filters;
    const { page = 1, limit = 10 } = pagination;
    const { sortBy = 'createdAt', sortOrder = 'desc' } = sort;

    const where: any = { organizationId };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          organizationId: true,
          subscriptionId: true,
          paymentProvider: true,
          providerPaymentId: true,
          amountCents: true,
          currency: true,
          billingCycle: true,
          status: true,
          paidAt: true,
          failureReason: true,
          invoiceId: true,
          type: true,
          createdAt: true,
        }
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getTransactionsSummary(
    organizationId: string,
    filters: { fromDate?: string; toDate?: string }
  ) {
    const { fromDate, toDate } = filters;
    const where: any = { organizationId };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const aggregations = await this.prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amountCents: true,
      }
    });

    return aggregations;
  }
}
