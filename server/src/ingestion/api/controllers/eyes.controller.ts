import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('eyes')
export class EyesController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly providerFactory: ProviderClientFactory,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getConnections(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      return [];
    }
    const connections =
      await this.connectionRepo.findByOrganizationId(organizationId);

    // Omit sensitive data like tokens before returning to client
    return connections.map((conn: any) => {
      const mapped = this.connectionRepo.mapToInterface(conn);
      const {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        webhookSecret,
        ...safeConn
      } = mapped as any;
      return safeConn;
    });
  }

  @Delete(':id')
  async deleteConnection(@Param('id') id: string) {
    const conn = await this.connectionRepo.findByIdMapped(id);
    if (!conn) {
      return { success: false, message: 'Connection not found' };
    }

    try {
      // 1. Resolve the provider client and invoke revokeCredentials if implemented
      const client = this.providerFactory.getClient(conn.provider);
      if (client && client.revokeCredentials) {
        await client.revokeCredentials(conn);
      }
    } catch (err) {
      // Log and swallow error to ensure we still clean up our database
      console.error(`Failed to revoke credentials for connection ${id}:`, err);
    }

    // 2. Delete the connection from the DB
    await this.connectionRepo.delete(id);

    // 3. Update the OrganizationEye status back to disconnected
    await this.prisma.organizationEye.update({
      where: { id: conn.organizationEyeId },
      data: { status: 'disconnected' },
    });

    return {
      success: true,
      message: 'Connection revoked and disconnected successfully',
    };
  }
}
