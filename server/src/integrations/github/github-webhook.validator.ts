import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookSignatureValidator } from '../../ingestion/collection/webhooks/webhook-signature-validator.interface';
import { GithubWebhookHeaders } from './github-connection.constants';

/**
 * GitHub-specific implementation of WebhookSignatureValidator.
 *
 * GitHub signs webhook deliveries using HMAC-SHA256 over the raw request
 * body, sent in the `X-Hub-Signature-256` header as `sha256=<hex_digest>`.
 */
@Injectable()
export class GithubWebhookValidator implements WebhookSignatureValidator {
  private readonly logger = new Logger(GithubWebhookValidator.name);

  async validate(
    request: Request,
    rawBody: Buffer,
    secret: string,
  ): Promise<boolean> {
    const signatureHeader = request.headers[
      GithubWebhookHeaders.SIGNATURE
    ] as string | undefined;

    if (!signatureHeader) {
      this.logger.warn('Missing X-Hub-Signature-256 header on GitHub webhook');
      return false;
    }

    // GitHub prefixes the digest with "sha256=", e.g. "sha256=abcdef123..."
    const [algorithm, receivedDigest] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !receivedDigest) {
      this.logger.warn(
        `Unexpected signature format on GitHub webhook: ${signatureHeader}`,
      );
      return false;
    }

    const expectedDigest = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedDigest, 'utf8');
    const receivedBuffer = Buffer.from(receivedDigest, 'utf8');

    // timingSafeEqual throws if buffers have different lengths,
    // so we guard against that first instead of letting it throw.
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  getEventType(req: Request): string {
    // GitHub sends the event type in the X-GitHub-Event header
    const eventType = req.headers['x-github-event'];
    if (typeof eventType === 'string') {
      return eventType;
    }
    return 'github_webhook';
  }
}