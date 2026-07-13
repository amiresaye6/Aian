import { Injectable, Logger } from '@nestjs/common';
import { ProviderClient } from './contracts/provider-client.interface';
import { ProviderAdapter } from './contracts/provider-adapter.interface';

/**
 * Registry and Factory for all provider clients and adapters.
 *
 * Individual provider modules (e.g., SlackModule, ZoomModule) will inject
 * this factory during their onModuleInit() and register their specific
 * implementations. This allows the core ingestion pipeline to remain
 * completely decoupled from specific providers.
 */
@Injectable()
export class ProviderClientFactory {
  private readonly clients = new Map<string, ProviderClient>();
  private readonly adapters = new Map<string, ProviderAdapter>();
  private readonly logger = new Logger(ProviderClientFactory.name);

  /**
   * Register a ProviderClient for making API calls.
   */
  registerClient(providerId: string, client: ProviderClient) {
    if (this.clients.has(providerId)) {
      this.logger.warn(`Overwriting existing ProviderClient for ${providerId}`);
    }
    this.clients.set(providerId, client);
    this.logger.log(`Registered ProviderClient for ${providerId}`);
  }

  /**
   * Register a ProviderAdapter for normalizing data.
   */
  registerAdapter(providerId: string, adapter: ProviderAdapter) {
    if (this.adapters.has(providerId)) {
      this.logger.warn(
        `Overwriting existing ProviderAdapter for ${providerId}`,
      );
    }
    this.adapters.set(providerId, adapter);
    this.logger.log(`Registered ProviderAdapter for ${providerId}`);
  }

  /**
   * Get a ProviderClient by provider ID.
   * Throws if not registered.
   */
  getClient(providerId: string): ProviderClient {
    const client = this.clients.get(providerId);
    if (!client) {
      throw new Error(
        `No ProviderClient registered for provider: ${providerId}`,
      );
    }
    return client;
  }

  /**
   * Get a ProviderAdapter by provider ID.
   * Throws if not registered.
   */
  getAdapter(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(
        `No ProviderAdapter registered for provider: ${providerId}`,
      );
    }
    return adapter;
  }

  /**
   * Check if a client is registered (useful for health checks).
   */
  hasClient(providerId: string): boolean {
    return this.clients.has(providerId);
  }
}
