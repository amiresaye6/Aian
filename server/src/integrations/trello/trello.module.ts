import { Module, OnModuleInit, BadRequestException } from '@nestjs/common';
import { TrelloAuthController } from './controllers/trello-auth.controller';
import { TrelloEventsController } from './controllers/trello-events.controller';
import { TrelloClientService } from './services/trello-client.service';
import { TrelloAdapterService } from './services/trello-adapter.service';
import { TrelloAssemblerService } from './services/trello-assembler.service';
import { TrelloWebhookValidator } from './validators/trello-webhook.validator';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProviderClientFactory } from '../provider-client.factory';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { AssemblerFactory } from '../../processor/assemblers/assembler.factory';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [TrelloAuthController, TrelloEventsController],
  providers: [
    TrelloClientService,
    TrelloAdapterService,
    TrelloAssemblerService,
    TrelloWebhookValidator,
  ],
  exports: [
    TrelloClientService,
    TrelloAdapterService,
    TrelloAssemblerService,
    TrelloWebhookValidator,
  ],
})
export class TrelloModule implements OnModuleInit {
  constructor(
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly assemblerFactory: AssemblerFactory,
    private readonly trelloClient: TrelloClientService,
    private readonly trelloAdapter: TrelloAdapterService,
    private readonly trelloValidator: TrelloWebhookValidator,
    private readonly trelloAssembler: TrelloAssemblerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const trelloProvider = await this.prisma.provider.findUnique({
      where: { key: 'trello' },
    });

    if (!trelloProvider) {
      throw new BadRequestException(
        'Trello provider not found in database. Did you run the seed?',
      );
    }

    this.clientFactory.registerClient(trelloProvider.id, this.trelloClient);
    this.clientFactory.registerAdapter(trelloProvider.id, this.trelloAdapter);
    this.validatorFactory.registerValidator(trelloProvider.id, this.trelloValidator);
    
    // Register the assembler
    this.assemblerFactory.register(this.trelloAssembler);
  }
}
