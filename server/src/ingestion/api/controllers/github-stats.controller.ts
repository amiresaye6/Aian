/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../repositories/provider-connection.repository';
import { CollectionRunRepository } from '../../repositories/collection-run.repository';
import { KnowledgeItemRepository } from '../../repositories/knowledge-item.repository';

/**
 * GitHub-specific stats endpoints for the GitHub Eye frontend
 * (Section 6.4 — collection statistics, pending count, recent activity).
 *
 * Amir's shared controllers (eyes/resources/health/batches) don't expose
 * this data directly, so this controller was built by us as authorized
 * by Amir ("if you need it, build your own controller").
 */
@Controller('eyes/:connectionId/stats')
export class GithubStatsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionRepo: ProviderConnectionRepository,
    private readonly collectionRunRepo: CollectionRunRepository,
    private readonly knowledgeItemRepo: KnowledgeItemRepository,
  ) {}

  /**
   * Collection statistics + recent activity, sourced from collection_runs.
   * GET /eyes/:connectionId/stats/collection-runs
   */
  @Get('collection-runs')
  async getCollectionRuns(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    const runs = await this.collectionRunRepo.findByOrganizationEyeId(
      connection.organizationEyeId,
      { take: 20 },
    );

    return runs;
  }

  /**
   * Count of pending Knowledge Items for this connection's provider.
   * GET /eyes/:connectionId/stats/pending-count
   */
  @Get('pending-count')
  async getPendingCount(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepo.findByIdMapped(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');

    // providerKey holds the lowercase string (e.g. "github"); KnowledgeItem.provider
    // stores it uppercase (e.g. "GITHUB", set by GitHubAdapterService) — normalize here.
    const count = await this.knowledgeItemRepo.countPendingByOrganizationAndProvider(
      connection.organizationId,
      connection.providerKey.toUpperCase(),
    );

    return { pendingCount: count };
  }
}