import { Injectable, Logger } from '@nestjs/common';
import { GraphService } from '../../graph/graph.service';
import { RETRIEVAL_CONSTANTS } from '../constants';

export interface RankedArtifactInfo {
  artifactId: string;
  score: number;
  reasons: string[];
}

@Injectable()
export class GraphSearchService {
  private readonly logger = new Logger(GraphSearchService.name);

  constructor(private readonly graphService: GraphService) {}

  async searchAndRankArtifacts(
    organizationId: string,
    extractedEntities: string[],
  ): Promise<RankedArtifactInfo[]> {
    if (!extractedEntities || extractedEntities.length === 0) {
      this.logger.warn('No entities extracted to search the graph.');
      return [];
    }

    const session = this.graphService.getSession();
    try {
      // Step 1: Find subgraph and collect all artifactIds from nodes and edges along the paths
      // We will score each artifact based on how close it is to the seed entities
      // and the type of node it is associated with.

      const query = `
        MATCH path = (start:Entity)-[*0..${RETRIEVAL_CONSTANTS.GRAPH_MAX_HOPS}]-(related)
        WHERE start.organizationId = $organizationId 
          AND toLower(start.canonicalName) IN [e IN $entities | toLower(e)]
        
        UNWIND nodes(path) AS n
        UNWIND coalesce(n.artifactIds, []) AS artifactId
        
        // Get the node type/label
        WITH artifactId, labels(n)[0] AS nodeType, length(path) AS distance
        
        // Closer distance = higher score
        RETURN artifactId, nodeType, min(distance) AS minDistance, count(*) AS occurrences
      `;

      this.logger.debug(
        `Executing graph search for entities: ${extractedEntities.join(', ')}`,
      );

      const result = await session.run(query, {
        organizationId,
        entities: extractedEntities,
      });

      // Step 2: Ranking
      const artifactScores = new Map<string, RankedArtifactInfo>();

      for (const record of result.records) {
        const artifactId = record.get('artifactId') as string;
        const nodeType = record.get('nodeType') as string;
        const minDistance = record.get('minDistance').toNumber();
        const occurrences = record.get('occurrences').toNumber();

        // Calculate score
        const typeWeight =
          RETRIEVAL_CONSTANTS.RANKING_WEIGHTS[
            nodeType as keyof typeof RETRIEVAL_CONSTANTS.RANKING_WEIGHTS
          ] || 0.5;

        // Distance decay: closer nodes score higher. (e.g. distance 0 -> 1.0, distance 1 -> 0.8, distance 2 -> 0.64)
        const distanceMultiplier = Math.pow(0.8, minDistance);

        const scoreAddition =
          typeWeight * distanceMultiplier * (1 + Math.log10(occurrences));

        if (!artifactScores.has(artifactId)) {
          artifactScores.set(artifactId, {
            artifactId,
            score: 0,
            reasons: [],
          });
        }

        const info = artifactScores.get(artifactId)!;
        info.score += scoreAddition;

        const reason = `Connected via ${nodeType} (dist: ${minDistance})`;
        if (!info.reasons.includes(reason)) {
          info.reasons.push(reason);
        }
      }

      // Sort by score descending
      const ranked = Array.from(artifactScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, RETRIEVAL_CONSTANTS.MAX_EVIDENCE_CHAINS);

      this.logger.log(
        `Found and ranked ${ranked.length} artifacts from graph search.`,
      );
      return ranked;
    } catch (error) {
      this.logger.error(`Graph search failed: ${error.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }
}
