import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { QueryUnderstandingService } from './services/query-understanding.service';
import { GraphSearchService } from './services/graph-search.service';
import {
  EvidenceChainService,
  EvidenceNode,
} from './services/evidence-chain.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AiGraphPruningService } from './services/ai-graph-pruning.service';

export interface RetrievalPipelineResult {
  contextString: string;
  evidenceChains: EvidenceNode[];
}

@Injectable()
export class RetrievalPipelineService {
  private readonly logger = new Logger(RetrievalPipelineService.name);

  constructor(
    private readonly queryUnderstanding: QueryUnderstandingService,
    private readonly graphSearch: GraphSearchService,
    private readonly aiGraphPruning: AiGraphPruningService,
    private readonly evidenceChain: EvidenceChainService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Executes Stages 1-6 of the GraphRAG pipeline.
   * This is the core intelligence engine that can be used by both Human Chat and Autonomous Agents.
   */
  async retrieveContext(
    organizationId: string,
    query: string,
  ): Promise<RetrievalPipelineResult> {
    this.logger.log(`Starting retrieval pipeline for query: "${query}"`);

    const understanding = await this.queryUnderstanding.analyzeQuery(
      organizationId,
      query,
    );

    if (understanding.isInjectionAttempt) {
      this.logger.warn(
        `Prompt injection attempt detected for query: "${query}"`,
      );
      throw new BadRequestException('I cannot fulfill this request.');
    }

    this.logger.log('========================================');
    this.logger.log(`Query Understanding OUT: ${JSON.stringify(understanding)}`);
    this.logger.log('========================================');

    // Stage 2 & 3: Graph Search & Ranking
    const seedNames = [...(understanding.entities || []), ...(understanding.people || [])];
    const relationships = understanding.relationships || [];
    
    this.logger.log('========================================');
    this.logger.log(`Graph Search IN: seedNames=${JSON.stringify(seedNames)}, relationships=${JSON.stringify(relationships)}`);
    this.logger.log('========================================');

    const rankedArtifacts = await this.graphSearch.searchAndRankArtifacts(
      organizationId,
      seedNames,
      relationships,
    );

    this.logger.log('========================================');
    this.logger.log(`Graph Search OUT: top 3 artifacts=${JSON.stringify(rankedArtifacts.slice(0, 3))}`);
    this.logger.log('========================================');

    // AI Graph Pruning Step
    const rankedArtifactIds = rankedArtifacts.map(a => a.artifactId);
    
    let prunedArtifacts = rankedArtifacts;
    if (rankedArtifactIds.length > 0) {
      const metadataMap = await this.evidenceChain.fetchArtifactMetadata(
        organizationId,
        rankedArtifactIds
      );
      
      const prunedIds = await this.aiGraphPruning.pruneCandidates(
        organizationId,
        query,
        rankedArtifacts,
        metadataMap
      );
      
      this.logger.log('========================================');
      this.logger.log(`AI Pruning OUT: kept ${prunedIds.length} out of ${rankedArtifacts.length} artifacts`);
      this.logger.log('========================================');
      
      // Filter the candidates down to the AI's choices
      const prunedSet = new Set(prunedIds);
      prunedArtifacts = rankedArtifacts.filter(a => prunedSet.has(a.artifactId));
    }

    // Stage 4 & 5: Artifact Retrieval & Evidence Chain Construction
    this.logger.log('========================================');
    this.logger.log(`Evidence Chain IN: timeFilter=${JSON.stringify(understanding.timeFilter)}`);
    this.logger.log('========================================');

    const evidenceChains = await this.evidenceChain.constructChain(
      organizationId,
      prunedArtifacts,
      understanding.timeFilter,
    );

    this.logger.log('========================================');
    this.logger.log(`Evidence Chain OUT: count=${evidenceChains.length}`);
    this.logger.log('========================================');

    // Stage 6: Context Builder
    const contextString = this.contextBuilder.buildContext(evidenceChains);

    this.logger.log('Retrieval pipeline completed successfully.');

    return {
      contextString,
      evidenceChains,
    };
  }
}
