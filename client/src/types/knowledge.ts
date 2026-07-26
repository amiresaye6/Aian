export interface KnowledgeArtifact {
  id: string;
  title: string | null;
  type: string;
  provider: string;
  organizationId: string;
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed' | string;
  participants: any;
  extractedAt: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Detail fields returned by GET /:id
  content?: string;
  extractedData?: any;
}

export interface ArtifactActivity {
  date: string;
  count: number;
}

export interface BulkRetryDto {
  artifactIds?: string[];
  organizationId?: string;
}

export interface PaginatedArtifacts {
  data: KnowledgeArtifact[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
