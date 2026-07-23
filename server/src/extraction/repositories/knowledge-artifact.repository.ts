import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExtractionResult } from '../extraction.schema';
import { ExtractionStatus, KnowledgeArtifact } from '@prisma/client';

@Injectable()
export class KnowledgeArtifactRepository {
  private readonly logger = new Logger(KnowledgeArtifactRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<KnowledgeArtifact | null> {
    return this.prisma.knowledgeArtifact.findUnique({ where: { id } });
  }

  async markProcessing(id: string): Promise<void> {
    await this.prisma.knowledgeArtifact.update({
      where: { id },
      data: { extractionStatus: ExtractionStatus.processing },
    });
  }

  async saveExtractionResult(
    id: string,
    result: ExtractionResult,
    title?: string,
  ): Promise<void> {
    await this.prisma.knowledgeArtifact.update({
      where: { id },
      data: {
        extractionStatus: ExtractionStatus.completed,
        extractedData: result as any,
        extractedAt: new Date(),
        ...(title ? { title } : {}),
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    this.logger.error(`Extraction failed for artifact ${id}: ${errorMessage}`);
    await this.prisma.knowledgeArtifact.update({
      where: { id },
      data: {
        extractionStatus: ExtractionStatus.failed,
      },
    });
  }

  // ─── Resolution Status ──────────────────────────────────────────────────

  async findCompletedExtractionPendingResolution(): Promise<{ id: string }[]> {
    return this.prisma.knowledgeArtifact.findMany({
      where: {
        extractionStatus: ExtractionStatus.completed,
        resolutionStatus: ExtractionStatus.pending,
      },
      select: { id: true },
      orderBy: { extractedAt: 'asc' },
    });
  }

  /**
   * Finds all artifacts stuck in 'failed' or 'pending' state.
   * Used for retry jobs or admin tooling.
   */
  async findPendingOrFailed(
    organizationId?: string,
  ): Promise<KnowledgeArtifact[]> {
    return this.prisma.knowledgeArtifact.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        extractionStatus: {
          in: [ExtractionStatus.pending, ExtractionStatus.failed],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
