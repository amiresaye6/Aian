import { Global, Module } from '@nestjs/common';
import { ProviderClientFactory } from './provider-client.factory';
import { SlackModule } from './slack/slack.module';
import { GithubModule } from './github/github.module';
import { JiraModule } from './jira/jira.module';
import { ZoomModule } from './zoom/zoom.module';
import { TrelloModule } from './trello/trello.module';
import { TeamsModule } from './teams/teams.module';
import { ProvidersController } from './providers.controller';
import { ConfigModule } from '@nestjs/config';
import { MessagesService } from './messages/messages.service';

/**
 * Global Integrations Module.
 *
 * Provides the ProviderClientFactory which acts as a registry
 * for all provider-specific implementations. By making this global,
 * provider modules can easily inject the factory and register themselves.
 */
@Global()
@Module({
  imports: [SlackModule, GithubModule, JiraModule, ZoomModule, ConfigModule, TrelloModule, TeamsModule],
  controllers: [ProvidersController],
  providers: [ProviderClientFactory, MessagesService],
  exports: [
    ProviderClientFactory,
    MessagesService,
    SlackModule,
    GithubModule,
    JiraModule,
    ZoomModule,
    TrelloModule,
    TeamsModule,
  ],
})
export class IntegrationsModule {}
