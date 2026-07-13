import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionApiModule } from './api/ingestion-api.module';
import { EncryptionService } from '../common/encryption.service';
import { ProviderConnectionRepository } from './repositories/provider-connection.repository';
import { ProviderResourceSelectionRepository } from './repositories/provider-resource-selection.repository';
import { ProviderCursorRepository } from './repositories/provider-cursor.repository';
import { RawProviderEventRepository } from './repositories/raw-provider-event.repository';
import { KnowledgeItemRepository } from './repositories/knowledge-item.repository';
import { IngestionBatchRepository } from './repositories/ingestion-batch.repository';
import { ProcessingSettingsRepository } from './repositories/processing-settings.repository';
import { CollectionRunRepository } from './repositories/collection-run.repository';
import { WebhookSignatureValidatorFactory } from './collection/webhooks/webhook-signature-validator.factory';

/**
 * Global Ingestion Module.
 *
 * Provides all shared repositories and the encryption service
 * to every module in the application. Provider developers import
 * nothing extra — they just inject the repositories they need.
 */
@Global()
@Module({
  imports: [PrismaModule, IngestionApiModule],
  providers: [
    EncryptionService,
    ProviderConnectionRepository,
    ProviderResourceSelectionRepository,
    ProviderCursorRepository,
    RawProviderEventRepository,
    KnowledgeItemRepository,
    IngestionBatchRepository,
    ProcessingSettingsRepository,
    CollectionRunRepository,
    WebhookSignatureValidatorFactory,
  ],
  exports: [
    EncryptionService,
    ProviderConnectionRepository,
    ProviderResourceSelectionRepository,
    ProviderCursorRepository,
    RawProviderEventRepository,
    KnowledgeItemRepository,
    IngestionBatchRepository,
    ProcessingSettingsRepository,
    CollectionRunRepository,
    WebhookSignatureValidatorFactory,
  ],
})
export class IngestionModule {}
