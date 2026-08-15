import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsage } from './providers/ai-provider.interface';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs AI usage to the database asynchronously.
   * If organizationId is not available (e.g. background job without context), it can be skipped or logged to a system account.
   */
  async logUsage(
    organizationId: string,
    feature: string,
    modelUsed: string,
    usage: AiUsage,
  ): Promise<void> {
    if (!organizationId) {
      this.logger.warn(
        `Missing organizationId, skipping usage log for feature: ${feature}`,
      );
      return;
    }

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          organizationId,
          feature,
          modelUsed,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          costUsd: usage.costUsd,
          stopReason: usage.stopReason,
          budgetState: usage.budgetState,
        },
      });
      this.logger.debug(
        `Logged AI usage for org ${organizationId} on feature ${feature}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log AI usage: ${error.message}`);
    }
  }

  /**
   * Retrieves paginated AI usage logs with advanced filtering and sorting.
   */
  async getUsageLogs(
    organizationId: string,
    filters?: {
      feature?: string;
      modelUsed?: string;
      fromDate?: string;
      toDate?: string;
    },
    pagination?: { page?: number; limit?: number },
    sorting?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ) {
    const page = pagination?.page ? Math.max(1, pagination.page) : 1;
    const limit = pagination?.limit
      ? Math.min(100, Math.max(1, pagination.limit))
      : 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (filters?.feature) {
      where.feature = filters.feature;
    }
    if (filters?.modelUsed) {
      where.modelUsed = filters.modelUsed;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters?.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const orderBy: any = {};
    if (sorting?.sortBy) {
      orderBy[sorting.sortBy] = sorting.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [logs, total] = await Promise.all([
      this.prisma.aiUsageLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.aiUsageLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves an aggregated summary of AI usage grouped by feature and model.
   */
  async getUsageSummary(
    organizationId: string,
    filters?: { fromDate?: string; toDate?: string },
  ) {
    const where: any = { organizationId };

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters?.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    // Prisma groupBy allows us to aggregate efficiently at the DB level
    const summary = await this.prisma.aiUsageLog.groupBy({
      by: ['feature', 'modelUsed'],
      where,
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true, // total calls
      },
      orderBy: {
        feature: 'asc',
      },
    });

    // Also get the grand total
    const grandTotal = await this.prisma.aiUsageLog.aggregate({
      where,
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      breakdown: summary.map((item) => ({
        feature: item.feature,
        modelUsed: item.modelUsed,
        totalCalls: item._count.id,
        totalTokens: item._sum.totalTokens || 0,
        inputTokens: item._sum.inputTokens || 0,
        outputTokens: item._sum.outputTokens || 0,
      })),
      grandTotal: {
        totalCalls: grandTotal._count.id,
        totalTokens: grandTotal._sum.totalTokens || 0,
        inputTokens: grandTotal._sum.inputTokens || 0,
        outputTokens: grandTotal._sum.outputTokens || 0,
      },
    };
  }
}
