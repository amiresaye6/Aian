import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchService } from './batch.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly batchService: BatchService,
  ) {}

  /**
   * Runs every minute to check if any organization needs a new batch created.
   * This handles the "Auto Processing" flow based on settings.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoBatching() {
    this.logger.debug('Running auto-batching check...');

    // 1. Get all organizations that have auto-processing enabled
    const activeSettings =
      await this.prisma.organizationProcessingSettings.findMany({
        where: { isAutoProcessingEnabled: true },
        select: { organizationId: true },
      });

    // 2. Process batches for each organization
    for (const setting of activeSettings) {
      await this.batchService.processOrganizationBatches(
        setting.organizationId,
        false,
      );
    }
  }

  /**
   * Runs every 5 minutes to trigger polling for connections that use polling collection method.
   * (Stub for future polling implementation)
   */
  @Cron('0 */5 * * * *')
  async handleProviderPolling() {
    this.logger.debug('Running provider polling check...');
    // In a full implementation, this would find all ProviderConnections
    // that rely on polling, check their cursor/schedule, and invoke the BaseCollectorService.
  }
}
