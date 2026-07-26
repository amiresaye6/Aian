import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IngestionBatchRepository } from '../../repositories/ingestion-batch.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthGaurd } from '../../../auth/auth.gaurd';
import { RolesGuards } from '../../../roles_permissions/roles.guard';
import { RequiredPermissions } from '../../../decorators/required-permissions.decorator';

@UseGuards(AuthGaurd, RolesGuards)
@RequiredPermissions('dashboard.read')
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

  @Get(':id/items')
  async getBatchItems(
    @Param('id') id: string,
    @Query('page') pageStr: string,
    @Query('limit') limitStr: string,
  ) {
    const page = parseInt(pageStr, 10) || 1;
    const limit = parseInt(limitStr, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.ingestionBatchItem.findMany({
        where: { batchId: id },
        include: { knowledgeItem: true },
        skip,
        take: limit,
      }),
      this.prisma.ingestionBatchItem.count({
        where: { batchId: id },
      }),
    ]);

    return {
      data: items.map((item) => item.knowledgeItem),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
