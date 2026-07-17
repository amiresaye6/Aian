import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for ProviderResourceSelection CRUD operations.
 * Used to manage which channels/repos/projects an org monitors.
 */
@Injectable()
export class ProviderResourceSelectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByConnectionId(connectionId: string) {
    return this.prisma.providerResourceSelection.findMany({
      where: { connectionId },
    });
  }

  async findSelectedByConnectionId(connectionId: string) {
    return this.prisma.providerResourceSelection.findMany({
      where: { connectionId, isSelected: true, isActive: true },
    });
  }

  async upsert(
    connectionId: string,
    externalResourceId: string,
    data: Omit<
      Prisma.ProviderResourceSelectionUncheckedCreateInput,
      'connectionId' | 'externalResourceId'
    >,
  ) {
    return this.prisma.providerResourceSelection.upsert({
      where: {
        connectionId_externalResourceId: { connectionId, externalResourceId },
      },
      create: { connectionId, externalResourceId, ...data },
      update: data,
    });
  }

  async updateSelection(connectionId: string, externalResourceIds: string[]) {
    // Deselect all first
    await this.prisma.providerResourceSelection.updateMany({
      where: { connectionId },
      data: { isSelected: false },
    });
    // Select the chosen ones
    if (externalResourceIds.length > 0) {
      await this.prisma.providerResourceSelection.updateMany({
        where: {
          connectionId,
          externalResourceId: { in: externalResourceIds },
        },
        data: { isSelected: true },
      });
    }
  }

  async deselectAll(connectionId: string) {
    return this.prisma.providerResourceSelection.updateMany({
      where: { connectionId },
      data: { isSelected: false },
    });
  }

  async deleteByConnectionId(connectionId: string) {
    return this.prisma.providerResourceSelection.deleteMany({
      where: { connectionId },
    });
  }
}
