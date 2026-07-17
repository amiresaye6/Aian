import { Module } from '@nestjs/common';
import { EyesController } from './controllers/eyes.controller';
import { ResourcesController } from './controllers/resources.controller';
import { HealthController } from './controllers/health.controller';
import { BatchesController } from './controllers/batches.controller';
import { MessagesController } from './controllers/messages.controller';
import { SettingsController } from './controllers/settings.controller';
import { MessagesService } from '../../integrations/messages/messages.service';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule], // Needs access to ProviderClientFactory
  providers: [MessagesService],
  controllers: [
    EyesController,
    ResourcesController,
    HealthController,
    BatchesController,
    MessagesController,
    SettingsController,
  ],
})
export class IngestionApiModule {}
