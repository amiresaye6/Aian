export interface DashboardOrganization {
  id: string;
  name: string;
  status: string;
  slug?: string;
  description?: string | null;
  companySize?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  country?: string | null;
}

export interface DashboardSubscription {
  billingCycle: string;
  status: string;
  currentPeriodEnd: string | null;
}

export interface DashboardOnboardingProgress {
  currentStep: string;
  isCompleted: boolean;
}

export interface DashboardEye {
  id: string;
  eyeType: string;
  eyeTypeName: string;
  providerName: string | null;
  status: string;
}

export interface DashboardIntegration {
  id: string;
  organizationEyeId: string;
  providerId: string;
  status: string;
  externalAccountName: string | null;
  lastSyncAt: string | null;
  connectedAt: string;
}

export interface DashboardSyncJob {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface DashboardKnowledgeFile {
  id: string;
  name: string;
  status: string;
  uploadedAt: string;
}

export interface DashboardOwnerData {
  organization: DashboardOrganization | null;
  subscription: DashboardSubscription | null;
  onboardingProgress: DashboardOnboardingProgress | null;
  eyes: DashboardEye[];
  integrations: DashboardIntegration[];
  syncJobs: DashboardSyncJob[];
  knowledgeFiles: DashboardKnowledgeFile[];
  memberCount: number;
  roleCount: number;
}