import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityMention } from '@prisma/client';

@Injectable()
export class EntityMentionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    resolvedEntityId: string;
    artifactId: string;
    extractedName: string;
    confidence: number;
  }): Promise<EntityMention> {
    return this.prisma.entityMention.create({ data });
  }

  /**
   * Creates the mention only if it doesn't already exist.
   * The unique constraint (resolvedEntityId, artifactId, extractedName) handles
   * deduplication at the DB level, but checking first avoids noisy constraint errors.
   */
  async upsert(data: {
    resolvedEntityId: string;
    artifactId: string;
    extractedName: string;
    confidence: number;
  }): Promise<void> {
    await this.prisma.entityMention.upsert({
      where: {
        resolvedEntityId_artifactId_extractedName: {
          resolvedEntityId: data.resolvedEntityId,
          artifactId: data.artifactId,
          extractedName: data.extractedName,
        },
      },
      create: data,
      update: { confidence: data.confidence }, // update confidence if re-extracted
    });
  }
}
