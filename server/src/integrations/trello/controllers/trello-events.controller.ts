import {
  Controller,
  Post,
  Head,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebhookService } from '../../../ingestion/collection/webhooks/webhook.service';
import { ProviderResourceSelectionRepository } from '../../../ingestion/repositories/provider-resource-selection.repository';
import { Request } from 'express';

@Controller('integrations/trello')
export class TrelloEventsController {
  private readonly logger = new Logger(TrelloEventsController.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly resourceSelectionRepo: ProviderResourceSelectionRepository,
  ) {}

  @Head('events')
  @HttpCode(HttpStatus.OK)
  handleHeadEvent() {
    this.logger.debug('Received HEAD request for Trello webhook registration validation.');
    return { received: true };
  }

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleEvent(@Req() req: RawBodyRequest<Request>) {
    const trelloProvider = await this.prismaService.provider.findUnique({
      where: { key: 'trello' },
    });

    if (!trelloProvider) {
      throw new NotFoundException("couldn't find the provider");
    }

    // Check if the webhook URL included connectionId
    let connectionId = req.query?.connectionId as string;

    if (!connectionId) {
      // Fallback: If it's a global webhook, find the first available connection
      const providerConnection = await this.prismaService.providerConnection.findFirst({
        where: {
          providerId: trelloProvider.id,
        },
      });
      connectionId = providerConnection?.id || 'null';
    }

    this.logger.debug(`connectionId: ${connectionId}`);

    if (connectionId !== 'null') {
      const body = req.body as Record<string, any>;
      
      // Extract the board ID (Trello's main resource container, equivalent to Jira Project)
      const boardId = body?.action?.data?.board?.id || body?.model?.id;

      if (boardId) {
        const projectId = boardId.toString();
        const selectedResources = await this.resourceSelectionRepo.findSelectedByConnectionId(connectionId);
        const isSelected = selectedResources.some((r) => r.externalResourceId === projectId);
        if (!isSelected) {
          this.logger.debug(`Ignoring event for unselected board ID ${projectId}`);
          return { received: true, ignored: true };
        }
      }

      await this.webhookService.processWebhook(connectionId, req);
    } else {
      this.logger.warn('Received Trello webhook but no connection could be found.');
    }

    return { received: true };
  }
}
