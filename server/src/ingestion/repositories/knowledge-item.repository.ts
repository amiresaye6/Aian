/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for KnowledgeItem CRUD operations.
 * Central to the ingestion pipeline — stores normalized provider data.
 */
@Injectable()
export class KnowledgeItemRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: Prisma.KnowledgeItemUncheckedCreateInput) {
    return this.prisma.knowledgeItem.create({ data });
  }

  async findById(id: string) {
    return this.prisma.knowledgeItem.findUnique({ where: { id } });
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.knowledgeItem.findUnique({ where: { idempotencyKey } });
  }

  async existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    const count = await this.prisma.knowledgeItem.count({
      where: { idempotencyKey },
    });
    return count > 0;
  }

  async findPendingByOrganization(organizationId: string, limit?: number) {
    return this.prisma.knowledgeItem.findMany({
      where: { organizationId, ingestionStatus: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async countPendingByOrganization(organizationId: string): Promise<number> {
    return this.prisma.knowledgeItem.count({
      where: { organizationId, ingestionStatus: 'pending' },
    });
  }
  async countPendingByOrganizationAndProvider(
    organizationId: string,
    provider: string,
  ): Promise<number> {
    return this.prisma.knowledgeItem.count({
      where: { organizationId, provider, ingestionStatus: 'pending' },
    });
  }

  async lockItems(itemIds: string[]) {
    return this.prisma.knowledgeItem.updateMany({
      where: { id: { in: itemIds }, ingestionStatus: 'pending' },
      data: { ingestionStatus: 'locked' },
    });
  }

  async unlockItems(itemIds: string[]) {
    return this.prisma.knowledgeItem.updateMany({
      where: { id: { in: itemIds }, ingestionStatus: 'locked' },
      data: { ingestionStatus: 'pending' },
    });
  }

  async markHandedOff(itemIds: string[]) {
    return this.prisma.knowledgeItem.updateMany({
      where: { id: { in: itemIds } },
      data: { ingestionStatus: 'handed_off' },
    });
  }

  async markAcknowledged(itemIds: string[]) {
    return this.prisma.knowledgeItem.updateMany({
      where: { id: { in: itemIds } },
      data: { ingestionStatus: 'acknowledged' },
    });
  }

  async deleteAcknowledgedOlderThan(date: Date) {
    return this.prisma.knowledgeItem.deleteMany({
      where: { ingestionStatus: 'acknowledged', createdAt: { lt: date } },
    });
  }
  async countBySourceTypeGroup(
    organizationId: string,
    provider: string,
  ): Promise<Record<string, number>> {
    const results = await this.prisma.knowledgeItem.groupBy({
      by: ['sourceType'],
      where: { organizationId, provider },
      _count: { sourceType: true },
    });
    return results.reduce((acc, r) => {
      acc[r.sourceType] = r._count.sourceType;
      return acc;
    }, {} as Record<string, number>);
  }
}
