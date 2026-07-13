import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Repository for IngestionBatch lifecycle management.
 * Handles batch creation, locking, handoff, and failure states.
 */
@Injectable()
export class IngestionBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, triggerType: string) {
    return this.prisma.ingestionBatch.create({
      data: { organizationId, triggerType },
    });
  }

  async findById(id: string) {
    return this.prisma.ingestionBatch.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async findByOrganization(
    organizationId: string,
    options?: { take?: number },
  ) {
    return this.prisma.ingestionBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: options?.take ?? 20,
    });
  }

  async addItems(batchId: string, knowledgeItemIds: string[]) {
    const data = knowledgeItemIds.map((knowledgeItemId) => ({
      batchId,
      knowledgeItemId,
    }));
    await this.prisma.ingestionBatchItem.createMany({ data });
    await this.prisma.ingestionBatch.update({
      where: { id: batchId },
      data: { itemCount: knowledgeItemIds.length },
    });
  }

  async markLocked(batchId: string) {
    return this.prisma.ingestionBatch.update({
      where: { id: batchId },
      data: { status: 'locked', lockedAt: new Date() },
    });
  }

  async markHandedOff(batchId: string) {
    return this.prisma.ingestionBatch.update({
      where: { id: batchId },
      data: { status: 'handed_off', handedOffAt: new Date() },
    });
  }

  async markAcknowledged(batchId: string) {
    return this.prisma.ingestionBatch.update({
      where: { id: batchId },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
  }

  async markFailed(batchId: string, errorMessage: string) {
    return this.prisma.ingestionBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorMessage,
        retryCount: { increment: 1 },
      },
    });
  }

  async getItemIds(batchId: string): Promise<string[]> {
    const items = await this.prisma.ingestionBatchItem.findMany({
      where: { batchId },
      select: { knowledgeItemId: true },
    });
    return items.map((i) => i.knowledgeItemId);
  }
}
