import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for ProviderConnection CRUD operations.
 * Used by all provider modules to manage OAuth connections.
 */
@Injectable()
export class ProviderConnectionRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string) {
    return this.prisma.providerConnection.findUnique({ where: { id } });
  }

  async findByIdMapped(id: string) {
    const conn = await this.prisma.providerConnection.findUnique({
      where: { id },
      include: {
        organizationEye: { include: { eyeType: true } },
        provider: true,
      },
    });
    if (!conn) return null;
    return this.mapToInterface(conn);
  }

  async findByOrganizationEyeId(organizationEyeId: string) {
    return this.prisma.providerConnection.findUnique({
      where: { organizationEyeId },
    });
  }

  /**
   * Finds a connection by externalAccountId (e.g. Slack team_id) and providerId.
   * Used by providers like Slack where webhooks arrive at a single global URL
   * and the connection must be resolved from the payload's team/account ID.
   */
  async findByExternalAccountMapped(
    externalAccountId: string,
    providerId: string,
  ) {
    const conn = await this.prisma.providerConnection.findFirst({
      where: { externalAccountId, providerId },
      include: {
        organizationEye: { include: { eyeType: true } },
        provider: true,
      },
    });
    if (!conn) return null;
    return this.mapToInterface(conn);
  }

  async findByOrganizationId(organizationId: string) {
    return this.prisma.providerConnection.findMany({
      where: { organizationEye: { organizationId } },
      include: {
        organizationEye: { include: { eyeType: true } },
        provider: true,
      },
    });
  }

  mapToInterface(conn: any) {
    return {
      id: conn.id,
      organizationEyeId: conn.organizationEyeId,
      organizationId: conn.organizationEye?.organizationId || '',
      providerId: conn.providerId,
      provider: conn.provider?.key ? conn.provider.key.toUpperCase() : conn.providerId, // Mapped to Provider enum value (e.g. 'JIRA')
      providerKey: conn.provider?.key || '',
      eyeType: conn.organizationEye?.eyeType?.key || '',
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      lastVerifiedAt: conn.lastVerifiedAt,
      accessTokenEncrypted: conn.accessTokenEncrypted,
      refreshTokenEncrypted: conn.refreshTokenEncrypted,
      tokenExpiresAt: conn.tokenExpiresAt,
      scopes: conn.scopes || [],
      externalAccountId: conn.externalAccountId,
      externalAccountName: conn.externalAccountName,
      connectionMetadata: conn.connectionMetadata || {},
      webhookSecret: conn.webhookSecret,
    };
  }

  async create(data: Prisma.ProviderConnectionUncheckedCreateInput) {
    return this.prisma.providerConnection.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ProviderConnectionUncheckedUpdateInput,
  ) {
    return this.prisma.providerConnection.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.providerConnection.delete({ where: { id } });
  }

  async updateTokens(
    id: string,
    accessTokenEncrypted: string,
    refreshTokenEncrypted: string | null,
    tokenExpiresAt: Date | null,
  ) {
    return this.prisma.providerConnection.update({
      where: { id },
      data: { accessTokenEncrypted, refreshTokenEncrypted, tokenExpiresAt },
    });
  }

  async updateLastVerified(id: string) {
    return this.prisma.providerConnection.update({
      where: { id },
      data: { lastVerifiedAt: new Date() },
    });
  }

  async updateLastSync(id: string) {
    return this.prisma.providerConnection.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  async updateError(id: string, errorMessage: string) {
    return this.prisma.providerConnection.update({
      where: { id },
      data: { lastErrorMessage: errorMessage, status: 'error' },
    });
  }

  async findByExternalAccountId(externalAccountId: string) {
    const conn = await this.prisma.providerConnection.findFirst({
      where: { externalAccountId },
      include: { organizationEye: true },
    });
    if (!conn) return null;
    return this.mapToInterface(conn);
  }
  async updateConnectionMetadata(id: string, metadata: Record<string, unknown>) {
    const cleanMetadata = JSON.parse(JSON.stringify(metadata));
    return this.prisma.providerConnection.update({
      where: { id },
      data: { connectionMetadata: cleanMetadata },
    });
  }
}
