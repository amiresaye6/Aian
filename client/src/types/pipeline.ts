export interface ProcessingSettings {
  id?: string;
  organizationId: string;
  isAutoProcessingEnabled: boolean;
  timeIntervalHours: number;
  batchSize: number;
  pendingItemThreshold: number;
  llmModelPreference: string;
}

export interface IngestionBatch {
  id: string;
  organizationId: string;
  status: 'pending' | 'locked' | 'handed_off' | 'acknowledged' | 'failed' | string;
  triggerType: string;
  itemCount: number;
  createdAt: string;
  lockedAt: string | null;
  handedOffAt: string | null;
  acknowledgedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  syncRunId: string | null;
}

export interface KnowledgeItem {
  id: string;
  sourceProvider: string;
  sourceType: string;
  sourceId: string;
  authorId: string;
  authorName: string;
  content: string;
  rawPayload: any;
  batchId: string | null;
  createdAt: string;
  timestamp: string;
}

// ── Pipeline Status Types ───────────────────────────────────────────

export interface StageStatus {
  status: 'idle' | 'active' | 'completed' | 'partial';
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface BatchingStageStatus {
  status: 'idle' | 'active' | 'completed';
  batchCount: number;
  batchesCompleted: number;
  totalItems: number;
}

export interface AssemblyStageStatus {
  status: 'idle' | 'active' | 'completed';
  totalArtifacts: number;
  assembled: number;
}

export type PipelineOverallStatus =
  | 'idle'
  | 'batching'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partial';

export interface PipelineStatusResponse {
  status: PipelineOverallStatus;
  syncRunId: string | null;
  currentStage: string | null;
  overallProgress: number;
  stages: {
    batching: BatchingStageStatus;
    assembly: AssemblyStageStatus;
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

export interface SyncNowResponse {
  success: boolean;
  message: string;
  syncRunId: string | null;
  pendingItems: number;
}

/** @deprecated Use PipelineStatusResponse instead */
export interface SyncStatusResponse {
  isRunning: boolean;
  progress: number;
  currentStep: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
