import { Injectable, Logger } from '@nestjs/common';
import { RawProviderEventRepository } from '../../repositories/raw-provider-event.repository';
import { BaseCollectorService } from '../base-collector.service';
import { ProviderEventInput } from '../../../integrations/contracts/provider-adapter.interface';

/**
 * Dispatches a verified webhook payload to the BaseCollectorService
 * to extract normalized knowledge items.
 */
@Injectable()
export class WebhookEventDispatcherService {
  private readonly logger = new Logger(WebhookEventDispatcherService.name);

  constructor(
    private readonly rawEventRepository: RawProviderEventRepository,
    private readonly baseCollector: BaseCollectorService,
  ) {}

  /**
   * Processes the verified webhook.
   * 1. Stores the raw payload for audit/replay.
   * 2. Passes it to the BaseCollectorService for normalization and storage.
   */
  async dispatch(
    connectionId: string,
    provider: string,
    organizationEyeId: string,
    payload: any,
  ) {
    try {
      // 1. Store the raw event
      const rawEvent = await this.rawEventRepository.create({
        connectionId,
        provider,
        eyeType: provider, // Using provider temporarily if eyeType isn't passed separately
        providerEventType: 'webhook',
        payload,
      });

      this.logger.debug(
        `Stored raw webhook event for connection ${connectionId}`,
      );

      // 2. Format input for BaseCollectorService
      const eventInput: ProviderEventInput = {
        rawPayload: payload,
        rawEventReference: rawEvent.id,
        organizationId: 'unknown_org_id', // Would be fetched from connection relation in a real impl
        connectionId,
      };

      // 3. Dispatch to BaseCollectorService
      await this.baseCollector.processEvent(
        provider,
        organizationEyeId,
        'webhook', // CollectionMethod.webhook
        eventInput,
        connectionId,
      );
    } catch (error) {
      this.logger.error(
        `Error dispatching webhook event: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
