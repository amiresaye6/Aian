export interface ResolvedEntity {
  id: string;
  organizationId: string;
  canonicalName: string;
  normalizedName: string;
  type: string;
  aliases: string[];
  providerIds: Record<string, string>;
  confidence: number;
  firstSeenAt: string;
  lastSeenAt: string;
  _count?: {
    mentions: number;
  };
  mentions?: EntityMention[];
}

export interface EntityMention {
  id: string;
  resolvedEntityId: string;
  artifactId: string;
  extractedName: string;
  confidence: number;
  createdAt: string;
  artifact?: {
    id: string;
    title: string | null;
    type: string;
    provider: string;
    createdAt: string;
  };
}

export interface PaginatedEntitiesResponse {
  data: ResolvedEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MergeEntitiesRequest {
  primaryEntityId: string;
  secondaryEntityId: string;
}

export interface MergeEntitiesResponse {
  message: string;
  primaryEntity: ResolvedEntity;
}
