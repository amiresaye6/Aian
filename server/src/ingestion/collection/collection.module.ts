import { Module, Global } from '@nestjs/common';
import { WebhookController } from './webhooks/webhook.controller';
import { WebhookService } from './webhooks/webhook.service';
import { WebhookEventDispatcherService } from './webhooks/webhook-event-dispatcher.service';
import { BaseCollectorService } from './base-collector.service';
import { GithubWebhookController} from './webhooks/github-webhook.controller';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { HistoricalSyncService } from './historical-sync.service';

/**
 * Collection Module.
 * Manages webhook reception, signature validation, and routing to base collectors.
 * Note: WebhookSignatureValidatorFactory is provided globally by IngestionModule.
 */
@Global()
@Module({
  imports: [IntegrationsModule], // We need ProviderClientFactory from this
  controllers: [WebhookController,GithubWebhookController,],
  providers: [
    WebhookEventDispatcherService,
    WebhookService,
    BaseCollectorService,
    HistoricalSyncService,
  ],
  exports: [BaseCollectorService, WebhookService, HistoricalSyncService],
})
export class CollectionModule {}
