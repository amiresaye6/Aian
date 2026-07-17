import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { SlackClientService } from './slack-client.service';
import { SlackAdapterService } from './slack-adapter.service';
import { SlackWebhookValidator } from './slack-webhook.validator';
import { SlackAuthController } from './slack-auth.controller';
import { SlackEventsController } from './slack-events.controller';
import { ProviderClientFactory } from '../provider-client.factory';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The Slack Integration Module.
 *
 * On boot, it looks up the Slack provider's DB UUID and registers
 * the SlackClient, SlackAdapter, and SlackWebhookValidator into
 * the global factories so the shared pipeline can route to them.
 */
@Module({
  controllers: [SlackAuthController, SlackEventsController],
  providers: [SlackClientService, SlackAdapterService, SlackWebhookValidator],
  exports: [SlackClientService, SlackAdapterService],
})
export class SlackModule implements OnModuleInit {
  private readonly logger = new Logger(SlackModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly slackClient: SlackClientService,
    private readonly slackAdapter: SlackAdapterService,
    private readonly slackValidator: SlackWebhookValidator,
  ) {}

  async onModuleInit() {
    // Look up the Slack provider's DB UUID so we register under the same ID
    // that ProviderConnection.providerId uses (a foreign key to the providers table).
    const slackProvider = await this.prisma.provider.findUnique({
      where: { key: 'slack' },
    });

    if (!slackProvider) {
      this.logger.warn(
        'Slack provider not found in DB. Skipping registration. Did you run the seed?',
      );
      return;
    }

    const providerId = slackProvider.id;

    this.clientFactory.registerClient(providerId, this.slackClient);
    this.clientFactory.registerAdapter(providerId, this.slackAdapter);
    this.validatorFactory.registerValidator(providerId, this.slackValidator);

    this.logger.log(`Slack module registered with provider ID: ${providerId}`);
  }
}
