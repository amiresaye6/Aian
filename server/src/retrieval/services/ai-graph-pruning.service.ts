import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { RankedArtifactInfo } from './graph-search.service';
import {
  GRAPH_PRUNING_SYSTEM_PROMPT,
  GRAPH_PRUNING_USER_PROMPT,
} from '../../ai/prompts';
import { z } from 'zod';

const GraphPruningSchema = z.object({
  selectedArtifactIds: z.array(z.string()),
});

@Injectable()
export class AiGraphPruningService {
  private readonly logger = new Logger(AiGraphPruningService.name);

  constructor(private readonly aiGateway: AiGatewayService) {}

  async pruneCandidates(
    organizationId: string,
    query: string,
    rankedArtifacts: RankedArtifactInfo[],
    metadataMap: Map<string, { title: string; type: string }>,
  ): Promise<string[]> {
    if (rankedArtifacts.length === 0) {
      return [];
    }

    // Build the lightweight metadata array
    const candidatesForAi = rankedArtifacts.map((artifact) => {
      const meta = metadataMap.get(artifact.artifactId) || {
        title: 'Unknown Title',
        type: 'Unknown Type',
      };
      return {
        id: artifact.artifactId,
        title: meta.title,
        type: meta.type,
        reasons: artifact.reasons,
      };
    });

    const candidatesJson = JSON.stringify(candidatesForAi, null, 2);

    this.logger.debug(
      `Sending ${candidatesForAi.length} candidates to AI for semantic pruning.`,
    );

    const userPrompt = GRAPH_PRUNING_USER_PROMPT.replace(
      '{query}',
      query,
    ).replace('{candidatesJson}', candidatesJson);

    try {
      const { data: result } = await this.aiGateway.generateStructuredOutput(
        userPrompt,
        GraphPruningSchema,
        'graph_pruning',
        'Prunes a list of candidate artifacts based on their semantic relevance to the query.',
        {
          temperature: 0,
          organizationId,
          feature: 'retrieval',
          systemPrompt: GRAPH_PRUNING_SYSTEM_PROMPT,
        }
      );

      this.logger.debug(`AI Graph Pruning OUT: ${JSON.stringify(result)}`);
      return result.selectedArtifactIds;
    } catch (error) {
      this.logger.error(`AI Pruning failed: ${error.message}`);
      // Fallback: If AI fails, return the top 15 IDs based on graph score
      return rankedArtifacts.slice(0, 15).map((a) => a.artifactId);
    }
  }
}
