import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { BatchService } from '../batch.service';

/**
 * Controller to manually trigger sync and batch processing.
 */
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
