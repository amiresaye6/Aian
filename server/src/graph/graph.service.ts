import {
  Injectable,
  OnApplicationShutdown,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { PrismaService } from '../prisma/prisma.service';
import { GraphResponse, GraphNode, GraphLink } from './graph.types';
import { GraphQueryDto } from './dto/graph-query.dto';
@Injectable()
export class GraphService
  implements OnApplicationShutdown, OnApplicationBootstrap
{
  private readonly logger = new Logger(GraphService.name);
  private readonly driver: Driver;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const uri = this.config.get<string>('NEO4J_URI', 'bolt://localhost:7687');
    const user = this.config.get<string>('NEO4J_USER', 'neo4j');
    const password = this.config.get<string>('NEO4J_PASSWORD', 'password');

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async onApplicationBootstrap() {
    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Successfully connected to Neo4j.');
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j:', error.message);
    }
  }

  async onApplicationShutdown() {
    await this.driver.close();
    this.logger.log('Neo4j driver closed.');
  }

  /**
   * Gets a new Neo4j session.
   * Remember to close the session after use (`await session.close()`).
   */
  getSession(): Session {
    return this.driver.session();
  }

  async getRankedGraph(
    orgId: string,
    query: GraphQueryDto,
  ): Promise<GraphResponse> {
    const limit = query.limit || 10;
    const minDegree = query.minDegree || 0;

    const session = this.getSession();
    try {
      // 1. Fetch top nodes by degree
      const topNodesResult = await session.run(
        `
        MATCH (n)
        WHERE n.organizationId = $orgId
        WITH n, COUNT { (n)--() } AS degree
        WHERE degree >= $minDegree
        ORDER BY degree DESC
        LIMIT $limit
        RETURN n.id AS id, n.canonicalName AS label, n.type AS type, degree
        `,
        { orgId, limit: neo4j.int(limit), minDegree: neo4j.int(minDegree) },
      );

      const topNodeIds = topNodesResult.records.map((r) => r.get('id'));

      // If no nodes found, return empty
      if (topNodeIds.length === 0) {
        return {
          nodes: [],
          links: [],
          meta: { truncated: false, totalNodeCount: 0 },
        };
      }

      // 2. Fetch relationships only between these top nodes
      const relsResult = await session.run(
        `
        MATCH (n)-[r]-(m)
        WHERE n.id IN $nodeIds AND m.id IN $nodeIds
        // To avoid duplicate relationships, we only take one direction
        AND id(n) < id(m) 
        RETURN n.id AS source, m.id AS target, type(r) AS type
        `,
        { nodeIds: topNodeIds },
      );

      // 3. Count total nodes to know if we truncated
      const countResult = await session.run(
        `MATCH (n) WHERE n.organizationId = $orgId RETURN count(n) AS total`,
        { orgId },
      );
      const totalNodeCount = countResult.records[0].get('total').toNumber();

      const nodes: GraphNode[] = topNodesResult.records.map((r) => ({
        id: r.get('id'),
        label: r.get('label') || r.get('id').substring(0, 8),
        type: r.get('type') || 'Unknown',
        degree: r.get('degree').toNumber(),
      }));

      const links: GraphLink[] = relsResult.records.map((r) => ({
        source: r.get('source'),
        target: r.get('target'),
        type: r.get('type'),
      }));

      return {
        nodes,
        links,
        meta: {
          truncated: totalNodeCount > nodes.length,
          totalNodeCount,
        },
      };
    } finally {
      await session.close();
    }
  }

  async getNodeNeighbors(
    orgId: string,
    nodeId: string,
  ): Promise<GraphResponse> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (n {id: $nodeId, organizationId: $orgId})-[r]-(m)
        WHERE m.organizationId = $orgId
        WITH n, r, m, COUNT { (m)--() } AS mDegree
        RETURN m.id AS id, m.canonicalName AS label, m.type AS type, mDegree AS degree, type(r) AS relType, startNode(r) = n AS isOutbound
        `,
        { orgId, nodeId },
      );

      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];

      result.records.forEach((r) => {
        nodes.push({
          id: r.get('id'),
          label: r.get('label') || r.get('id').substring(0, 8),
          type: r.get('type') || 'Unknown',
          degree: r.get('degree').toNumber(),
        });

        const isOutbound = r.get('isOutbound');
        links.push({
          source: isOutbound ? nodeId : r.get('id'),
          target: isOutbound ? r.get('id') : nodeId,
          type: r.get('relType'),
        });
      });

      return {
        nodes,
        links,
        meta: {
          truncated: false,
          totalNodeCount: nodes.length,
        },
      };
    } finally {
      await session.close();
    }
  }

  async getNodeDetails(orgId: string, nodeId: string): Promise<any> {
    const session = this.getSession();
    let neo4jNode = null;
    try {
      const result = await session.run(
        `MATCH (n) WHERE n.id = $nodeId AND n.organizationId = $orgId RETURN properties(n) as props`,
        { nodeId, orgId },
      );
      if (result.records.length > 0) {
        neo4jNode = result.records[0].get('props');
      }
    } catch (error) {
      this.logger.error(
        `Error fetching node details from Neo4j: ${error.message}`,
      );
    } finally {
      await session.close();
    }

    const entity = await this.prisma.resolvedEntity.findFirst({
      where: {
        id: nodeId,
        organizationId: orgId,
      },
      include: {
        mentions: {
          include: {
            artifact: true,
          },
        },
      },
    });

    if (!entity && !neo4jNode) {
      return null;
    }

    let artifacts: any[] = [];
    if (entity) {
      const artifactMap = new Map();
      entity.mentions.forEach((mention) => {
        if (!artifactMap.has(mention.artifact.id)) {
          artifactMap.set(mention.artifact.id, mention.artifact);
        }
      });
      artifacts = Array.from(artifactMap.values()).map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        updatedAt: a.updatedAt,
      }));
    } else if (neo4jNode && neo4jNode.artifactIds) {
      try {
        const artifactIds = JSON.parse(neo4jNode.artifactIds);
        if (Array.isArray(artifactIds) && artifactIds.length > 0) {
          const dbArtifacts = await this.prisma.knowledgeArtifact.findMany({
            where: { id: { in: artifactIds }, organizationId: orgId },
          });
          artifacts = dbArtifacts.map((a: any) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            updatedAt: a.updatedAt,
          }));
        }
      } catch (e) {
        // Ignored
      }
    }

    return {
      entity: {
        id: entity?.id || neo4jNode?.id,
        canonicalName:
          entity?.canonicalName ||
          neo4jNode?.canonicalName ||
          neo4jNode?.name ||
          neo4jNode?.title ||
          neo4jNode?.decision ||
          neo4jNode?.id.substring(0, 8),
        normalizedName:
          entity?.normalizedName || neo4jNode?.normalizedName || '',
        type: entity?.type || neo4jNode?.type || neo4jNode?.label || 'Unknown',
        confidence: entity?.confidence || neo4jNode?.confidence || 1,
        aliases:
          entity?.aliases ||
          (neo4jNode?.aliases ? JSON.parse(neo4jNode.aliases) : []),
      },
      artifacts,
    };
  }

  /**
   * Deletes all nodes and relationships associated with the specified organizationId from Neo4j.
   */
  async deleteOrganizationGraph(orgId: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (n)
        WHERE n.organizationId = $orgId
        DETACH DELETE n
        `,
        { orgId },
      );
      this.logger.log(
        `Successfully deleted Neo4j graph data for organizationId: ${orgId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete Neo4j graph data for organizationId ${orgId}: ${error.message}`,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

