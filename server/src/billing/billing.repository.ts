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
    periodData?: {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    },
  ) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        ...(periodData && {
          currentPeriodStart: periodData.currentPeriodStart,
          currentPeriodEnd: periodData.currentPeriodEnd,
        }),
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
}
