import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TeamsAuthController } from './controllers/teams-auth.controller';
import { TeamsEventsController } from './controllers/teams-events.controller';
import { TeamsClientService } from './services/teams-client.service';
import { TeamsAdapterService } from './services/teams-adapter.service';
import { TeamsAssemblerService } from './services/teams-assembler.service';
import { TeamsWebhookValidator } from './validators/teams-webhook.validator';
import { ProviderClientFactory } from '../provider-client.factory';
import { AssemblerFactory } from '../../processor/assemblers/assembler.factory';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [TeamsAuthController, TeamsEventsController],
  providers: [TeamsClientService, TeamsAdapterService, TeamsWebhookValidator, TeamsAssemblerService],
  exports: [TeamsClientService, TeamsAdapterService, TeamsWebhookValidator, TeamsAssemblerService],
})
export class TeamsModule implements OnModuleInit {
  private readonly logger = new Logger(TeamsModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly assemblerFactory: AssemblerFactory,
    private readonly teamsClient: TeamsClientService,
    private readonly teamsAdapter: TeamsAdapterService,
    private readonly teamsValidator: TeamsWebhookValidator,
    private readonly teamsAssembler: TeamsAssemblerService,
  ) {}

  async onModuleInit() {
    const teamsProvider = await this.prisma.provider.findUnique({
      where: { key: 'microsoft_teams' },
    });

    if (!teamsProvider) {
      this.logger.warn(
        'Microsoft Teams provider not found in DB. Skipping registration. Did you run the seed?',
      );
      return;
    }

    const providerId = teamsProvider.id;

    this.clientFactory.registerClient(providerId, this.teamsClient);
    this.clientFactory.registerAdapter(providerId, this.teamsAdapter);
    this.validatorFactory.registerValidator(providerId, this.teamsValidator);
    this.assemblerFactory.register(this.teamsAssembler);

    this.logger.log(
      `Microsoft Teams module registered with provider ID: ${providerId}`,
    );
  }
}
