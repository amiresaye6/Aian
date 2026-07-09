export interface EyeStatusItem {
  eyeType: string;
  providerName: string | null;
  status: string;
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
  memberCount: number;
  roleCount: number;
}