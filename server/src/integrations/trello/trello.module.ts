import { Module } from '@nestjs/common';
import { TrelloAuthController } from './controllers/trello-auth.controller';
import { TrelloClientService } from './services/trello-client.service';
import { TrelloAdapterService } from './services/trello-adapter.service';
import { TrelloAssemblerService } from './assembler/trello-assembler.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IngestionModule } from '../../ingestion/ingestion.module';

@Module({
  imports: [PrismaModule, IngestionModule],
  controllers: [TrelloAuthController],
  providers: [
    TrelloClientService,
    TrelloAdapterService,
    TrelloAssemblerService,
  ],
  exports: [
    TrelloClientService,
    TrelloAdapterService,
    TrelloAssemblerService,
  ],
})
export class TrelloModule {}
