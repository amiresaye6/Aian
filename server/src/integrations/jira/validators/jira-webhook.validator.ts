import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookSignatureValidator } from '../../../ingestion/collection/webhooks/webhook-signature-validator.interface';

@Injectable()
export class JiraWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(JiraWebhookValidator.name);

  async validate(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Received Jira webhook validation request');

      if (!secret) {
        this.logger.error('Missing Jira webhook secret for validation');
        return false;
      }

      if (!rawBody || rawBody.length === 0) {
        this.logger.error('Missing or empty raw body for Jira webhook validation');
        return false;
      }

      const signatureHeader = req.headers['x-hub-signature'];
      
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        this.logger.warn('Missing x-hub-signature header in Jira webhook request');
        return false;
      }

      
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')}`;

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signatureHeader, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        this.logger.warn('Jira webhook signature validation failed: length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

      if (isValid) {
        this.logger.debug('Jira webhook signature validation success');
        return true;
      } else {
        this.logger.warn('Jira webhook signature validation failed: hash mismatch');
        return false;
      }
    } catch (error: unknown) {
      this.logger.error(
        'Unexpected error during Jira webhook validation',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  getEventType(req: Request): string {
    if (req.body && req.body.webhookEvent) {
      return req.body.webhookEvent;
    }
    return 'jira_webhook';
  }
}
