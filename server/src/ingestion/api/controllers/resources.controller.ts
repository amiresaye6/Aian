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
import { IsArray, IsString } from 'class-validator';

export class UpdateSelectedResourcesDto {
  @IsArray()
  @IsString({ each: true })
  resourceIds: string[];
}

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
    @Body() body: UpdateSelectedResourcesDto,
  ) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const client = this.providerFactory.getClient(connection.provider);
    if (!client) {
      throw new BadRequestException(
        `No client implemented for ${connection.provider}`,
      );
    }

    // 1. Fetch available resources from the provider and map them for quick lookup
    const availableResources = await client.getResources(connection);
    const resourceMap = new Map(
      availableResources.map((r) => [r.externalResourceId, r]),
    );

    // 2. Validate that every requested ID actually exists on the provider
    for (const id of body.resourceIds) {
      if (!resourceMap.has(id)) {
        throw new BadRequestException(
          `Invalid resource ID provided: ${id}`,
        );
      }
    }

    // 3. Find out which resources are ALREADY selected so we don't send duplicate welcome messages
    const currentlySelected =
      await this.selectionRepo.findSelectedByConnectionId(connectionId);
    const currentlySelectedIds = new Set(
      currentlySelected.map((r) => r.externalResourceId),
    );
    const newlySelectedIds = body.resourceIds.filter(
      (id) => !currentlySelectedIds.has(id),
    );

    // 4. Update Database
    // Mark everything as unselected first
    await this.selectionRepo.deselectAll(connectionId);

    const results = [];
    const newlySelectedResources = [];

    // Upsert the chosen resources
    for (const id of body.resourceIds) {
      const liveResource = resourceMap.get(id)!;
      const updated = await this.selectionRepo.upsert(
        connectionId,
        id,
        {
          name: liveResource.name,
          resourceType: liveResource.resourceType,
          metadata: liveResource.metadata as any,
          isSelected: true,
          isActive: true,
        },
      );
      results.push(updated);

      if (newlySelectedIds.includes(id)) {
        newlySelectedResources.push(updated);
      }
    }

    // 5. Trigger lifecycle hook ONLY for newly selected resources
    if (client.onResourcesSelected && newlySelectedResources.length > 0) {
      // Run asynchronously so we don't block the API response
      client
        .onResourcesSelected(connection, newlySelectedResources)
        .catch((err) =>
          console.error(
            `Error in onResourcesSelected for connection ${connectionId}:`,
            err,
          ),
        );
    }

    return results;
  }
}
