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
}
