import { Injectable, Logger } from '@nestjs/common';
import { WebhookSignatureValidator } from './webhook-signature-validator.interface';

/**
 * Registry for webhook signature validators.
 * Provider modules (e.g., SlackModule) will register their validator here.
 */
@Injectable()
export class WebhookSignatureValidatorFactory {
  private readonly validators = new Map<string, WebhookSignatureValidator>();
  private readonly logger = new Logger(WebhookSignatureValidatorFactory.name);

  registerValidator(providerId: string, validator: WebhookSignatureValidator) {
    if (this.validators.has(providerId)) {
      this.logger.warn(
        `Overwriting WebhookSignatureValidator for ${providerId}`,
      );
    }
    this.validators.set(providerId, validator);
    this.logger.log(`Registered WebhookSignatureValidator for ${providerId}`);
  }

  getValidator(providerId: string): WebhookSignatureValidator {
    const validator = this.validators.get(providerId);
    if (!validator) {
      throw new Error(
        `No signature validator registered for provider: ${providerId}`,
      );
    }
    return validator;
  }
}
