import { Injectable, Logger } from '@nestjs/common';
import { ProviderConnectionRepository } from '../../ingestion/repositories/provider-connection.repository';
import { ResolvedConnection } from './types';

/**
 * Resolves provider connections for skill execution.
 *
 * Given an organizationId and a provider key (e.g. 'JIRA', 'ZOOM'),
 * looks up the active connection from the database.
 *
 * Supports per-request caching to avoid redundant DB hits when
 * multiple skills need different providers in the same orchestrator call.
 */
@Injectable()
export class ConnectionResolverService {
  private readonly logger = new Logger(ConnectionResolverService.name);

  constructor(private readonly connectionRepo: ProviderConnectionRepository) {}

  /**
   * Resolves all required and optional provider connections for a skill.
   *
   * @returns An object with:
   *   - `connections`: A map of provider key → ResolvedConnection (includes both required and optional)
   *   - `missing`: An array of required provider keys that have no active connection
   */
  async resolveForSkill(
    organizationId: string,
    requiredProviders: string[],
    optionalProviders: string[] = [],
    cache?: Map<string, ResolvedConnection | null>,
  ): Promise<{
    connections: Record<string, ResolvedConnection>;
    missing: string[];
  }> {
    const allProviders = [
      ...new Set([...requiredProviders, ...optionalProviders]),
    ];
    const connections: Record<string, ResolvedConnection> = {};
    const missing: string[] = [];

    // Fetch all org connections once (or use cache)
    let orgConnections = cache
      ? null
      : await this.fetchOrgConnections(organizationId);

    for (const providerKey of allProviders) {
      const upperKey = providerKey.toUpperCase();

      // Check cache first
      if (cache?.has(upperKey)) {
        const cached = cache.get(upperKey)!;
        if (cached) {
          connections[upperKey] = cached;
        } else if (requiredProviders.includes(providerKey)) {
          missing.push(upperKey);
        }
        continue;
      }

      // Resolve from DB
      if (!orgConnections) {
        orgConnections = await this.fetchOrgConnections(organizationId);
      }

      const match = orgConnections.find(
        (c) => c.providerKey === upperKey && c.status === 'connected',
      );

      if (match) {
        const resolved: ResolvedConnection = {
          id: match.id,
          providerId: match.providerId,
          providerKey: upperKey,
          accessTokenEncrypted: match.accessTokenEncrypted,
          refreshTokenEncrypted: match.refreshTokenEncrypted,
          tokenExpiresAt: match.tokenExpiresAt,
          externalAccountId: match.externalAccountId,
          externalAccountName: match.externalAccountName,
          connectionMetadata:
            (match.connectionMetadata as Record<string, unknown>) || {},
          organizationEyeId: match.organizationEyeId,
          organizationId,
        };
        connections[upperKey] = resolved;
        cache?.set(upperKey, resolved);
      } else {
        cache?.set(upperKey, null);
        if (requiredProviders.includes(providerKey)) {
          missing.push(upperKey);
          this.logger.warn(
            `Required provider ${upperKey} not found or not connected for org ${organizationId}`,
          );
        } else {
          this.logger.debug(
            `Optional provider ${upperKey} not connected for org ${organizationId}, skipping`,
          );
        }
      }
    }

    return { connections, missing };
  }

  private async fetchOrgConnections(organizationId: string) {
    const raw = await this.connectionRepo.findByOrganizationId(organizationId);
    return raw.map((conn) => ({
      id: conn.id,
      providerId: conn.providerId,
      providerKey: (conn.provider as any)?.key?.toUpperCase() || '',
      status: conn.status,
      accessTokenEncrypted: conn.accessTokenEncrypted,
      refreshTokenEncrypted: conn.refreshTokenEncrypted,
      tokenExpiresAt: conn.tokenExpiresAt,
      externalAccountId: conn.externalAccountId,
      externalAccountName: conn.externalAccountName || null,
      connectionMetadata: conn.connectionMetadata,
      organizationEyeId: conn.organizationEyeId,
    }));
  }
}
