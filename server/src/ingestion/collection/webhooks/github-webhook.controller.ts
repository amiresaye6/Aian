import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';

/**
 * GitHub App sends ALL webhook deliveries to a single fixed URL
 * (configured once in the App settings), unlike per-connection webhook
 * URLs used by OAuth-based providers. The connection is resolved from
 * `installation.id` inside the payload itself, not from the URL path.
 */
@Controller('webhooks/github')
export class GithubWebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly connectionRepo: ProviderConnectionRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleGithubWebhook(@Req() req: RawBodyRequest<any>) {
    const installationId = req.body?.installation?.id;

    if (!installationId) {
      throw new NotFoundException(
        'GitHub webhook payload missing installation.id',
      );
    }

    // We stored installation_id as externalAccountId when connecting (Step 3).
    const connection = await this.connectionRepo.findByExternalAccountId(
      String(installationId),
    );

    if (!connection) {
      throw new NotFoundException(
        `No connection found for GitHub installation ${installationId}`,
      );
    }

    await this.webhookService.processWebhook(connection.id, req as any);
    return { received: true };
  }
}