import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectionMethod, CollectionRunStatus } from '@prisma/client';

/**
 * Repository for CollectionRun records.
 * Logs every collection attempt with statistics and error details.
 */
@Injectable()
export class CollectionRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationEyeId: string;
    connectionId?: string;
    eyeType: string;
    provider: string;
    collectionMethod: CollectionMethod;
    metadata?: any;
  }) {
    return this.prisma.collectionRun.create({ data });
  }

  async updateProgress(
    id: string,
    stats: { itemsFetched: number; itemsStored: number; itemsIgnored: number },
    metadata: any,
  ) {
    return this.prisma.collectionRun.update({
      where: { id },
      data: {
        ...stats,
        metadata,
      },
    });
  }

  async markCompleted(
    id: string,
    stats: { itemsFetched: number; itemsStored: number; itemsIgnored: number },
  ) {
    return this.prisma.collectionRun.update({
      where: { id },
      data: {
        status: 'completed' as CollectionRunStatus,
        finishedAt: new Date(),
        ...stats,
      },
    });
  }

  async markFailed(id: string, errorCode: string, errorMessage: string) {
    return this.prisma.collectionRun.update({
      where: { id },
      data: {
        status: 'failed' as CollectionRunStatus,
        finishedAt: new Date(),
        errorCode,
        errorMessage,
      },
    });
  }

  async findByOrganizationEyeId(
    organizationEyeId: string,
    options?: { take?: number },
  ) {
    return this.prisma.collectionRun.findMany({
      where: { organizationEyeId },
      orderBy: { createdAt: 'desc' },
      take: options?.take ?? 20,
    });
  }

  async findLatestByOrganizationEyeId(organizationEyeId: string) {
    return this.prisma.collectionRun.findFirst({
      where: { organizationEyeId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
