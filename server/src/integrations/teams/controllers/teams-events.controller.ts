import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import { WebhookService } from '../../../ingestion/collection/webhooks/webhook.service';

/**
 * Controller for receiving Microsoft Teams (Graph) change notifications.
 *
 * Endpoint: POST /api/v1/integrations/teams/events/:connectionId
 */
@Controller('integrations/teams')
export class TeamsEventsController {
  private readonly logger = new Logger(TeamsEventsController.name);

  constructor(
    private readonly webhookService: WebhookService,
  ) {}

  @Post('events/:connectionId')
  @HttpCode(HttpStatus.OK)
  async handleEvent(
    @Param('connectionId') connectionId: string,
    @Req() req: any,
    @Res() res: any
  ) {
    // 1. Handle Microsoft Graph validationToken handshake
    if (req.query && req.query.validationToken) {
      this.logger.log(`Processing Microsoft Graph validationToken handshake for connection: ${connectionId}`);
      // Microsoft Graph strictly requires a 200 OK plain-text response containing only the validation token
      res.status(200).type('text/plain').send(req.query.validationToken as string);
      return;
    }

    // 2. Delegate normal event processing to the standard Aian pipeline
    // This pipeline will automatically route through TeamsWebhookValidator
    await this.webhookService.processWebhook(connectionId, req as any);

    // 3. Return 200 OK to acknowledge receipt and prevent Graph retries
    res.status(200).json({ received: true });
  }
}
