import {
  Controller,
  Get,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';

@Controller('eyes/:connectionId/health')
export class HealthController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly providerFactory: ProviderClientFactory,
  ) {}

  @Get()
  async checkConnectionHealth(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    const client = this.providerFactory.getClient(connection.provider);
    if (!client)
      throw new BadRequestException(
        `No client implemented for ${connection.provider}`,
      );

    const result = await client.verifyConnection(connection);

    // Optionally update connection status in DB based on result

    return result;
  }
}
