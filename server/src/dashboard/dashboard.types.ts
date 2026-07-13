export interface EyeStatusItem {
  id: string;
  eyeType: string;
  providerName: string | null;
  status: string;
  eyeTypeName: string;
}
export interface IntegrationItem {
  id: string;
  organizationEyeId: string;
  providerId: string;
  status: string;
  externalAccountName: string | null;
  lastSyncAt: string | null;
  connectedAt: string;
}

export interface SyncJobItem {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface KnowledgeFileItem {
  id: string;
  name: string;
  status: string;
  uploadedAt: string;
}
export interface DashboardOwnerData {
  organization: {
    id: string;
    name: string;
    status: string;
    slug?: string;
    description?: string | null;
    companySize?: string | null;
    logo_url?: string | null;
    industry?: string | null;
    country?: string | null;
  } | null;
  subscription: {
    billingCycle: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  onboardingProgress: {
    currentStep: string;
    isCompleted: boolean;
  } | null;
  eyes: EyeStatusItem[];
  integrations: IntegrationItem[];
  syncJobs: SyncJobItem[];
  knowledgeFiles: KnowledgeFileItem[];
  memberCount: number;
  roleCount: number;
}
