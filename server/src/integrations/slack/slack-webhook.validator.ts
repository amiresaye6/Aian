import { Injectable } from '@nestjs/common';
import { WebhookSignatureValidator } from '../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Validates incoming Slack webhook payloads using Slack's HMAC SHA256 signing algorithm.
 *
 * Algorithm (from Slack docs):
 *   1. Extract `x-slack-request-timestamp` and `x-slack-signature` headers.
 *   2. Reject if timestamp is older than 5 minutes (replay attack protection).
 *   3. Construct basestring: `v0:{timestamp}:{rawBody}`
 *   4. Compute HMAC SHA256 of basestring using the signing secret.
 *   5. Compare: `v0={computed_hmac}` vs `x-slack-signature`.
 */
@Injectable()
export class SlackWebhookValidator implements WebhookSignatureValidator {
  async validate(
    req: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp) {
      return false;
    }

    // Protect against replay attacks — reject requests older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 60 * 5) {
      return false;
    }

    // Compute the expected signature
    const sigBasestring = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    const expectedSignature =
      'v0=' +
      crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      return false;
    }
  }

  getEventType(req: Request): string {
    // Slack Events API payload puts the event type in body.event.type
    // or body.type (for top-level events like url_verification)
    if (req.body?.event?.type) {
      return req.body.event.type;
    }
    if (req.body?.type) {
      return req.body.type;
    }
    return 'slack_webhook';
  }
}
