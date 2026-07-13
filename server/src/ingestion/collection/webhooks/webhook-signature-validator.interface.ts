import { Request } from 'express';

/**
 * Interface that each provider's webhook signature validator must implement.
 * Validates the raw payload and headers using the connection's webhook secret.
 */
export interface WebhookSignatureValidator {
  /**
   * Validates the webhook request signature.
   *
   * @param request The Express request object containing headers
   * @param rawBody The raw, unparsed request body
   * @param secret The webhook secret for this connection
   * @returns true if valid, false if invalid
   */
  validate(request: Request, rawBody: Buffer, secret: string): Promise<boolean>;
}
