import { Injectable, OnApplicationShutdown, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class GraphService implements OnApplicationShutdown, OnApplicationBootstrap {
  private readonly logger = new Logger(GraphService.name);
  private readonly driver: Driver;

  constructor(private readonly config: ConfigService) {
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
}
