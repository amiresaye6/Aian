import { Controller, Post, Get, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { BatchService } from '../batch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthGaurd } from '../../../auth/auth.gaurd';
import { RolesGuards } from '../../../roles_permissions/roles.guard';
import { RequiredPermissions } from '../../../decorators/required-permissions.decorator';

/**
 * Controller to manually trigger sync and batch processing.
 */
@UseGuards(AuthGaurd, RolesGuards)
@RequiredPermissions('eyes.manage')
@Controller('sync')
export class SyncNowController {
  constructor(
    private readonly batchService: BatchService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':organizationId/now')
  @HttpCode(HttpStatus.OK)
  async syncNow(@Param('organizationId') organizationId: string) {
    // Force a batch creation regardless of thresholds
    await this.batchService.processOrganizationBatches(organizationId, true);

    return {
      success: true,
      message: 'Sync triggered successfully',
    };
  }

  @Get(':organizationId/status')
  async getSyncStatus(@Param('organizationId') organizationId: string) {
    // Find the latest manual batch for this organization
    const latestManualBatch = await this.prisma.ingestionBatch.findFirst({
      where: {
        organizationId,
        triggerType: 'manual',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestManualBatch) {
      return {
        isRunning: false,
        status: 'none',
        createdAt: null,
      };
    }

    const isRunning =
      latestManualBatch.status === 'pending' ||
      latestManualBatch.status === 'locked' ||
      latestManualBatch.status === 'handed_off';

    return {
      isRunning,
      batchId: latestManualBatch.id,
      status: latestManualBatch.status,
      createdAt: latestManualBatch.createdAt,
    };
  }
}
