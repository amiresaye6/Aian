import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphUpdateService } from '../graph/graph-update.service';

@Injectable()
export class EntityMergeService {
  private readonly logger = new Logger(EntityMergeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphUpdateService: GraphUpdateService,
  ) {}

  async mergeEntities(
    primaryId: string,
    secondaryId: string,
    actorUserId: string,
  ) {
    if (primaryId === secondaryId) {
      throw new BadRequestException('Cannot merge an entity into itself');
    }

    const primary = await this.prisma.resolvedEntity.findUnique({
      where: { id: primaryId },
    });
    const secondary = await this.prisma.resolvedEntity.findUnique({
      where: { id: secondaryId },
    });

    if (!primary || !secondary) {
      throw new NotFoundException('One or both entities not found');
    }

    if (primary.organizationId !== secondary.organizationId) {
      throw new BadRequestException(
        'Entities must belong to the same organization',
      );
    }

    if (primary.type !== secondary.type) {
      throw new BadRequestException('Cannot merge entities of different types');
    }

    const primaryEntity = await this.prisma.$transaction(async (tx) => {
      // 1. Find and handle duplicate mentions
      const primaryMentions = await tx.entityMention.findMany({
        where: { resolvedEntityId: primaryId },
      });
      const secondaryMentions = await tx.entityMention.findMany({
        where: { resolvedEntityId: secondaryId },
      });

      const duplicateSecondaryMentionIds = secondaryMentions
        .filter((sm) =>
          primaryMentions.some(
            (pm) =>
              pm.artifactId === sm.artifactId &&
              pm.extractedName === sm.extractedName,
          ),
        )
        .map((sm) => sm.id);

      if (duplicateSecondaryMentionIds.length > 0) {
        await tx.entityMention.deleteMany({
          where: { id: { in: duplicateSecondaryMentionIds } },
        });
      }

      // 2. Transfer remaining mentions
      await tx.entityMention.updateMany({
        where: { resolvedEntityId: secondaryId },
        data: { resolvedEntityId: primaryId },
      });

      // 3. Merge aliases
      const primaryAliases = Array.isArray(primary.aliases)
        ? primary.aliases
        : [];
      const secondaryAliases = Array.isArray(secondary.aliases)
        ? secondary.aliases
        : [];

      const newAliasesSet = new Set([
        ...(primaryAliases as string[]),
        ...(secondaryAliases as string[]),
        secondary.canonicalName,
      ]);
      const newAliases = Array.from(newAliasesSet);

      // 4. Update primary entity
      const updatedPrimary = await tx.resolvedEntity.update({
        where: { id: primaryId },
        data: { aliases: newAliases },
      });

      // 5. Delete secondary entity
      await tx.resolvedEntity.delete({
        where: { id: secondaryId },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: primary.organizationId,
          actorUserId,
          skill: 'resolution',
          method: 'mergeEntities',
          input: {
            primaryId,
            secondaryId,
            secondaryName: secondary.canonicalName,
          },
          success: true,
          idempotencyKey: `merge-${primaryId}-${secondaryId}-${Date.now()}`,
        },
      });

      return updatedPrimary;
    });

    // 6. Merge graph nodes
    await this.graphUpdateService.mergeGraphNodes(
      primaryId,
      secondaryId,
      primaryEntity.aliases as string[],
    );

    return primaryEntity;
  }
}
