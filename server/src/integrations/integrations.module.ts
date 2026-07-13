import { Global, Module } from '@nestjs/common';
import { ProviderClientFactory } from './provider-client.factory';
import { SlackModule } from './slack/slack.module';

/**
 * Global Integrations Module.
 *
 * Provides the ProviderClientFactory which acts as a registry
 * for all provider-specific implementations. By making this global,
 * provider modules can easily inject the factory and register themselves.
 */
@Global()
@Module({
  imports: [SlackModule],
  providers: [ProviderClientFactory],
  exports: [ProviderClientFactory],
})
export class IntegrationsModule {}
