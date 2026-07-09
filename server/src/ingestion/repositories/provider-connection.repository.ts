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

  async findByOrganizationEyeId(organizationEyeId: string) {
    return this.prisma.providerConnection.findUnique({
      where: { organizationEyeId },
    });
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
