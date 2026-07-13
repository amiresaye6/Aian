import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { ProviderResourceSelectionRepository } from '../../repositories/provider-resource-selection.repository';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';

@Controller('eyes/:connectionId/resources')
export class ResourcesController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly selectionRepo: ProviderResourceSelectionRepository,
    private readonly providerFactory: ProviderClientFactory,
  ) {}

  @Get('available')
  async getAvailableResources(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    const client = this.providerFactory.getClient(connection.provider);
    if (!client)
      throw new BadRequestException(
        `No client implemented for ${connection.provider}`,
      );

    // Fetch live resources from the provider (e.g. Slack channels, GitHub repos)
    const resources = await client.getResources(connection);
    return resources;
  }

  @Get('selected')
  async getSelectedResources(@Param('connectionId') connectionId: string) {
    return this.selectionRepo.findByConnectionId(connectionId);
  }

  @Post('selected')
  async updateSelectedResources(
    @Param('connectionId') connectionId: string,
    @Body()
    body: {
      resources: Array<{
        externalId: string;
        name: string;
        resourceType: string;
      }>;
    },
  ) {
    // For simplicity, we create/update selections.
    // In a full implementation, you'd want to sync differences (delete removed, add new)
    const results = [];
    for (const res of body.resources) {
      const updated = await this.selectionRepo.upsert(
        connectionId,
        res.externalId,
        {
          name: res.name,
          resourceType: res.resourceType,
          metadata: {},
          isSelected: true,
          isActive: true,
        },
      );
      results.push(updated);
    }
    return results;
  }
}
