import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface StageStatus {
  status: 'idle' | 'active' | 'completed' | 'partial';
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface PipelineStatusResponse {
  status:
    'idle' | 'batching' | 'processing' | 'completed' | 'failed' | 'partial';
  syncRunId: string | null;
  currentStage: string | null;
  overallProgress: number;
  stages: {
    batching: {
      status: 'idle' | 'active' | 'completed';
      batchCount: number;
      batchesCompleted: number;
      totalItems: number;
    };
    assembly: {
      status: 'idle' | 'active' | 'completed';
      totalArtifacts: number;
      assembled: number;
    };
    extraction: StageStatus;
    resolution: StageStatus;
    graphSync: StageStatus;
  };
  startedAt: string | null;
  lastCompletedAt: string | null;
  totalItems: number;
  totalArtifacts: number;
  failedCount: number;
  pendingItemCount: number;
}

@Injectable()
export class PipelineStatusService {
  private readonly logger = new Logger(PipelineStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPipelineStatus(
    organizationId: string,
  ): Promise<PipelineStatusResponse> {
    // 1. Find the latest SyncRun for this organization
    const latestRun = await this.prisma.syncRun.findFirst({
      where: { organizationId },
      orderBy: { startedAt: 'desc' },
      include: {
        batches: {
          select: { id: true, status: true, itemCount: true },
        },
      },
    });

    // 2. Count pending items (not yet in any batch)
    const pendingItemCount = await this.prisma.knowledgeItem.count({
      where: { organizationId, ingestionStatus: 'pending' },
    });

    // If no sync run exists, return idle state
    if (!latestRun) {
      return this.buildIdleResponse(pendingItemCount);
    }

    // 3. Get artifact stage counts for this sync run's timeframe
    //    We look at all artifacts created since the sync run started
    const artifactCounts = await this.getArtifactStageCounts(
      organizationId,
      latestRun.startedAt,
    );

    // 4. Build batch stage info
    const batchCount = latestRun.batches.length;
    const batchesCompleted = latestRun.batches.filter(
      (b) => b.status === 'handed_off' || b.status === 'acknowledged',
    ).length;
    const batchTotalItems = latestRun.batches.reduce(
      (sum, b) => sum + b.itemCount,
      0,
    );
    const batchesActive = latestRun.batches.some(
      (b) => b.status === 'pending' || b.status === 'locked',
    );

    // 5. Build stage statuses
    const batchingStage = {
      status: batchesActive
        ? ('active' as const)
        : batchCount > 0
          ? ('completed' as const)
          : ('idle' as const),
      batchCount,
      batchesCompleted,
      totalItems: batchTotalItems || latestRun.totalItems,
    };

    const assemblyStage = {
      status:
        artifactCounts.total > 0
          ? ('completed' as const)
          : batchesActive
            ? ('idle' as const)
            : ('active' as const),
      totalArtifacts: artifactCounts.total,
      assembled: artifactCounts.total,
    };

    const extractionStage = this.buildStageStatus(artifactCounts.extraction);
    const resolutionStage = this.buildStageStatus(artifactCounts.resolution);
    const graphSyncStage = this.buildStageStatus(artifactCounts.graphSync);

    // 6. Determine current stage
    const currentStage = this.determineCurrentStage(
      batchingStage,
      assemblyStage,
      extractionStage,
      resolutionStage,
      graphSyncStage,
      latestRun.status,
    );

    // 7. Calculate overall progress
    const overallProgress = this.calculateOverallProgress(
      batchingStage,
      extractionStage,
      resolutionStage,
      graphSyncStage,
    );

    // 8. Determine overall status
    const totalFailed =
      artifactCounts.extraction.failed +
      artifactCounts.resolution.failed +
      artifactCounts.graphSync.failed;

    let overallStatus: PipelineStatusResponse['status'];
    if (latestRun.status === 'completed') {
      overallStatus = totalFailed > 0 ? 'partial' : 'completed';
    } else if (latestRun.status === 'failed') {
      overallStatus = 'failed';
    } else if (currentStage === 'batching') {
      overallStatus = 'batching';
    } else if (currentStage) {
      overallStatus = 'processing';
    } else {
      // Run is 'running' but no active stage detected — check if everything is done
      const allDone =
        artifactCounts.total > 0 &&
        artifactCounts.graphSync.completed + artifactCounts.graphSync.failed ===
          artifactCounts.total;
      if (allDone) {
        overallStatus = totalFailed > 0 ? 'partial' : 'completed';
        // Auto-complete the sync run
        await this.completeSyncRun(
          latestRun.id,
          totalFailed > 0 ? 'partial' : 'completed',
        );
      } else {
        overallStatus = 'processing';
      }
    }

    return {
      status: overallStatus,
      syncRunId: latestRun.id,
      currentStage,
      overallProgress,
      stages: {
        batching: batchingStage,
        assembly: assemblyStage,
        extraction: extractionStage,
        resolution: resolutionStage,
        graphSync: graphSyncStage,
      },
      startedAt: latestRun.startedAt.toISOString(),
      lastCompletedAt: latestRun.completedAt?.toISOString() ?? null,
      totalItems: batchTotalItems || latestRun.totalItems,
      totalArtifacts: artifactCounts.total,
      failedCount: totalFailed,
      pendingItemCount,
    };
  }

  private async getArtifactStageCounts(organizationId: string, since: Date) {
    const artifacts = await this.prisma.knowledgeArtifact.findMany({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
      select: {
        extractionStatus: true,
        resolutionStatus: true,
        graphStatus: true,
      },
    });

    const total = artifacts.length;

    const countByStatus = (
      field: 'extractionStatus' | 'resolutionStatus' | 'graphStatus',
    ) => {
      const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
      for (const artifact of artifacts) {
        const status = artifact[field] as string;
        if (status in counts) {
          counts[status as keyof typeof counts]++;
        }
      }
      return counts;
    };

    return {
      total,
      extraction: countByStatus('extractionStatus'),
      resolution: countByStatus('resolutionStatus'),
      graphSync: countByStatus('graphStatus'),
    };
  }

  private buildStageStatus(counts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }): StageStatus {
    const total =
      counts.pending + counts.processing + counts.completed + counts.failed;
    let status: StageStatus['status'];

    if (total === 0) {
      status = 'idle';
    } else if (
      counts.processing > 0 ||
      (counts.pending > 0 && counts.completed > 0)
    ) {
      status = 'active';
    } else if (counts.pending === 0 && counts.processing === 0) {
      status = counts.failed > 0 ? 'partial' : 'completed';
    } else {
      status = 'idle';
    }

    return { status, total, ...counts };
  }

  private determineCurrentStage(
    batching: { status: string },
    assembly: { status: string },
    extraction: StageStatus,
    resolution: StageStatus,
    graphSync: StageStatus,
    runStatus: string,
  ): string | null {
    if (
      runStatus === 'completed' ||
      runStatus === 'failed' ||
      runStatus === 'partial'
    ) {
      return null;
    }
    if (batching.status === 'active') return 'batching';
    if (assembly.status === 'active') return 'assembly';
    if (extraction.status === 'active') return 'extraction';
    if (resolution.status === 'active') return 'resolution';
    if (graphSync.status === 'active') return 'graphSync';

    // Check for pending work
    if (extraction.pending > 0) return 'extraction';
    if (resolution.pending > 0) return 'resolution';
    if (graphSync.pending > 0) return 'graphSync';

    return null;
  }

  private calculateOverallProgress(
    batching: { status: string; batchCount: number; batchesCompleted: number },
    extraction: StageStatus,
    resolution: StageStatus,
    graphSync: StageStatus,
  ): number {
    // Weight: batching 10%, extraction 40%, resolution 25%, graph_sync 25%
    const batchProgress =
      batching.batchCount > 0
        ? (batching.batchesCompleted / batching.batchCount) * 100
        : batching.status === 'completed'
          ? 100
          : 0;

    const extractionProgress =
      extraction.total > 0
        ? ((extraction.completed + extraction.failed) / extraction.total) * 100
        : 0;

    const resolutionProgress =
      resolution.total > 0
        ? ((resolution.completed + resolution.failed) / resolution.total) * 100
        : 0;

    const graphProgress =
      graphSync.total > 0
        ? ((graphSync.completed + graphSync.failed) / graphSync.total) * 100
        : 0;

    const weighted =
      batchProgress * 0.1 +
      extractionProgress * 0.4 +
      resolutionProgress * 0.25 +
      graphProgress * 0.25;

    return Math.round(weighted);
  }

  private async completeSyncRun(
    syncRunId: string,
    status: string,
  ): Promise<void> {
    try {
      await this.prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          status,
          completedAt: new Date(),
          currentStage: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to complete sync run ${syncRunId}: ${error.message}`,
      );
    }
  }

  private buildIdleResponse(pendingItemCount: number): PipelineStatusResponse {
    const emptyStage: StageStatus = {
      status: 'idle',
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    return {
      status: 'idle',
      syncRunId: null,
      currentStage: null,
      overallProgress: 0,
      stages: {
        batching: {
          status: 'idle',
          batchCount: 0,
          batchesCompleted: 0,
          totalItems: 0,
        },
        assembly: { status: 'idle', totalArtifacts: 0, assembled: 0 },
        extraction: { ...emptyStage },
        resolution: { ...emptyStage },
        graphSync: { ...emptyStage },
      },
      startedAt: null,
      lastCompletedAt: null,
      totalItems: 0,
      totalArtifacts: 0,
      failedCount: 0,
      pendingItemCount,
    };
  }
}
