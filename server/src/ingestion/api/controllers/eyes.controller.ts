import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';

@Controller('eyes')
export class EyesController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly providerFactory: ProviderClientFactory,
  ) {}

  @Get()
  async getConnections(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      return [];
    }
    const connections = await this.connectionRepo.findByOrganizationId(organizationId);
    
    // Omit sensitive data like tokens before returning to client
    return connections.map((conn: any) => {
      const mapped = this.connectionRepo.mapToInterface(conn);
      const { accessTokenEncrypted, refreshTokenEncrypted, webhookSecret, ...safeConn } = mapped as any;
      return safeConn;
    });
  }

  @Delete(':id')
  async deleteConnection(@Param('id') id: string) {
    // In a real app, this should also check permissions and clean up resources
    return this.connectionRepo.delete(id);
  }
}
