import { Injectable, Logger } from '@nestjs/common';
import { ProviderConnectionRepository } from '../repositories/provider-connection.repository';
import { ProviderResourceSelectionRepository } from '../repositories/provider-resource-selection.repository';
import { CollectionRunRepository } from '../repositories/collection-run.repository';
import { ProviderCursorRepository } from '../repositories/provider-cursor.repository';
import { BaseCollectorService } from './base-collector.service';
import { ProviderClientFactory } from '../../integrations/provider-client.factory';
import { ProviderConnection } from '../../integrations/contracts/provider-connection.interface';
import { KnowledgeItemRepository } from '../repositories/knowledge-item.repository';

@Injectable()
export class HistoricalSyncService {
  private readonly logger = new Logger(HistoricalSyncService.name);

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly selectionRepo: ProviderResourceSelectionRepository,
    private readonly collectionRunRepo: CollectionRunRepository,
    private readonly cursorRepo: ProviderCursorRepository,
    private readonly knowledgeItemRepo: KnowledgeItemRepository,
    private readonly baseCollector: BaseCollectorService,
    private readonly providerFactory: ProviderClientFactory,
  ) {}

  /**
   * Orchestrates the historical sync process.
   * Finds all active resources, fetches their last cursor,
   * and delegates the pagination loop to the provider client.
   */
  async runSync(connectionId: string, runId: string) {
    try {
      const connection = await this.connectionRepo.findByIdMapped(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      const client = this.providerFactory.getClient(connection.providerId);
      if (!client || !client.syncHistoricalResource) {
        throw new Error(
          `Provider ${connection.provider} does not support historical sync`,
        );
      }

      const resources = await this.selectionRepo.findSelectedByConnectionId(
        connectionId,
      );

      let itemsFetched = 0;
      let itemsStored = 0;
      let itemsIgnored = 0;

      // Update initial metadata
      await this.collectionRunRepo.updateProgress(
        runId,
        { itemsFetched, itemsStored, itemsIgnored },
        {
          totalResources: resources.length,
          completedResources: 0,
          currentResourceName: null,
          percentage: 0,
        },
      );

      let completedResources = 0;

      // Calculate fromDate based on connection settings
      // Default to 30 days if not set
      const backfillDays =
        (connection.connectionMetadata?.historyBackfillDays as number) || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - backfillDays);

      for (const resource of resources) {
        this.logger.log(
          `Starting historical sync for ${connection.provider} resource: ${resource.name}`,
        );

        // Update progress to show we are currently syncing this resource
        await this.collectionRunRepo.updateProgress(
          runId,
          { itemsFetched, itemsStored, itemsIgnored },
          {
            totalResources: resources.length,
            completedResources,
            currentResourceName: resource.name,
            percentage: Math.floor(
              (completedResources / resources.length) * 100,
            ),
          },
        );

        // 1. Fetch the last cursor if this was partially synced before
        const cursorRecord = await this.cursorRepo.findByConnectionAndResource(
          connectionId,
          resource.externalResourceId,
        );
        const startCursor = cursorRecord?.cursorValue;

        // 2. Delegate the actual pagination to the provider client
        await client.syncHistoricalResource(
          connection as ProviderConnection,
          resource,
          fromDate,
          startCursor,
          async (rawEvents: any[], nextCursor?: string) => {
            if (!rawEvents || rawEvents.length === 0) return;

            itemsFetched += rawEvents.length;

            const adapter = this.providerFactory.getAdapter(connection.providerId);
            
            for (const rawEvent of rawEvents) {
              const eventInput = {
                rawPayload: rawEvent,
                organizationId: connection.organizationId,
                connectionId: connection.id,
                rawEventReference: `historical-sync-${runId}`,
                providerEventType: 'historical',
              };

              try {
                // 1. Normalize
                const normalizedItems = adapter.normalizeEvent(eventInput as any);

                // 2. Save items with idempotency check
                for (const item of normalizedItems) {
                  const idempotencyKey = adapter.getIdempotencyKey(item);

                  const exists = await this.knowledgeItemRepo.existsByIdempotencyKey(idempotencyKey);
                  if (exists) {
                    itemsIgnored++;
                    continue;
                  }

                  const itemToStore = {
                    ...item,
                    author: item.author ? JSON.parse(JSON.stringify(item.author)) : null,
                    participants: item.participants ? JSON.parse(JSON.stringify(item.participants)) : [],
                    metadata: item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : {},
                    idempotencyKey,
                    ingestionStatus: 'pending' as const,
                  };

                  await this.knowledgeItemRepo.create(itemToStore as any);
                  itemsStored++;
                }
              } catch (e: any) {
                this.logger.debug(`Item ignored or failed: ${e.message}`);
                itemsIgnored++;
              }
            }

            if (nextCursor) {
              await this.cursorRepo.upsert(connectionId, resource.externalResourceId, nextCursor);
            }

            await this.collectionRunRepo.updateProgress(
              runId,
              { itemsFetched, itemsStored, itemsIgnored },
              {
                totalResources: resources.length,
                completedResources,
                currentResourceName: resource.name,
                percentage: Math.floor((completedResources / resources.length) * 100),
              },
            );
          },
        );

        completedResources++;
      }

      // Final completion marker
      await this.collectionRunRepo.markCompleted(runId, {
        itemsFetched,
        itemsStored,
        itemsIgnored,
      });
      // Ensure the final percentage hits 100%
      await this.collectionRunRepo.updateProgress(
        runId,
        { itemsFetched, itemsStored, itemsIgnored },
        {
          totalResources: resources.length,
          completedResources,
          currentResourceName: null,
          percentage: 100,
        },
      );

      // Update connection's lastSyncAt
      await this.connectionRepo.updateLastSync(connectionId);

      this.logger.log(`Historical sync completed for run ${runId}`);
    } catch (error: any) {
      this.logger.error(`Historical sync failed for run ${runId}:`, error.stack);
      await this.collectionRunRepo.markFailed(
        runId,
        'SYNC_FAILED',
        error.message,
      );
    }
  }
}
