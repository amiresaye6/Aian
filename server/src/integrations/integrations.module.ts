import { Global, Module } from '@nestjs/common';
import { ProviderClientFactory } from './provider-client.factory';
import { SlackModule } from './slack/slack.module';
import { GithubModule } from './github/github.module';
import { ZoomModule } from './zoom/zoom.module';

/**
 * Global Integrations Module.
 *
 * Provides the ProviderClientFactory which acts as a registry
 * for all provider-specific implementations. By making this global,
 * provider modules can easily inject the factory and register themselves.
 */
@Global()
@Module({
  imports: [SlackModule, GithubModule, ZoomModule],
  providers: [ProviderClientFactory],
  exports: [ProviderClientFactory],
})
export class IntegrationsModule {}
