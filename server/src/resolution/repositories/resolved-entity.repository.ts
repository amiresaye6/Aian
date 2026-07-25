import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResolvedEntity } from '@prisma/client';

export interface CreateResolvedEntityData {
  organizationId: string;
  canonicalName: string;
  normalizedName: string;
  type: string;
  aliases: string[];
  confidence: number;
}

@Injectable()
export class ResolvedEntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNormalizedName(
    organizationId: string,
    normalizedName: string,
    type: string,
  ): Promise<ResolvedEntity | null> {
    return this.prisma.resolvedEntity.findUnique({
      where: {
        organizationId_normalizedName_type: {
          organizationId,
          normalizedName,
          type,
        },
      },
    });
  }

  /**
   * Finds all entities of a given type in an org for fuzzy + alias matching.
   * Intentionally loads all candidates into memory — entity counts per type
   * per org are small enough (hundreds) that this is performant.
   */
  async findAllByOrgAndType(
    organizationId: string,
    type: string,
  ): Promise<ResolvedEntity[]> {
    return this.prisma.resolvedEntity.findMany({
      where: { organizationId, type },
    });
  }

  /**
   * Tier 1.5: Cross-type exact name match.
   *
   * Looks for an entity with the same normalizedName but a different type
   * within a list of compatible types. Used when the same real-world entity
   * (e.g. "Slack") is extracted as different types ("Service" vs "System")
   * across artifacts.
   *
   * Orders by firstSeenAt ASC so the oldest (most established) entity wins.
   */
  async findByNormalizedNameAcrossTypes(
    organizationId: string,
    normalizedName: string,
    compatibleTypes: string[],
  ): Promise<ResolvedEntity | null> {
    if (compatibleTypes.length === 0) return null;
    return this.prisma.resolvedEntity.findFirst({
      where: {
        organizationId,
        normalizedName,
        type: { in: compatibleTypes },
      },
      orderBy: { firstSeenAt: 'asc' },
    });
  }

  async create(data: CreateResolvedEntityData): Promise<ResolvedEntity> {
    return this.prisma.resolvedEntity.create({
      data: {
        organizationId: data.organizationId,
        canonicalName: data.canonicalName,
        normalizedName: data.normalizedName,
        type: data.type,
        aliases: data.aliases,
        confidence: data.confidence,
      },
    });
  }

  /**
   * Adds new aliases to an existing entity without overwriting existing ones.
   * Also touches lastSeenAt via updatedAt.
   */
  async addAliasesIfNew(id: string, newAliases: string[]): Promise<void> {
    const entity = await this.prisma.resolvedEntity.findUnique({
      where: { id },
      select: { aliases: true },
    });
    if (!entity) return;

    const existing = entity.aliases as string[];
    const merged = [...new Set([...existing, ...newAliases])];

    if (merged.length !== existing.length) {
      await this.prisma.resolvedEntity.update({
        where: { id },
        data: { aliases: merged },
      });
    } else {
      // Touch lastSeenAt even if no new aliases
      await this.prisma.resolvedEntity.update({
        where: { id },
        data: { lastSeenAt: new Date() },
      });
    }
  }

  async findById(id: string): Promise<ResolvedEntity | null> {
    return this.prisma.resolvedEntity.findUnique({ where: { id } });
  }

  async findWithMentions(id: string) {
    return this.prisma.resolvedEntity.findUnique({
      where: { id },
      include: {
        mentions: {
          include: {
            artifact: {
              select: {
                id: true,
                title: true,
                type: true,
                provider: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findManyByOrg(
    organizationId: string,
    type?: string,
    page = 1,
    limit = 50,
  ) {
    const where: any = { organizationId };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.resolvedEntity.findMany({
        where,
        orderBy: [{ type: 'asc' }, { canonicalName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { mentions: true } } },
      }),
      this.prisma.resolvedEntity.count({ where }),
    ]);

    return { data, total };
  }
}
