import { Injectable, Logger } from '@nestjs/common';
import { ProviderClientFactory } from '../../integrations/provider-client.factory';
import { KnowledgeItemRepository } from '../repositories/knowledge-item.repository';
import { CollectionRunRepository } from '../repositories/collection-run.repository';
import { ProviderEventInput } from '../../integrations/contracts/provider-adapter.interface';
import { CollectionMethod } from '@prisma/client';

/**
 * Core service for the ingestion pipeline.
 * Coordinates transforming raw provider events into normalized KnowledgeItems
 * and storing them safely with idempotency checks.
 */
@Injectable()
export class BaseCollectorService {
  private readonly logger = new Logger(BaseCollectorService.name);

  constructor(
    private readonly providerFactory: ProviderClientFactory,
    private readonly knowledgeItemRepo: KnowledgeItemRepository,
    private readonly collectionRunRepo: CollectionRunRepository,
  ) {}

  /**
   * Processes a raw event (from webhook or polling) and stores normalized items.
   */
  async processEvent(
    providerId: string,
    providerKey: string,
    organizationEyeId: string,
    eyeType: string,
    collectionMethod: CollectionMethod,
    eventInput: ProviderEventInput,
    connectionId?: string,
  ) {
    // 1. Create a collection run record to track stats
    const run = await this.collectionRunRepo.create({
      organizationEyeId,
      connectionId,
      eyeType,
      provider: providerKey, // Use the string key (e.g. 'slack') instead of the UUID to avoid VarChar(20) overflow
      collectionMethod,
    });

    let itemsStored = 0;
    let itemsIgnored = 0;

    try {
      // 2. Get the specific provider adapter
      const adapter = this.providerFactory.getAdapter(providerId);

      // 3. Normalize the raw event into unified KnowledgeItems
      const normalizedItems = adapter.normalizeEvent(eventInput);

      // 4. Save items with idempotency check
      for (const item of normalizedItems) {
        const idempotencyKey = adapter.getIdempotencyKey(item);

        const exists =
          await this.knowledgeItemRepo.existsByIdempotencyKey(idempotencyKey);

        if (exists) {
          itemsIgnored++;
          continue;
        }

        // Apply idempotency key to the item before storing
        const itemToStore = {
          ...item,
          author: item.author ? JSON.parse(JSON.stringify(item.author)) : null,
          participants: item.participants
            ? JSON.parse(JSON.stringify(item.participants))
            : [],
          metadata: item.metadata
            ? JSON.parse(JSON.stringify(item.metadata))
            : {},
          idempotencyKey,
          ingestionStatus: 'pending' as const, // Ready for batching
        };

        // Casting to any to bypass Prisma's strict JSON type checks for now
        await this.knowledgeItemRepo.create(itemToStore as any);
        itemsStored++;
      }

      // 5. Mark run as successful
      await this.collectionRunRepo.markCompleted(run.id, {
        itemsFetched: normalizedItems.length,
        itemsStored,
        itemsIgnored,
      });

      this.logger.log(
        `Completed collection run ${run.id}: ${itemsStored} stored, ${itemsIgnored} ignored.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed collection run ${run.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.collectionRunRepo.markFailed(
        run.id,
        'PROCESSING_ERROR',
        (error as Error).message,
      );

      throw error;
    }
  }
}
