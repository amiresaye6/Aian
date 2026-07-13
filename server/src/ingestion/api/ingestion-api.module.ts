import { Module } from '@nestjs/common';
import { EyesController } from './controllers/eyes.controller';
import { ResourcesController } from './controllers/resources.controller';
import { HealthController } from './controllers/health.controller';
import { BatchesController } from './controllers/batches.controller';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule], // Needs access to ProviderClientFactory
  controllers: [
    EyesController,
    ResourcesController,
    HealthController,
    BatchesController,
  ],
})
export class IngestionApiModule {}
