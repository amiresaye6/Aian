import { Module } from '@nestjs/common';
import { WebhookController } from './webhooks/webhook.controller';
import { WebhookService } from './webhooks/webhook.service';
import { WebhookEventDispatcherService } from './webhooks/webhook-event-dispatcher.service';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { BaseCollectorService } from './base-collector.service';

/**
 * Collection Module.
 * Manages webhook reception, signature validation, and routing to base collectors.
 * Note: WebhookSignatureValidatorFactory is provided globally by IngestionModule.
 */
@Module({
  imports: [IntegrationsModule], // We need ProviderClientFactory from this
  controllers: [WebhookController],
  providers: [
    WebhookEventDispatcherService,
    WebhookService,
    BaseCollectorService,
  ],
  exports: [BaseCollectorService],
})
export class CollectionModule {}
