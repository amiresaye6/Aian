import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './ai-provider.interface';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  private readonly providers = new Map<string, AiProvider>();
  private defaultProviderName?: string;

  register(provider: AiProvider, isDefault = false) {
    this.providers.set(provider.name, provider);
    if (isDefault || !this.defaultProviderName) {
      this.defaultProviderName = provider.name;
    }
    this.logger.log(
      `Registered AI Provider: ${provider.name}${isDefault ? ' (Default)' : ''}`,
    );
  }

  getProvider(name?: string): AiProvider {
    const providerName = name || this.defaultProviderName;

    if (!providerName) {
      throw new Error('No AI Providers registered.');
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI Provider not found: ${providerName}`);
    }

    return provider;
  }
}
