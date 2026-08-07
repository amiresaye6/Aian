export interface EyeStatusItem {
  id: string;
  eyeType: string;
  category: string;
  tagline: string | null;
  providerKey: string | null;
  providerName: string | null;
  logoUrl: string | null;
  status: string;
  connectionId?: string | null;
}

export interface EyeDetailResponse {
  id: string;
  eyeType: string;
  providerName: string | null;
  providerLogoUrl: string | null;
  status: string;
  lastSyncedAt: string | null;
  connectionExplanation: string;
}

export interface ProviderCatalogItem {
  key: string;
  name: string;
  logoUrl: string | null;
  availableInV1: boolean;
}

export interface EyeCatalogResponse {
  key: string;
  name: string;
  description: string | null;
  providers: ProviderCatalogItem[];
}
