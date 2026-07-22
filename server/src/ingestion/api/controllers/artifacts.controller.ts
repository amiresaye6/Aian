import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeExtractionService } from '../../../extraction/extraction.service';
import { KnowledgeArtifactRepository } from '../../../extraction/repositories/knowledge-artifact.repository';
import { IsOptional, IsString, IsArray } from 'class-validator';

class BulkRetryDto {
  /**
   * If provided, only retry these specific artifact IDs.
   * If omitted, retries all failed/pending artifacts for the organization.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artifactIds?: string[];

  @IsOptional()
  @IsString()
  organizationId?: string;
}

/**
 * Artifacts Controller.
 *
 * Provides frontend-ready endpoints for listing KnowledgeArtifacts and
 * managing their extraction lifecycle (view status, retry individual or bulk).
 *
 * Designed to back a future "Knowledge" dashboard page where users can see
 * all assembled artifacts, their extraction status, and retry failed ones.
 */
@Controller('artifacts')
export class ArtifactsController {
  private readonly logger = new Logger(ArtifactsController.name);

  constructor(
    private readonly extractionService: KnowledgeExtractionService,
    private readonly artifactRepository: KnowledgeArtifactRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/artifacts
   *
   * Lists all KnowledgeArtifacts with their extraction status.
   * Supports filtering by status and organizationId.
   *
   * Frontend use: Drive a table/list UI showing all assembled artifacts,
   * their type, provider, extraction status, and timestamps.
   *
   * Query params:
   *   - status: filter by extractionStatus (pending | processing | completed | failed)
   *   - organizationId: scope to a specific org
   *   - page: page number (default 1)
   *   - limit: items per page (default 20)
   */
  @Get()
  async listArtifacts(
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.extractionStatus = status;

    const [artifacts, total] = await Promise.all([
      this.prisma.knowledgeArtifact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          type: true,
          provider: true,
          organizationId: true,
          extractionStatus: true,
          participants: true,
          extractedAt: true,
          createdAt: true,
          updatedAt: true,
          // Omit 'content' and 'extractedData' — too large for a list view
        },
      }),
      this.prisma.knowledgeArtifact.count({ where }),
    ]);

    return {
      data: artifacts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * GET /api/v1/artifacts/:id
   *
   * Returns a single artifact with its full extracted data.
   *
   * Frontend use: Detail view / drawer for a specific artifact, showing
   * the full extracted entities, relationships, decisions, and action items.
   */
  @Get(':id')
  async getArtifact(@Param('id') id: string) {
    const artifact = await this.prisma.knowledgeArtifact.findUnique({
      where: { id },
    });

    if (!artifact) {
      throw new NotFoundException(`Artifact ${id} not found.`);
    }

    return artifact;
  }

  /**
   * POST /api/v1/artifacts/:id/retry-extraction
   *
   * Retries extraction for a single specific artifact.
   * Resets its status to pending before re-running.
   *
   * Frontend use: The "Retry" button on each row of the artifacts table.
   */
  @Post(':id/retry-extraction')
  async retryArtifact(@Param('id') id: string) {
    const artifact = await this.artifactRepository.findById(id);

    if (!artifact) {
      throw new NotFoundException(`Artifact ${id} not found.`);
    }

    // Reset status so the idempotency guard doesn't skip it
    await this.prisma.knowledgeArtifact.update({
      where: { id },
      data: { extractionStatus: 'pending' },
    });

    this.logger.log(`[Stage 2] Manual retry triggered for artifact: ${id}`);

    // Fire and forget — don't block the HTTP response
    setImmediate(() => {
      this.extractionService
        .extractFromArtifact(id)
        .catch((err) =>
          this.logger.error(
            `Retry failed for artifact ${id}: ${err.message}`,
          ),
        );
    });

    return {
      message: `Extraction retry dispatched for artifact ${id}. Check server logs for progress.`,
      artifactId: id,
    };
  }

  /**
   * POST /api/v1/artifacts/retry-extraction
   *
   * Bulk retry endpoint.
   *
   * - If artifactIds is provided: retries only those specific artifacts.
   * - If artifactIds is omitted: retries all failed/pending artifacts (optionally scoped to an org).
   *
   * Frontend use: "Retry All Failed" button, or retry multiple selected rows via checkboxes.
   */
  @Post('retry-extraction')
  async bulkRetryExtraction(@Body() dto: BulkRetryDto) {
    let targets: { id: string }[];

    if (dto.artifactIds && dto.artifactIds.length > 0) {
      // Specific IDs requested
      targets = dto.artifactIds.map((id) => ({ id }));
      // Reset their statuses
      await this.prisma.knowledgeArtifact.updateMany({
        where: { id: { in: dto.artifactIds } },
        data: { extractionStatus: 'pending' },
      });
      this.logger.log(
        `[Stage 2] Bulk retry triggered for ${targets.length} specific artifact(s).`,
      );
    } else {
      // All failed/pending
      targets = await this.artifactRepository.findPendingOrFailed(
        dto.organizationId,
      );
      this.logger.log(
        `[Stage 2] Bulk retry triggered for all failed/pending artifacts (${targets.length} found).`,
      );
    }

    if (targets.length === 0) {
      return { message: 'No artifacts to retry.', count: 0 };
    }

    // Fire and forget
    setImmediate(() => {
      Promise.all(
        targets.map((t) =>
          this.extractionService.extractFromArtifact(t.id).catch((err) =>
            this.logger.error(
              `Bulk retry failed for artifact ${t.id}: ${err.message}`,
            ),
          ),
        ),
      );
    });

    return {
      message: `Retry dispatched for ${targets.length} artifact(s).`,
      count: targets.length,
      artifactIds: targets.map((t) => t.id),
    };
  }
}
