import {
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { CollectionRunRepository } from '../../repositories/collection-run.repository';
import { HistoricalSyncService } from '../../collection/historical-sync.service';

@Controller('eyes/:connectionId/sync/historical')
export class HistoricalSyncController {
  constructor(
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly collectionRunRepo: CollectionRunRepository,
    private readonly syncService: HistoricalSyncService,
  ) {}

  @Post('start')
  async startSync(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Check if already running
    const latestRun = await this.collectionRunRepo.findLatestByOrganizationEyeId(
      connection.organizationEyeId,
    );

    if (latestRun && latestRun.status === 'running') {
      return {
        success: true,
        message: 'Sync is already running',
        runId: latestRun.id,
      };
    }

    // Create a new run record
    const run = await this.collectionRunRepo.create({
      organizationEyeId: connection.organizationEyeId,
      connectionId: connection.id,
      eyeType: connection.eyeType,
      provider: connection.providerKey,
      collectionMethod: 'polling',
    });

    // Fire and forget the background job
    this.syncService.runSync(connectionId, run.id).catch((err) => {
      console.error('Background sync failed unexpectedly:', err);
    });

    return {
      success: true,
      message: 'Historical sync started',
      runId: run.id,
    };
  }

  @Get('status')
  async getSyncStatus(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const latestRun = await this.collectionRunRepo.findLatestByOrganizationEyeId(
      connection.organizationEyeId,
    );

    if (!latestRun) {
      return {
        status: 'none',
        itemsStored: 0,
        progress: null,
      };
    }

    return {
      status: latestRun.status,
      itemsStored: latestRun.itemsStored,
      progress: latestRun.metadata || null,
      startedAt: latestRun.startedAt,
      finishedAt: latestRun.finishedAt,
      errorMessage: latestRun.errorMessage,
    };
  }
}
