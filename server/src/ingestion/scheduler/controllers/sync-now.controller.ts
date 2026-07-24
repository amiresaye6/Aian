import { Controller, Post, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { BatchService } from '../batch.service';
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
  constructor(private readonly batchService: BatchService) {}

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
}
