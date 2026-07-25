import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResolvedEntityRepository } from '../../../resolution/repositories/resolved-entity.repository';
import { EntityResolutionService } from '../../../resolution/resolution.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Entities Controller.
 *
 * Exposes the canonical entity registry (Stage 3 output) to the frontend.
 * Powers an "Org Knowledge" view showing every person, system, project, etc.
 * that has been identified across all organizational artifacts.
 */
@Controller('entities')
export class EntitiesController {
  private readonly logger = new Logger(EntitiesController.name);

  constructor(
    private readonly entityRepo: ResolvedEntityRepository,
    private readonly resolutionService: EntityResolutionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/entities
   *
   * Lists all resolved entities with mention counts.
   * Supports filtering by type and organization.
   *
   * Frontend use: "Org Knowledge" dashboard showing all known entities,
   * grouped or filtered by type (People, Systems, Projects, etc.)
   *
   * Query params:
   *   - type: filter by EntityType (Person | System | Project | ...)
   *   - organizationId: scope to one org
   *   - page, limit: pagination
   */
  @Get()
  async listEntities(
    @Query('type') type?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));

    const { data, total } = await this.entityRepo.findManyByOrg(
      organizationId ?? '',
      type,
      pageNum,
      limitNum,
    );

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * GET /api/v1/entities/:id
   *
   * Returns a single resolved entity with its full mention history —
   * every artifact it appeared in and the exact name used in each.
   *
   * Frontend use: Entity detail view. Shows when the entity was first seen,
   * all aliases, and which conversations/tickets/PRs it's linked to.
   */
  @Get(':id')
  async getEntity(@Param('id') id: string) {
    const entity = await this.entityRepo.findWithMentions(id);
    if (!entity) {
      throw new NotFoundException(`Entity ${id} not found.`);
    }
    return entity;
  }

  /**
   * POST /api/v1/entities/retry-resolution
   *
   * Re-triggers Stage 3 resolution for all artifacts that completed
   * extraction but whose resolution is pending or failed.
   *
   * Frontend use: Admin "Fix Resolution" button.
   */
  @Post('retry-resolution')
  async retryResolution(@Query('organizationId') organizationId?: string) {
    this.logger.log(
      `Manual resolution retry triggered${organizationId ? ` for org ${organizationId}` : ' for all orgs'}.`,
    );

    // Reset failed artifacts back to pending so resolveOrphanedArtifacts picks them up
    await this.prisma.knowledgeArtifact.updateMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        extractionStatus: 'completed',
        resolutionStatus: 'failed',
      },
      data: { resolutionStatus: 'pending' },
    });

    setImmediate(() => {
      this.resolutionService
        .resolveOrphanedArtifacts()
        .catch((err) =>
          this.logger.error(`Resolution retry failed: ${err.message}`),
        );
    });

    return {
      message: 'Resolution retry dispatched. Check server logs for progress.',
    };
  }
}
