import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from './graph.service';
import { ExtractionStatus } from '@prisma/client';
import { ExtractionResult } from '../extraction/extraction.schema';
import * as crypto from 'crypto';

@Injectable()
export class GraphUpdateService {
  private readonly logger = new Logger(GraphUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: GraphService,
  ) {}

  async updateArtifactInGraph(artifactId: string): Promise<void> {
    this.logger.log(`[Stage 4] Starting Graph update for artifact: ${artifactId}`);

    const artifact = await this.prisma.knowledgeArtifact.findUnique({
      where: { id: artifactId },
      include: {
        entityMentions: {
          include: { resolvedEntity: true },
        },
      },
    });

    if (!artifact) {
      this.logger.warn(`Artifact ${artifactId} not found. Skipping Stage 4.`);
      return;
    }

    if (artifact.graphStatus === ExtractionStatus.completed) {
      this.logger.debug(`Artifact ${artifactId} already in graph. Skipping.`);
      return;
    }

    if (!artifact.extractedData) {
      this.logger.warn(`Artifact ${artifactId} has no extractedData. Skipping.`);
      return;
    }

    await this.prisma.knowledgeArtifact.update({
      where: { id: artifactId },
      data: { graphStatus: ExtractionStatus.processing },
    });

    const session = this.graph.getSession();
    try {
      const extracted = artifact.extractedData as unknown as ExtractionResult;
      const { organizationId, entityMentions } = artifact;

      // Helper to find a resolved entity ID given an extracted name in this artifact
      const getResolvedId = (name: string): string | null => {
        if (!name) return null;
        const normalized = name.toLowerCase().trim();
        const mention = entityMentions.find(
          (m) => m.extractedName.toLowerCase().trim() === normalized,
        );
        return mention?.resolvedEntityId || null;
      };

      // 1. Upsert Entities
      for (const mention of entityMentions) {
        const entity = mention.resolvedEntity;
        const query = `
          MERGE (n:Entity {id: $id})
          SET n:${entity.type},
              n.canonicalName = $canonicalName,
              n.organizationId = $organizationId,
              n.type = $type,
              n.artifactIds = CASE WHEN NOT $artifactId IN coalesce(n.artifactIds, []) THEN coalesce(n.artifactIds, []) + $artifactId ELSE coalesce(n.artifactIds, []) END
        `;
        await session.run(query, {
          id: entity.id,
          canonicalName: entity.canonicalName,
          organizationId,
          type: entity.type,
          artifactId,
        });
      }

      // 2. Upsert Relationships
      for (const rel of extracted.relationships) {
        const subjId = getResolvedId(rel.subject);
        const objId = getResolvedId(rel.object);
        if (!subjId || !objId) continue; // Only map relationships where both sides were resolved

        // Neo4j relationship types must be uppercase, alphanumeric/underscore
        const pred = rel.predicate
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_');

        if (!pred) continue;

        const query = `
          MATCH (s:Entity {id: $subjId}), (o:Entity {id: $objId})
          MERGE (s)-[r:${pred}]->(o)
          SET r.artifactIds = CASE WHEN NOT $artifactId IN coalesce(r.artifactIds, []) THEN coalesce(r.artifactIds, []) + $artifactId ELSE coalesce(r.artifactIds, []) END
        `;
        await session.run(query, { subjId, objId, artifactId });
      }

      // 3. Upsert Claims
      for (const claim of extracted.claims) {
        if (!claim.statement) continue;
        const hash = this.hashContent(claim.statement, organizationId);
        const query = `
          MERGE (c:Claim {id: $id})
          SET c.statement = $statement,
              c.organizationId = $organizationId,
              c.artifactIds = CASE WHEN NOT $artifactId IN coalesce(c.artifactIds, []) THEN coalesce(c.artifactIds, []) + $artifactId ELSE coalesce(c.artifactIds, []) END
        `;
        await session.run(query, {
          id: hash,
          statement: claim.statement,
          organizationId,
          artifactId,
        });
      }

      // 4. Upsert Decisions
      for (const dec of extracted.decisions) {
        if (!dec.decision) continue;
        const hash = this.hashContent(dec.decision, organizationId);
        const query = `
          MERGE (d:Decision {id: $id})
          SET d.decision = $decision,
              d.organizationId = $organizationId,
              d.artifactIds = CASE WHEN NOT $artifactId IN coalesce(d.artifactIds, []) THEN coalesce(d.artifactIds, []) + $artifactId ELSE coalesce(d.artifactIds, []) END
        `;
        await session.run(query, {
          id: hash,
          decision: dec.decision,
          organizationId,
          artifactId,
        });

        if (dec.madeBy) {
          const madeById = getResolvedId(dec.madeBy);
          if (madeById) {
            await session.run(`
              MATCH (p:Entity {id: $madeById}), (d:Decision {id: $id})
              MERGE (p)-[r:MADE_DECISION]->(d)
              SET r.artifactIds = CASE WHEN NOT $artifactId IN coalesce(r.artifactIds, []) THEN coalesce(r.artifactIds, []) + $artifactId ELSE coalesce(r.artifactIds, []) END
            `, { madeById, id: hash, artifactId });
          }
        }
      }

      // 5. Upsert Action Items
      for (const item of extracted.actionItems) {
        if (!item.task) continue;
        const hash = this.hashContent(item.task, organizationId);
        const query = `
          MERGE (a:ActionItem {id: $id})
          SET a.task = $task,
              a.organizationId = $organizationId,
              a.dueDate = $dueDate,
              a.artifactIds = CASE WHEN NOT $artifactId IN coalesce(a.artifactIds, []) THEN coalesce(a.artifactIds, []) + $artifactId ELSE coalesce(a.artifactIds, []) END
        `;
        await session.run(query, {
          id: hash,
          task: item.task,
          dueDate: item.dueDate || null,
          organizationId,
          artifactId,
        });

        if (item.assignee) {
          const assigneeId = getResolvedId(item.assignee);
          if (assigneeId) {
            await session.run(`
              MATCH (p:Entity {id: $assigneeId}), (a:ActionItem {id: $id})
              MERGE (p)-[r:ASSIGNED_TO]->(a)
              SET r.artifactIds = CASE WHEN NOT $artifactId IN coalesce(r.artifactIds, []) THEN coalesce(r.artifactIds, []) + $artifactId ELSE coalesce(r.artifactIds, []) END
            `, { assigneeId, id: hash, artifactId });
          }
        }
      }

      await this.prisma.knowledgeArtifact.update({
        where: { id: artifactId },
        data: {
          graphStatus: ExtractionStatus.completed,
          graphSyncedAt: new Date(),
        },
      });

      this.logger.log(`[Stage 4] Graph updated successfully for artifact ${artifactId}`);
    } catch (error) {
      this.logger.error(`[Stage 4] Graph update failed for artifact ${artifactId}: ${error.message}`);
      await this.prisma.knowledgeArtifact.update({
        where: { id: artifactId },
        data: { graphStatus: ExtractionStatus.failed },
      });
    } finally {
      await session.close();
    }
  }

  async syncOrphanedArtifacts(): Promise<void> {
    const orphans = await this.prisma.knowledgeArtifact.findMany({
      where: {
        resolutionStatus: ExtractionStatus.completed,
        graphStatus: { in: [ExtractionStatus.pending, ExtractionStatus.failed] },
      },
      select: { id: true },
      orderBy: { resolvedAt: 'asc' },
    });

    if (orphans.length === 0) return;

    this.logger.log(`[Stage 4] Scheduler found ${orphans.length} orphaned artifact(s) to sync to Graph.`);

    for (const { id } of orphans) {
      await this.updateArtifactInGraph(id).catch((err) =>
        this.logger.error(`[Stage 4] Orphan sync failed for ${id}: ${err.message}`),
      );
    }
  }

  private hashContent(content: string, orgId: string): string {
    return crypto
      .createHash('sha256')
      .update(content.trim().toLowerCase() + orgId)
      .digest('hex');
  }
}
