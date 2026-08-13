import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BatchService } from '../batch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PipelineStatusService } from '../pipeline-status.service';
import { AuthGaurd } from '../../../auth/auth.gaurd';
import { RolesGuards } from '../../../roles_permissions/roles.guard';
import { RequiredPermissions } from '../../../decorators/required-permissions.decorator';

/**
 * Controller to manually trigger sync, batch processing, and monitor pipeline status.
 */
@UseGuards(AuthGaurd, RolesGuards)
@RequiredPermissions('eyes.manage')
@Controller('sync')
export class SyncNowController {
  constructor(
    private readonly batchService: BatchService,
    private readonly prisma: PrismaService,
    private readonly pipelineStatus: PipelineStatusService,
  ) {}

  @Post(':organizationId/now')
  @HttpCode(HttpStatus.OK)
  async syncNow(@Param('organizationId') organizationId: string) {
    // Count pending items first
    const pendingCount = await this.prisma.knowledgeItem.count({
      where: { organizationId, ingestionStatus: 'pending' },
    });

    if (pendingCount === 0) {
      return {
        success: true,
        message: 'No pending items to sync.',
        syncRunId: null,
        pendingItems: 0,
      };
    }

    // Create a SyncRun record to track this invocation
    const syncRun = await this.prisma.syncRun.create({
      data: {
        organizationId,
        triggerType: 'manual',
        totalItems: pendingCount,
        currentStage: 'batching',
      },
    });

    // Fire and forget the background job so the API returns instantly
    this.batchService
      .processOrganizationBatches(organizationId, true, syncRun.id)
      .catch((err) => {
        console.error('Background sync failed:', err);
        // Mark the sync run as failed
        this.prisma.syncRun
          .update({
            where: { id: syncRun.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
              errorMessage: err.message,
              currentStage: null,
            },
          })
          .catch(() => {});
      });

    return {
      success: true,
      message: 'Sync triggered successfully',
      syncRunId: syncRun.id,
      pendingItems: pendingCount,
    };
  }

  @Get(':organizationId/pipeline-status')
  async getPipelineStatus(@Param('organizationId') organizationId: string) {
    return this.pipelineStatus.getPipelineStatus(organizationId);
  }
}
