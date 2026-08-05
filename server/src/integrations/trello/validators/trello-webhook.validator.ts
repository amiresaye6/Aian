import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookSignatureValidator } from '../../../ingestion/collection/webhooks/webhook-signature-validator.interface';

@Injectable()
export class TrelloWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(TrelloWebhookValidator.name);

  async validate(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Received Trello webhook validation request');

      if (!secret) {
        this.logger.error('Missing secret for Trello webhook validation');
        return false;
      }

      if (!rawBody || rawBody.length === 0) {
        this.logger.error('Missing or empty raw body for Trello webhook validation');
        return false;
      }

      const signatureHeader = req.headers['x-trello-webhook'];
      
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        this.logger.warn('Missing x-trello-webhook header in Trello webhook request');
        return false;
      }

      // Reconstruct the full callback URL for Trello validation
      // Check for reverse proxy headers (e.g. ngrok) or fallback to raw request info
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const callbackUrl = `${protocol}://${host}${req.originalUrl}`;

      const content = rawBody.toString('utf8') + callbackUrl;

      const expectedSignature = crypto
        .createHmac('sha1', secret)
        .update(content)
        .digest('base64');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signatureHeader, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        this.logger.warn('Trello webhook signature validation failed: length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

      if (isValid) {
        this.logger.debug('Trello webhook signature validation success');
        return true;
      } else {
        this.logger.warn('Trello webhook signature validation failed: hash mismatch');
        return false;
      }
    } catch (error: unknown) {
      this.logger.error(
        'Unexpected error during Trello webhook validation',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  getEventType(req: Request): string {
    if (req.body && req.body.action && req.body.action.type) {
      return req.body.action.type;
    }
    return 'trello_webhook';
  }
}
