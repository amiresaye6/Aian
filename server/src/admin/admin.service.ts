import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        subscriptions: {
          include: { plan: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganizationDetails(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
        },
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            memberStatus: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async getRevenueMetrics() {
    // Basic revenue metrics based on active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });

    let mrrCents = 0;
    let arrCents = 0;

    for (const sub of activeSubscriptions) {
      if (sub.billingCycle === 'monthly') {
        mrrCents += sub.plan.monthlyPriceCents;
        arrCents += sub.plan.monthlyPriceCents * 12;
      } else {
        mrrCents += Math.floor(sub.plan.yearlyPriceCents / 12);
        arrCents += sub.plan.yearlyPriceCents;
      }
    }

    return {
      mrrUsd: mrrCents / 100,
      arrUsd: arrCents / 100,
      activeSubscribers: activeSubscriptions.length,
    };
  }

  async getAlerts() {
    // Find all active subscriptions and their usage period snapshots
    // Since calculating real-time for ALL orgs is too heavy, we will just look at the latest snapshot overages
    // Or we could run raw sql to find orgs approaching limits

    // For MVP, we will just fetch the latest usage snapshots that have overages > 0
    const snapshotsWithOverage = await this.prisma.usagePeriodSnapshot.findMany(
      {
        where: {
          overageTotalCents: { gt: 0 },
        },
        include: {
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    );

    return snapshotsWithOverage;
  }

  async updateOrganizationStatus(
    id: string,
    status: 'pending_connections' | 'active' | 'suspended',
  ) {
    return this.prisma.organization.update({
      where: { id },
      data: { status },
    });
  }

  // ─── Transactions (Global) ─────────────────────────────────────────────────

  async getAllTransactionsLogs(
    filters: { fromDate?: string; toDate?: string; status?: string; type?: string },
    pagination: { page?: number; limit?: number },
    sort: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    const { fromDate, toDate, status, type } = filters;
    const { page = 1, limit = 10 } = pagination;
    const { sortBy = 'createdAt', sortOrder = 'desc' } = sort;

    const where: any = {};

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
          organization: {
            select: {
              name: true
            }
          }
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

  async getAllTransactionsSummary(
    filters: { fromDate?: string; toDate?: string }
  ) {
    const { fromDate, toDate } = filters;
    const where: any = {};

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

    const summary = {
      successfulPayments: 0,
      totalVolumeCents: 0,
      failedPayments: 0,
      pendingPayments: 0,
    };

    aggregations.forEach(agg => {
      if (agg.status === 'paid') {
        summary.successfulPayments += agg._count.id;
        summary.totalVolumeCents += agg._sum.amountCents || 0;
      } else if (agg.status === 'failed') {
        summary.failedPayments += agg._count.id;
      } else if (agg.status === 'pending') {
        summary.pendingPayments += agg._count.id;
      }
    });

    return summary;
  }
}
