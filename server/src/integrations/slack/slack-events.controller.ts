import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { WebhookService } from '../../ingestion/collection/webhooks/webhook.service';

/**
 * Dedicated controller for receiving Slack Events API payloads.
 *
 * Unlike GitHub (which allows a unique webhook URL per installation),
 * Slack sends ALL events from ALL workspaces to a single global Request URL.
 * This controller acts as the routing adapter:
 *   1. Handles the one-time `url_verification` handshake.
 *   2. For real events, extracts `team_id` from the body.
 *   3. Looks up the ProviderConnection by team_id.
 *   4. Delegates to the shared WebhookService pipeline.
 *
 * Endpoint: POST /api/v1/integrations/slack/events
 */
@Controller('integrations/slack')
export class SlackEventsController {
  private readonly logger = new Logger(SlackEventsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleEvent(@Req() req: RawBodyRequest<any>) {
    const body = req.body;

    // ─── Case 1: url_verification challenge ──────────────────────────
    // Slack sends this once when you first set the Request URL.
    // We must respond immediately with the challenge string.
    if (body?.type === 'url_verification') {
      this.logger.log('Received Slack url_verification challenge');
      return { challenge: body.challenge };
    }

    // ─── Case 2: event_callback (all real events) ────────────────────
    if (body?.type !== 'event_callback') {
      this.logger.debug(`Ignoring Slack payload type: ${body?.type}`);
      return { received: true };
    }

    const teamId = body.team_id;
    if (!teamId) {
      throw new BadRequestException('Missing team_id in Slack event payload');
    }

    // Look up the Slack provider's DB UUID
    const slackProvider = await this.prisma.provider.findUnique({
      where: { key: 'slack' },
    });

    if (!slackProvider) {
      throw new NotFoundException(
        'Slack provider not found in DB. Did you run the seed?',
      );
    }

    // Find the connection for this Slack workspace
    const connection = await this.connectionRepo.findByExternalAccountMapped(
      teamId,
      slackProvider.id,
    );

    if (!connection) {
      this.logger.warn(
        `No Slack connection found for team_id=${teamId}. Ignoring event.`,
      );
      // Return 200 anyway so Slack doesn't keep retrying
      return { received: true };
    }

    // Delegate to the existing global webhook pipeline.
    // This reuses signature validation, dispatch, normalization — everything.
    await this.webhookService.processWebhook(connection.id, req as any);

    return { received: true };
  }
}
