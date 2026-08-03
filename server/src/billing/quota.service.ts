import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaStatus } from '@prisma/client';

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  percentage: number;
  status: QuotaStatus;
}

export interface FullQuotaSummary {
  tokens: QuotaResult;
  storage: QuotaResult;
  members: QuotaResult;
  periodStart: Date | null;
  periodEnd: Date | null;
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to determine quota status based on percentage
   */
  private determineStatus(percentage: number): QuotaStatus {
    if (percentage >= 110) return QuotaStatus.hard_blocked;
    if (percentage >= 100) return QuotaStatus.grace_period;
    if (percentage >= 80) return QuotaStatus.warning;
    return QuotaStatus.within_limits;
  }

  /**
   * Helper to get active subscription limits
   */
  private async getOrgLimits(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      // Default fallback if no subscription is found (shouldn't happen in normal flow)
      return null;
    }
    return subscription;
  }

  async checkTokenQuota(organizationId: string): Promise<QuotaResult> {
    const sub = await this.getOrgLimits(organizationId);
    if (!sub) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        percentage: 100,
        status: QuotaStatus.hard_blocked,
      };
    }

    const { currentPeriodStart, currentPeriodEnd, plan } = sub;
    const limit = plan.aiTokenLimit;

    // Get current usage for the billing period
    const usage = await this.prisma.aiUsageLog.aggregate({
      where: {
        organizationId,
        ...(currentPeriodStart && currentPeriodEnd
          ? {
              createdAt: {
                gte: currentPeriodStart,
                lte: currentPeriodEnd,
              },
            }
          : {}),
      },
      _sum: {
        totalTokens: true,
      },
    });

    const used = BigInt(usage._sum.totalTokens || 0);
    const percentage =
      Number((used * 10000n) / (limit > 0n ? limit : 1n)) / 100;
    const status = this.determineStatus(percentage);

    return {
      allowed: status !== QuotaStatus.hard_blocked,
      used: Number(used),
      limit: Number(limit),
      percentage,
      status,
    };
  }

  async checkStorageQuota(organizationId: string): Promise<QuotaResult> {
    const sub = await this.getOrgLimits(organizationId);
    if (!sub) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        percentage: 100,
        status: QuotaStatus.hard_blocked,
      };
    }

    const limitMb = sub.plan.storageLimitMb;

    // 1. Artifacts storage
    const artifactsResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT SUM(LENGTH(content)) as total 
      FROM knowledge_artifacts 
      WHERE organization_id = ${organizationId}
    `;

    // 2. Knowledge Items storage
    const itemsResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT SUM(LENGTH(content)) as total 
      FROM knowledge_items 
      WHERE organization_id = ${organizationId}
    `;

    const artifactsBytes = artifactsResult[0]?.total
      ? Number(artifactsResult[0].total)
      : 0;
    const itemsBytes = itemsResult[0]?.total ? Number(itemsResult[0].total) : 0;

    const totalBytes = artifactsBytes + itemsBytes;
    const usedMb = totalBytes / (1024 * 1024);

    const percentage = limitMb > 0 ? (usedMb / limitMb) * 100 : 100;
    const status = this.determineStatus(percentage);

    return {
      allowed: status !== QuotaStatus.hard_blocked,
      used: usedMb,
      limit: limitMb,
      percentage,
      status,
    };
  }

  async checkMemberQuota(organizationId: string): Promise<QuotaResult> {
    const sub = await this.getOrgLimits(organizationId);
    if (!sub) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        percentage: 100,
        status: QuotaStatus.hard_blocked,
      };
    }

    const limit = sub.plan.maxMembers;

    const used = await this.prisma.user.count({
      where: {
        organizationId,
        memberStatus: 'active',
      },
    });

    const percentage = limit > 0 ? (used / limit) * 100 : 100;
    const status = this.determineStatus(percentage);

    return {
      allowed: status !== QuotaStatus.hard_blocked,
      used,
      limit,
      percentage,
      status,
    };
  }

  async getQuotaDashboard(organizationId: string): Promise<FullQuotaSummary> {
    const [tokens, storage, members, sub] = await Promise.all([
      this.checkTokenQuota(organizationId),
      this.checkStorageQuota(organizationId),
      this.checkMemberQuota(organizationId),
      this.getOrgLimits(organizationId),
    ]);

    return {
      tokens,
      storage,
      members,
      periodStart: sub?.currentPeriodStart || null,
      periodEnd: sub?.currentPeriodEnd || null,
    };
  }

  async calculateOverages(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const sub = await this.getOrgLimits(organizationId);
    if (!sub) return null;

    const { plan } = sub;
    const tokenLimit = plan.aiTokenLimit;
    const storageLimitMb = plan.storageLimitMb;
    const memberLimit = plan.maxMembers;

    // Tokens
    const tokenUsage = await this.prisma.aiUsageLog.aggregate({
      where: {
        organizationId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalTokens: true },
    });
    const totalTokensUsed = BigInt(tokenUsage._sum.totalTokens || 0);
    const overageTokens =
      totalTokensUsed > tokenLimit ? totalTokensUsed - tokenLimit : 0n;

    // Per 10M tokens overage pricing
    const tokenBlocks = Number(overageTokens) / 10_000_000;
    const overageTokenCostCents = Math.ceil(
      tokenBlocks * plan.overageTokenPriceCents,
    );

    // Storage
    const artifactsResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT SUM(LENGTH(content)) as total 
      FROM knowledge_artifacts 
      WHERE organization_id = ${organizationId} AND created_at <= ${periodEnd}
    `;
    const itemsResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT SUM(LENGTH(content)) as total 
      FROM knowledge_items 
      WHERE organization_id = ${organizationId} AND created_at <= ${periodEnd}
    `;

    const artifactsBytes = artifactsResult[0]?.total
      ? Number(artifactsResult[0].total)
      : 0;
    const itemsBytes = itemsResult[0]?.total ? Number(itemsResult[0].total) : 0;
    const totalStorageMb = Math.ceil(
      (artifactsBytes + itemsBytes) / (1024 * 1024),
    );
    const overageStorageMb =
      totalStorageMb > storageLimitMb ? totalStorageMb - storageLimitMb : 0;
    const storageBlocks = overageStorageMb / 1024; // Per GB
    const overageStorageCostCents = Math.ceil(
      storageBlocks * plan.overageStoragePriceCents,
    );

    // Members
    const totalMembers = await this.prisma.user.count({
      where: {
        organizationId,
        memberStatus: 'active',
        joinedAt: { lte: periodEnd },
      },
    });
    const overageUsers =
      totalMembers > memberLimit ? totalMembers - memberLimit : 0;
    const overageUserCostCents = overageUsers * plan.overageUserPriceCents;

    const overageTotalCents =
      overageTokenCostCents + overageStorageCostCents + overageUserCostCents;

    return {
      periodStart,
      periodEnd,
      totalTokensUsed: Number(totalTokensUsed),
      totalStorageMb,
      totalMembers,
      overageTokens: Number(overageTokens),
      overageStorageMb,
      overageUsers,
      overageTotalCents,
      tokenCostCents: overageTokenCostCents,
      storageCostCents: overageStorageCostCents,
      userCostCents: overageUserCostCents,
    };
  }
}
