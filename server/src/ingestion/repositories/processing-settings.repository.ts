import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Repository for OrganizationProcessingSettings.
 * Manages scheduler trigger configuration per organization.
 */
@Injectable()
export class ProcessingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrganizationId(organizationId: string) {
    return this.prisma.organizationProcessingSettings.findUnique({
      where: { organizationId },
    });
  }

  async upsert(
    organizationId: string,
    data: {
      timeIntervalHours?: number;
      pendingItemThreshold?: number;
      retentionDays?: number;
      isAutoProcessingEnabled?: boolean;
    },
  ) {
    return this.prisma.organizationProcessingSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }
}
