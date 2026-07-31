import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillContext } from '../core/types';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    ctx: SkillContext,
    skill: string,
    method: string,
    input: any,
    success: boolean,
    error?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          actorUserId: ctx.actorUserId,
          skill,
          method,
          input: input || {},
          success,
          error: error
            ? JSON.parse(
                JSON.stringify(error, Object.getOwnPropertyNames(error)),
              )
            : null,
          idempotencyKey: ctx.idempotencyKey,
        },
      });
    } catch (err) {
      // We don't want audit log failures to crash the skill execution
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  async checkIdempotency(organizationId: string, idempotencyKey: string) {
    return this.prisma.auditLog.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey,
        },
      },
    });
  }

  async findAll(organizationId: string, query: any) {
    const {
      page = 1,
      limit = 20,
      skill,
      method,
      success,
      actorUserId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (skill) where.skill = skill;
    if (method) where.method = method;
    if (success !== undefined) where.success = success;
    if (actorUserId) where.actorUserId = actorUserId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalytics(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalStats, skillStats, timeStats] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['success'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['skill'],
        where: { organizationId },
        _count: { _all: true },
        orderBy: { _count: { skill: 'desc' } },
        take: 5,
      }),
      // For simplicity in generic Prisma without raw SQL, we can just fetch logs for the last 30 days and group them in memory
      // Or we can just get the total count for the last 24h vs previous 24h
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
          success: true,
        },
      }),
    ]);

    let successCount = 0;
    let failureCount = 0;

    totalStats.forEach((stat) => {
      if (stat.success) successCount += stat._count._all;
      else failureCount += stat._count._all;
    });

    const totalActions = successCount + failureCount;

    // Group time stats by day
    const overTime: Record<
      string,
      { date: string; success: number; failed: number }
    > = {};
    timeStats.forEach((log) => {
      const dateString = log.createdAt.toISOString().split('T')[0];
      if (!overTime[dateString]) {
        overTime[dateString] = { date: dateString, success: 0, failed: 0 };
      }
      if (log.success) {
        overTime[dateString].success++;
      } else {
        overTime[dateString].failed++;
      }
    });

    // Today vs Yesterday
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const todayActions =
      (overTime[today]?.success || 0) + (overTime[today]?.failed || 0);
    const yesterdayActions =
      (overTime[yesterday]?.success || 0) + (overTime[yesterday]?.failed || 0);

    return {
      totalActions,
      successCount,
      failureCount,
      todayActions,
      yesterdayActions,
      bySkill: skillStats.map((s) => ({
        skill: s.skill,
        count: s._count._all,
      })),
      overTime: Object.values(overTime).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }
}
