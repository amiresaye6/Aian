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
    relationships: string[] = [],
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

      let result;

      if (extractedEntities.length >= 2) {
        this.logger.debug(
          `Executing shortest-path graph search for entities: ${extractedEntities.join(', ')}`,
        );
        // Multi-Entity: Find shortest paths between pairs
        const shortestPathQuery = `
          MATCH (start:Entity), (end:Entity)
          WHERE start.organizationId = $organizationId AND end.organizationId = $organizationId
            AND start.id <> end.id
            AND (
              toLower(start.canonicalName) IN [e IN $entities | toLower(e)] 
              OR any(alias IN coalesce(start.aliases, []) WHERE toLower(alias) IN [e IN $entities | toLower(e)])
            )
            AND (
              toLower(end.canonicalName) IN [e IN $entities | toLower(e)] 
              OR any(alias IN coalesce(end.aliases, []) WHERE toLower(alias) IN [e IN $entities | toLower(e)])
            )
          
          // Find shortest paths up to 4 hops
          MATCH p = allShortestPaths((start)-[*1..4]-(end))
          
          // Extract from nodes and relationships safely
          WITH p, 
               [n IN nodes(p) | {ids: coalesce(n.artifactIds, []), type: labels(n)[0]}] AS nodeData,
               [r IN relationships(p) | {ids: coalesce(r.artifactIds, []), type: type(r)}] AS relData
               
          UNWIND nodeData + relData AS item
          UNWIND item.ids AS artifactId
          
          // Determine type for weighting
          WITH artifactId, length(p) AS distance, item.type AS itemType
          
          // We can't do seed match counting easily on shortest path elements, so we hardcode a strong match
          WITH artifactId, min(distance) AS minDistance, count(*) AS occurrences, itemType, 2 AS seedMatchCount, 1 AS matchedRel
          
          RETURN artifactId, itemType AS nodeType, minDistance, occurrences, seedMatchCount, matchedRel
        `;
        
        result = await session.run(shortestPathQuery, {
          organizationId,
          entities: extractedEntities,
          relationships,
        });

        if (result.records.length === 0) {
          this.logger.warn(`Shortest-path returned 0 results. Falling back to radial search.`);
        }
      }

      if (!result || result.records.length === 0) {
        this.logger.debug(
          `Executing radial graph search for entities: ${extractedEntities.join(', ')}`,
        );
        // Fallback or Single-Entity: Radial expansion
        const radialQuery = `
          MATCH path = (start:Entity)-[*0..${RETRIEVAL_CONSTANTS.GRAPH_MAX_HOPS}]-(related)
          WHERE start.organizationId = $organizationId 
            AND (
              toLower(start.canonicalName) IN [e IN $entities | toLower(e)] 
              OR any(alias IN coalesce(start.aliases, []) WHERE toLower(alias) IN [e IN $entities | toLower(e)])
            )
          
          WITH path, start,
               CASE WHEN size($relationships) > 0 AND any(r IN relationships(path) WHERE type(r) IN $relationships) THEN 1 ELSE 0 END AS hasMatchingRel
          
          // Extract from nodes and relationships safely
          WITH start, hasMatchingRel, length(path) AS distance, 
               [n IN nodes(path) | {ids: coalesce(n.artifactIds, []), type: labels(n)[0]}] AS nodeData,
               [r IN relationships(path) | {ids: coalesce(r.artifactIds, []), type: type(r)}] AS relData
               
          UNWIND nodeData + relData AS item
          UNWIND item.ids AS artifactId
          
          WITH artifactId, distance, hasMatchingRel, start.id AS seedId, item.type AS itemType
          
          // Aggregate per artifact
          WITH artifactId, collect(DISTINCT seedId) AS connectedSeeds, min(distance) AS minDistance, count(*) AS occurrences, itemType, max(hasMatchingRel) AS matchedRel
          
          RETURN artifactId, itemType AS nodeType, minDistance, occurrences, size(connectedSeeds) AS seedMatchCount, matchedRel
        `;

        result = await session.run(radialQuery, {
          organizationId,
          entities: extractedEntities,
          relationships,
        });
      }

      // Step 2: Ranking
      const artifactScores = new Map<string, RankedArtifactInfo>();

      for (const record of result.records) {
        const artifactId = record.get('artifactId') as string;
        const nodeType = record.get('nodeType') as string;
        const minDistance = record.get('minDistance').toNumber();
        const occurrences = record.get('occurrences').toNumber();
        const seedMatchCount = record.get('seedMatchCount').toNumber();
        const matchedRel = record.get('matchedRel').toNumber();

        // Calculate score
        const typeWeight =
          RETRIEVAL_CONSTANTS.RANKING_WEIGHTS[
            nodeType as keyof typeof RETRIEVAL_CONSTANTS.RANKING_WEIGHTS
          ] || 0.5;

        // Distance decay: closer nodes score higher. (e.g. distance 0 -> 1.0, distance 1 -> 0.8, distance 2 -> 0.64)
        const distanceMultiplier = Math.pow(0.8, minDistance);
        
        // Exponential boost for intersection
        const intersectionMultiplier = Math.pow(2, Math.max(0, seedMatchCount - 1));
        
        // Massive boost if the specific requested relationship was found in the path
        const relationshipMultiplier = matchedRel === 1 ? 10 : 1;

        const scoreAddition =
          typeWeight * distanceMultiplier * intersectionMultiplier * relationshipMultiplier * (1 + Math.log10(occurrences));

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
      let ranked = Array.from(artifactScores.values()).sort(
        (a, b) => b.score - a.score,
      );

      if (ranked.length > 0) {
        const topScore = ranked[0].score;
        const threshold = Math.max(0.5, topScore * 0.3);
        ranked = ranked.filter((item) => item.score >= threshold);
      }

      ranked = ranked.slice(0, RETRIEVAL_CONSTANTS.GRAPH_MAX_CANDIDATES);

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
