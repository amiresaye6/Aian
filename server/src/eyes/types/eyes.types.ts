export interface EyeStatusItem {
  eyeType: string;
  providerName: string | null;
  status: string;
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
