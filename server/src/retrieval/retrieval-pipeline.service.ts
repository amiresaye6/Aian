import { Injectable, Logger } from '@nestjs/common';
import { QueryUnderstandingService } from './services/query-understanding.service';
import { GraphSearchService } from './services/graph-search.service';
import {
  EvidenceChainService,
  EvidenceNode,
} from './services/evidence-chain.service';
import { ContextBuilderService } from './services/context-builder.service';

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

    // Stage 1: Query Understanding
    const understanding = await this.queryUnderstanding.analyzeQuery(
      organizationId,
      query,
    );

    // Stage 2 & 3: Graph Search & Ranking
    const rankedArtifacts = await this.graphSearch.searchAndRankArtifacts(
      organizationId,
      understanding.entities,
    );

    // Stage 4 & 5: Artifact Retrieval & Evidence Chain Construction
    const evidenceChains = await this.evidenceChain.constructChain(
      organizationId,
      rankedArtifacts,
    );

    // Stage 6: Context Builder
    const contextString = this.contextBuilder.buildContext(evidenceChains);

    this.logger.log('Retrieval pipeline completed successfully.');

    return {
      contextString,
      evidenceChains,
    };
  }
}
