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
    providerId: string,
    providerKey: string,
    organizationEyeId: string,
    organizationId: string,
    eyeType: string,
    providerEventType: string,
    payload: any,
  ) {
    try {
      // 1. Store the raw event
      const rawEvent = await this.rawEventRepository.create({
        connectionId,
        provider: providerKey, // Use the string key (e.g. 'slack') for the DB
        eyeType,
        providerEventType,
        payload,
      });

      this.logger.debug(
        `Stored raw webhook event for connection ${connectionId}`,
      );

      // 2. Format input for BaseCollectorService
      const eventInput: ProviderEventInput = {
        rawPayload: payload,
        rawEventReference: rawEvent.id,
        organizationId,
        connectionId,
        providerEventType,
      };

      // 3. Dispatch to BaseCollectorService
      await this.baseCollector.processEvent(
        providerId,
        providerKey,
        organizationEyeId,
        eyeType,
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
