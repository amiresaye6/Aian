import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchService } from './batch.service';
import { EntityResolutionService } from '../../resolution/resolution.service';
import { GraphUpdateService } from '../../graph/graph-update.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly batchService: BatchService,
    private readonly resolutionService: EntityResolutionService,
    private readonly graphUpdateService: GraphUpdateService,
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

  /**
   * Stage 3 safety net: runs every 5 minutes.
   *
   * Finds any KnowledgeArtifact where extraction completed but resolution
   * was never triggered (e.g. due to a server restart between Stage 2 and the
   * setImmediate firing). Re-dispatches Stage 3 for each orphan.
   */
  @Cron('30 */5 * * * *')
  async handleResolutionSafetyNet() {
    await this.resolutionService.resolveOrphanedArtifacts();
  }

  /**
   * Stage 4 safety net: runs every 5 minutes (offset by 1 min).
   *
   * Finds any KnowledgeArtifact where resolution completed but graph update
   * was never triggered or failed. Re-dispatches Stage 4.
   */
  @Cron('30 1-59/5 * * * *')
  async handleGraphSafetyNet() {
    await this.graphUpdateService.syncOrphanedArtifacts();
  }
}
