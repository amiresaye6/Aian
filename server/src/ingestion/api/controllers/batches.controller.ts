import { Controller, Get, Param, Query } from '@nestjs/common';
import { IngestionBatchRepository } from '../../repositories/ingestion-batch.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('batches')
export class BatchesController {
  constructor(
    private readonly batchRepo: IngestionBatchRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getBatches(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      return [];
    }
    // Simple fetch of latest 50 batches for an org
    return this.prisma.ingestionBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get(':id')
  async getBatchDetails(@Param('id') id: string) {
    const batch = await this.prisma.ingestionBatch.findUnique({
      where: { id },
    });

    const itemsCount = await this.prisma.ingestionBatchItem.count({
      where: { batchId: id },
    });

    return {
      ...batch,
      itemsCount,
    };
  }
}
