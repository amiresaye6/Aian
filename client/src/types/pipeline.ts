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
  status: 'pending' | 'locked' | 'handed_off' | 'failed' | string;
  triggerType: string;
  itemCount: number;
  createdAt: string;
  lockedAt: string | null;
  handedOffAt: string | null;
  acknowledgedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
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
