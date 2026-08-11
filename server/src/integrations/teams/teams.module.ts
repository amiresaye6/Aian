import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TeamsAuthController } from './controllers/teams-auth.controller';
import { TeamsClientService } from './services/teams-client.service';
import { TeamsAdapterService } from './services/teams-adapter.service';
import { ProviderClientFactory } from '../provider-client.factory';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [TeamsAuthController],
  providers: [TeamsClientService, TeamsAdapterService],
  exports: [TeamsClientService, TeamsAdapterService],
})
export class TeamsModule implements OnModuleInit {
  private readonly logger = new Logger(TeamsModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: ProviderClientFactory,
    private readonly teamsClient: TeamsClientService,
    private readonly teamsAdapter: TeamsAdapterService,
  ) {}

  async onModuleInit() {
    const teamsProvider = await this.prisma.provider.findUnique({
      where: { key: 'microsoft_teams' },
    });

    if (!teamsProvider) {
      this.logger.warn(
        'Microsoft Teams provider not found in DB. Skipping registration. Did you run the seed?',
      );
      return;
    }

    const providerId = teamsProvider.id;

    this.clientFactory.registerClient(providerId, this.teamsClient);
    this.clientFactory.registerAdapter(providerId, this.teamsAdapter);

    this.logger.log(
      `Microsoft Teams module registered with provider ID: ${providerId}`,
    );
  }
}
