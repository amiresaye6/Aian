import { Injectable, Logger, Inject } from '@nestjs/common';
import { KnowledgeItemRepository } from '../repositories/knowledge-item.repository';
import { IngestionBatchRepository } from '../repositories/ingestion-batch.repository';
import { ProcessingSettingsRepository } from '../repositories/processing-settings.repository';
import type { KnowledgeProcessorGateway } from '../../integrations/contracts/processor-gateway.interface';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    private readonly knowledgeItemRepo: KnowledgeItemRepository,
    private readonly batchRepo: IngestionBatchRepository,
    private readonly settingsRepo: ProcessingSettingsRepository,
    @Inject('KNOWLEDGE_PROCESSOR_GATEWAY')
    private readonly processorGateway: KnowledgeProcessorGateway,
  ) {}

  /**
   * Processes pending items for an organization.
   * Creates a batch if there are pending items and the criteria are met (or forced).
   */
  async processOrganizationBatches(
    organizationId: string,
    force: boolean = false,
  ) {
    const settings =
      await this.settingsRepo.findByOrganizationId(organizationId);
    if (!settings && !force) {
      return; // No settings, auto-processing disabled by default unless forced
    }

    if (settings && !settings.isAutoProcessingEnabled && !force) {
      return; // Auto-processing disabled
    }

    const pendingCount =
      await this.knowledgeItemRepo.countPendingByOrganization(organizationId);
    if (pendingCount === 0) {
      return; // Nothing to do
    }

    const threshold = settings?.pendingItemThreshold ?? 100;

    // In a real app, we'd also check if timeIntervalHours has passed since the last batch.
    // For simplicity in this demo, we'll batch if we hit the threshold or if forced.
    const shouldBatch = force || pendingCount >= threshold;

    if (!shouldBatch) {
      return;
    }

    this.logger.log(
      `Creating batch for org ${organizationId}. Pending items: ${pendingCount}`,
    );

    try {
      // 1. Create the batch record
      const batch = await this.batchRepo.create(
        organizationId,
        force ? 'manual' : 'auto',
      );

      // 2. Fetch pending items
      const pendingItems =
        await this.knowledgeItemRepo.findPendingByOrganization(organizationId);
      const itemIds = pendingItems.map((i) => i.id);

      // 3. Lock the items to prevent double processing
      await this.knowledgeItemRepo.lockItems(itemIds);

      // 4. Attach items to the batch
      await this.batchRepo.addItems(batch.id, itemIds);

      // 5. Lock the batch
      await this.batchRepo.markLocked(batch.id);

      // 6. Hand off to processor
      const handoffResult = await this.processorGateway.handoffBatch(batch.id);

      if (handoffResult.accepted) {
        await this.batchRepo.markHandedOff(batch.id);
        await this.knowledgeItemRepo.markHandedOff(itemIds);
        this.logger.log(
          `Batch ${batch.id} handed off with ${itemIds.length} items. Job ID: ${handoffResult.processorJobId}`,
        );
      } else {
        await this.batchRepo.markFailed(batch.id, handoffResult.message);
        await this.knowledgeItemRepo.unlockItems(itemIds); // Unlock so they can be tried again
        this.logger.error(
          `Processor rejected batch ${batch.id}: ${handoffResult.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process batches for org ${organizationId}: ${(error as Error).message}`,
      );
    }
  }
}
