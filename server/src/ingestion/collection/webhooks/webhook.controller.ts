import {
  Controller,
  Post,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { WebhookService } from './webhook.service';

/**
 * Controller for receiving provider webhooks.
 * Webhooks are mounted at: POST /api/v1/webhooks/:connectionId
 */
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService
  ) {}

  @Post(':connectionId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('connectionId') connectionId: string,
    // By typing it as RawBodyRequest<any>, we avoid TS1272 express Request import issues
    @Req() req: RawBodyRequest<any>,
  ) {
    // Pass the request to the service for validation and dispatch
    await this.webhookService.processWebhook(connectionId, req);
    // We always respond 200 OK immediately after validation
    // to prevent the provider from retrying and backing up their queues.
    return { received: true };
  }
}
