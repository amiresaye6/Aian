import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { WebhookSignatureValidator } from '../../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';

@Injectable()
export class TeamsWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(TeamsWebhookValidator.name);

  constructor(
    private readonly providerConnectionRepo: ProviderConnectionRepository,
  ) {}

  async validate(req: Request, rawBody: Buffer, secret: string): Promise<boolean> {
    try {
      this.logger.debug('Received Teams webhook validation request');

      // 1. Handle Graph Validation Token Handshake
      if (req.query && req.query.validationToken) {
        this.logger.log('Processing Microsoft Graph validationToken handshake');
        if (req.res) {
          req.res.status(200).type('text/plain').send(req.query.validationToken as string);
        }
        return true; // WebhookService will see headersSent and exit early
      }

      // 2. Parse payload
      let payload: any;
      try {
        if (!rawBody) throw new Error('Empty raw body');
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        this.logger.error('Invalid JSON payload in Teams webhook');
        return false;
      }

      if (!payload || !Array.isArray(payload.value) || payload.value.length === 0) {
        this.logger.warn('Teams webhook payload is missing "value" array');
        return false; // Not a recognized Graph notification format
      }

      // 3. Fetch connection to verify clientState and tenant
      // Note: NestJS populates req.params, but we fallback to parsing URL just in case
      let connectionId = req.params?.connectionId;
      if (!connectionId && req.url) {
        const parts = req.url.split('/');
        connectionId = parts[parts.length - 1]?.split('?')[0];
      }

      if (!connectionId) {
        this.logger.error('Missing connectionId in Teams webhook path');
        return false;
      }

      const connection = await this.providerConnectionRepo.findByIdMapped(connectionId as string);
      if (!connection || (connection.status !== 'connected' && connection.status !== 'active')) {
        this.logger.warn(`Connection ${connectionId} is not active or found`);
        return false;
      }

      const metadata = (connection.connectionMetadata || {}) as any;
      const subscriptions = metadata.subscriptions || [];

      // 4. Validate each notification in the array
      for (const notification of payload.value) {
        // Verify subscription ownership
        const subscription = subscriptions.find(
          (sub: any) => sub.subscriptionId === notification.subscriptionId
        );

        if (!subscription) {
          this.logger.warn(`Unknown subscription ID: ${notification.subscriptionId}`);
          return false;
        }

        // Validate clientState
        if (notification.clientState !== subscription.clientState) {
          this.logger.warn(`Invalid clientState for subscription ${notification.subscriptionId}`);
          return false;
        }

        // Validate tenant if available in connection metadata
        if (notification.tenantId && metadata.tenantId) {
          if (notification.tenantId !== metadata.tenantId) {
            this.logger.warn(`Tenant mismatch. Expected: ${metadata.tenantId}, Got: ${notification.tenantId}`);
            return false;
          }
        }
      }

      this.logger.debug('Teams webhook validation successful');
      return true;

    } catch (error: any) {
      this.logger.error(`Teams webhook validation failed: ${error.message}`);
      return false;
    }
  }

  getEventType(req: Request): string {
    const payload = req.body;
    if (payload && Array.isArray(payload.value) && payload.value.length > 0) {
      const notification = payload.value[0];
      if (notification.lifecycleEvent) {
        return `teams_lifecycle_${notification.lifecycleEvent}`; // e.g. teams_lifecycle_subscriptionRemoved
      }
      return 'teams_message_change';
    }
    return 'teams_webhook';
  }
}
