import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebhookService } from '../../../ingestion/collection/webhooks/webhook.service';

@Controller('integrations/jira')
export class JiraEventsController {
  private readonly logger = new Logger(JiraEventsController.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleEvent(@Req() req: RawBodyRequest<any>) {
    const jiraProvider = await this.prismaService.provider.findUnique({
      where: { key: 'jira' },
    });

    if (!jiraProvider) {
      throw new NotFoundException("couldn't find the provider");
    }

    // Check if the webhook URL included connectionId
    let connectionId = req.query?.connectionId as string;

    if (!connectionId) {
      // Fallback: If it's a global webhook, find the first available connection
      const providerConnection = await this.prismaService.providerConnection.findFirst({
        where: {
          providerId: jiraProvider.id,
        },
      });
      connectionId = providerConnection?.id || 'null';
    }

    this.logger.debug('connectionId:' + connectionId);

    if (connectionId !== 'null') {
      await this.webhookService.processWebhook(connectionId, req as any);
    } else {
      this.logger.warn('Received Jira webhook but no connection could be found.');
    }

    return { received: true };
  }
}
