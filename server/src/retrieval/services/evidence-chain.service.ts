import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RankedArtifactInfo } from './graph-search.service';

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

  async constructChain(
    organizationId: string,
    rankedArtifacts: RankedArtifactInfo[],
  ): Promise<EvidenceNode[]> {
    if (!rankedArtifacts || rankedArtifacts.length === 0) {
      return [];
    }

    const artifactIds = rankedArtifacts.map((ra) => ra.artifactId);

    // Fetch the raw artifacts from the database
    const artifacts = await this.prisma.knowledgeArtifact.findMany({
      where: {
        id: { in: artifactIds },
        organizationId,
      },
      select: {
        id: true,
        type: true,
        provider: true,
        createdAt: true,
        title: true,
        content: true, // We will use the generated summary/content for the LLM context to avoid exceeding token limits with raw data
      },
    });

    // Map the database artifacts to Evidence Nodes, combining with graph scores
    const evidenceNodes: EvidenceNode[] = artifacts.map((artifact) => {
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
    });

    // Sort chronologically to form the "Evidence Chain" (timeline)
    evidenceNodes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    this.logger.log(
      `Constructed Evidence Chain with ${evidenceNodes.length} nodes.`,
    );
    return evidenceNodes;
  }
}
