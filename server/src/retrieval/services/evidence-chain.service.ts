import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RankedArtifactInfo } from './graph-search.service';
import { RETRIEVAL_CONSTANTS } from '../constants';

export interface EvidenceNode {
  artifactId: string;
  type: string;
  provider: string;
  timestamp: Date;
  title: string | null;
  content: string | null;
  relevanceScore: number;
  graphReasons: string[];
}

@Injectable()
export class EvidenceChainService {
  private readonly logger = new Logger(EvidenceChainService.name);

  constructor(private readonly prisma: PrismaService) {}

  async fetchArtifactMetadata(
    organizationId: string,
    artifactIds: string[],
  ): Promise<Map<string, { title: string; type: string }>> {
    const artifacts = await this.prisma.knowledgeArtifact.findMany({
      where: {
        id: { in: artifactIds },
        organizationId,
      },
      select: {
        id: true,
        title: true,
        type: true,
      },
    });

    const map = new Map<string, { title: string; type: string }>();
    for (const a of artifacts) {
      map.set(a.id, { title: a.title || 'Untitled', type: a.type });
    }
    return map;
  }

  async constructChain(
    organizationId: string,
    rankedArtifacts: RankedArtifactInfo[],
    timeFilter?: {
      requiresRecency: boolean;
      startDate: string | null;
      endDate: string | null;
    } | null,
  ): Promise<EvidenceNode[]> {
    if (!rankedArtifacts || rankedArtifacts.length === 0) {
      return [];
    }

    const artifactIds = rankedArtifacts.map((ra) => ra.artifactId);

    const whereClause: any = {
      id: { in: artifactIds },
      organizationId,
    };

    if (timeFilter?.startDate || timeFilter?.endDate) {
      whereClause.createdAt = {};
      if (timeFilter.startDate) {
        whereClause.createdAt.gte = new Date(timeFilter.startDate);
      }
      if (timeFilter.endDate) {
        whereClause.createdAt.lte = new Date(timeFilter.endDate);
      }
    }

    // Fetch the raw artifacts from the database
    const artifacts = await this.prisma.knowledgeArtifact.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        provider: true,
        createdAt: true,
        title: true,
        content: true, // We will use the generated summary/content for the LLM context to avoid exceeding token limits with raw data
      },
    });

    // Deduplicate artifacts by exact match and high line-based similarity (to catch shifted chunks)
    const uniqueContentSet = new Set<string>();
    const deduplicatedArtifacts = artifacts.filter((artifact) => {
      const content = artifact.content || '';

      // 1. Check for exact match
      if (uniqueContentSet.has(content)) {
        return false;
      }

      // 2. Check for high line-overlap similarity (catches shifted commit chunks)
      for (const existingContent of uniqueContentSet) {
        // Quick length check to skip expensive comparisons on obviously different chunks
        if (Math.abs(existingContent.length - content.length) < 1000) {
          const linesA = new Set(
            existingContent.split('\n').filter((l) => l.trim().length > 0),
          );
          const linesB = new Set(
            content.split('\n').filter((l) => l.trim().length > 0),
          );

          let overlap = 0;
          for (const line of linesB) {
            if (linesA.has(line)) {
              overlap++;
            }
          }

          const maxLines = Math.max(linesA.size, linesB.size);
          // If 80% of the non-empty lines are identical, it's a shifted duplicate
          if (maxLines > 0 && overlap / maxLines > 0.8) {
            return false;
          }
        }
      }

      uniqueContentSet.add(content);
      return true;
    });

    // Map the database artifacts to Evidence Nodes, combining with graph scores
    const evidenceNodes: EvidenceNode[] = deduplicatedArtifacts.map(
      (artifact) => {
        const rankInfo = rankedArtifacts.find(
          (ra) => ra.artifactId === artifact.id,
        );
        return {
          artifactId: artifact.id,
          type: artifact.type,
          provider: artifact.provider,
          timestamp: artifact.createdAt,
          title: artifact.title,
          content: artifact.content,
          relevanceScore: rankInfo?.score || 0,
          graphReasons: rankInfo?.reasons || [],
        };
      },
    );

    let sortedNodes = evidenceNodes;
    if (timeFilter?.requiresRecency) {
      this.logger.log('========================================');
      this.logger.log('Evidence Chain: Sorting by Recency DESC (Date)');
      this.logger.log('========================================');
      sortedNodes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      this.logger.log('========================================');
      this.logger.log(
        'Evidence Chain: Sorting by Relevance Score DESC (Graph)',
      );
      this.logger.log('========================================');
      sortedNodes.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Slice to top MAX_EVIDENCE_CHAINS
    const slicedNodes = sortedNodes.slice(
      0,
      RETRIEVAL_CONSTANTS.MAX_EVIDENCE_CHAINS,
    );

    // Sort chronologically to form the "Evidence Chain" (timeline)
    slicedNodes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    this.logger.log(
      `Constructed Evidence Chain with ${slicedNodes.length} nodes (from ${evidenceNodes.length} candidates).`,
    );
    return slicedNodes;
  }
}
