/* eslint-disable prettier/prettier */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GithubClientService } from './github-client.service';
import { GitHubAdapterService } from './github-adapter.service';
import { GithubWebhookValidator } from './github-webhook.validator';
import { GithubAuthController } from './github-auth.controller';
import { ProviderClientFactory } from '../provider-client.factory';
import { WebhookSignatureValidatorFactory } from '../../ingestion/collection/webhooks/webhook-signature-validator.factory';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderKeyDbMap } from './github-connection.constants';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { CollectionModule } from '../../ingestion/collection/collection.module';

/**
 * The GitHub Integration Module.
 *
 * On boot, it looks up the GitHub provider's DB UUID and registers
 * the GithubClient, GitHubAdapter, and GithubWebhookValidator into
 * the global factories so the shared pipeline can route to them.
 *
 * Ownership split (Sprint 2):
 *   - GithubClientService, GithubWebhookValidator, GithubAuthController → Donia
 *   - GitHubAdapterService → Hager
 */
@Module({
  imports: [ConfigModule],
  controllers: [GithubAuthController],
  providers: [GithubClientService, GithubWebhookValidator, GitHubAdapterService],
  exports: [GithubClientService, GitHubAdapterService],
})
export class GithubModule implements OnModuleInit {
  private readonly logger = new Logger(GithubModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly validatorFactory: WebhookSignatureValidatorFactory,
    private readonly githubClient: GithubClientService,
    private readonly githubAdapter: GitHubAdapterService,
    private readonly githubValidator: GithubWebhookValidator,
  ) {}

  async onModuleInit() {
    // Look up the GitHub provider's DB UUID (lowercase key, per seed data)
    // so we register under the same ID that ProviderConnection.providerId uses.
    const githubProvider = await this.prisma.provider.findUnique({
      where: { key: ProviderKeyDbMap.GITHUB }, // 'github'
    });

    if (!githubProvider) {
      this.logger.warn(
        'GitHub provider not found in DB. Skipping registration. Did you run the seed?',
      );
      return;
    }

    const providerId = githubProvider.id;

    this.clientFactory.registerClient(providerId, this.githubClient);
    this.clientFactory.registerAdapter(providerId, this.githubAdapter);
    this.validatorFactory.registerValidator(providerId, this.githubValidator);

    this.logger.log(`GitHub module registered with provider ID: ${providerId}`);
  }
}