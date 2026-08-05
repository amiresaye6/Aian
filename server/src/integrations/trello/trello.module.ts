import { Module } from '@nestjs/common';
import { TrelloAuthController } from './controllers/trello-auth.controller';
import { TrelloEventsController } from './controllers/trello-events.controller';
import { TrelloClientService } from './services/trello-client.service';
import { TrelloAdapterService } from './services/trello-adapter.service';
import { TrelloAssemblerService } from './services/trello-assembler.service';
import { TrelloWebhookValidator } from './validators/trello-webhook.validator';
import { PrismaModule } from '../../prisma/prisma.module';
import { IngestionModule } from '../../ingestion/ingestion.module';

@Module({
  imports: [PrismaModule, IngestionModule],
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
export class TrelloModule {}
