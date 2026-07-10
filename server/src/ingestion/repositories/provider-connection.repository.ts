import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository for ProviderConnection CRUD operations.
 * Used by all provider modules to manage OAuth connections.
 */
@Injectable()
export class ProviderConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.providerConnection.findUnique({ where: { id } });
  }

  async findByIdMapped(id: string) {
    const conn = await this.prisma.providerConnection.findUnique({
      where: { id },
      include: { organizationEye: true },
    });
    if (!conn) return null;
    return this.mapToInterface(conn);
  }

  async findByOrganizationEyeId(organizationEyeId: string) {
    return this.prisma.providerConnection.findUnique({
      where: { organizationEyeId },
    });
  }

  async findByOrganizationId(organizationId: string) {
    return this.prisma.providerConnection.findMany({
      where: { organizationEye: { organizationId } },
      include: { organizationEye: true },
    });
  }

  mapToInterface(conn: any) {
    return {
      id: conn.id,
      organizationEyeId: conn.organizationEyeId,
      organizationId: conn.organizationEye?.organizationId || '',
      provider: conn.providerId as any,
      eyeType: conn.organizationEye?.eyeType as any,
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

  async update(id: string, data: Prisma.ProviderConnectionUncheckedUpdateInput) {
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
}
