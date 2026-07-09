import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for KnowledgeItem CRUD operations.
 * Central to the ingestion pipeline — stores normalized provider data.
 */
@Injectable()
export class KnowledgeItemRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
