import { Injectable, Logger } from '@nestjs/common';
import { WebhookSignatureValidator } from '../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Validates incoming Zoom webhook payloads and handles URL verification challenges.
 * 
 * Zoom Verification Flow:
 *   1. Replay Attack Protection: Check `x-zm-request-timestamp` header.
 *   2. Compute signature: HMAC-SHA256 of "v0:{timestamp}:{rawBody}" using Zoom Webhook Secret Token.
 *   3. Compare computed signature against the `x-zm-signature` header.
 */
@Injectable()
export class ZoomWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(ZoomWebhookValidator.name);

  async validate(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    const signature = req.headers['x-zm-signature'] as string;
    const timestamp = req.headers['x-zm-request-timestamp'] as string;
    //console.log('webhook reached with req.body:', req.body)
    if (!signature || !timestamp) {
      this.logger.warn('Missing Zoom validation headers (x-zm-signature or x-zm-request-timestamp)');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 60 * 5) {
      this.logger.error('Zoom Webhook rejected: Timestamp is older than 5 minutes or invalid.');
      return false;
    }

    const message = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    //console.log('Zoom Webhook Validation: Message to sign:', message);
    //console.log('req:'+req);

    const expectedSignature = 
      'v0=' + 
      crypto.createHmac('sha256', secret).update(message).digest('hex');
      //console.log('zoom validator worked successfully');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch (error) {
      this.logger.error('Zoom Webhook Signature comparison mismatch.');
      return false;
    }
  }

  /**
   * Helper to handle Zoom URL Validation Challenge (endpoint.url_validation).
   * When configuring webhooks, Zoom sends a test token. We must encrypt it and return it.
   */
  handleUrlValidation(plainToken: string, secret: string): { plainToken: string; encryptedToken: string } {
    const encryptedToken = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    return {
      plainToken,
      encryptedToken,
    };
  }

  getEventType(request: Request): string{
    return request.body?.event;
  }
  
}


/*
  webhook reached with req.body: {
  event: 'meeting.ended',
  payload: {
    account_id: 'Ws9lYbOZT56qC8fzSVx-zg',
    object: {
      duration: 0,
      start_time: '2026-07-17T22:24:18Z',
      timezone: '',
      end_time: '2026-07-17T22:25:21Z',
      topic: "Muhammad Elazzazy's Zoom Meeting",
      id: '86537167305',
      type: 1,
      uuid: '1j34liHNSLib+G/OV+4QHg==',
      host_id: 'DzQ9MFEBTnWCbA79wfNsww',
      host_email: 'mohamadelazzazy@gmail.com'
    }
  },
  event_ts: 1784327121469
}  
 */