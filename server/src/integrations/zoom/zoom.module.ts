import { BadRequestException, Module, OnModuleInit } from '@nestjs/common';
import { ZoomClientService } from './zoom-client.service';
import { ZoomAdapterService } from './zoom-adapter.service';
import { ZoomWebhookValidator } from './zoom-webhook.validator';
import { ZoomAuthController } from './zoom-auth.controller';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { ProviderClientFactory } from '../provider-client.factory';
import { Provider } from '../contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ZoomEventsController } from './zoom-events.controller';

@Module({
  controllers: [
    ZoomAuthController,
    ZoomEventsController
  ],
  providers: [
    ZoomClientService, 
    ZoomAdapterService, 
    ZoomWebhookValidator
  ],
  exports: [
    ZoomClientService, 
    ZoomAdapterService, 
    ZoomWebhookValidator
  ],
})
export class ZoomModule implements OnModuleInit {
  constructor(
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly zoomClient: ZoomClientService,
    private readonly zoomAdapter: ZoomAdapterService,
    private readonly zoomValidator: ZoomWebhookValidator,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit() {
    const zoomProvider = await this.prisma.provider.findUnique({
          where: { key: 'zoom' },
        });
    
        if (!zoomProvider) {
          throw new BadRequestException(
            'Zoom provider not found in database. Did you run the seed?',
          );
        }
    this.clientFactory.registerClient(zoomProvider.id, this.zoomClient);
    this.clientFactory.registerAdapter(zoomProvider.id, this.zoomAdapter);
    this.validatorFactory.registerValidator(zoomProvider.id, this.zoomValidator);
  }
}