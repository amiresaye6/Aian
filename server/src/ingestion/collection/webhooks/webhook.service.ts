import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { WebhookSignatureValidatorFactory } from './webhook-signature-validator.factory';
import { WebhookEventDispatcherService } from './webhook-event-dispatcher.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly dispatcher: WebhookEventDispatcherService,
  ) {}

  /**
   * Handles an incoming webhook request from a provider.
   *
   * @param connectionId The specific connection ID from the webhook URL path
   * @param req The Express request object containing headers and raw body
   */
  async processWebhook(connectionId: string, req: Request) {
    // 1. Fetch connection and provider info
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (!connection.webhookSecret) {
      throw new BadRequestException(
        'No webhook secret configured for this connection',
      );
    }

    // 2. Decrypt webhook secret
    const secret = this.encryptionService.decrypt(connection.webhookSecret);

    // 3. Validate signature using the provider-specific validator
    const validator = this.validatorFactory.getValidator(connection.providerId);

    // req.rawBody is populated by NestJS because we enabled rawBody: true in main.ts
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw request body is missing');
    }

    const isValid = await validator.validate(req, rawBody, secret);
    if (!isValid) {
      this.logger.warn(
        `Invalid webhook signature for connection ${connectionId}`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 4. Dispatch the verified payload for processing
    // We return immediately to the provider, processing the payload asynchronously
    this.dispatcher
      .dispatch(
        connectionId,
        connection.providerId,
        connection.organizationEyeId, // Using this to pass to dispatcher
        req.body, // The parsed JSON body
      )
      .catch((err) => {
        this.logger.error(
          `Failed to dispatch webhook asynchronously: ${err.message}`,
        );
      });

    return { success: true };
  }
}
