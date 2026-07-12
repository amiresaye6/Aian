import api from "../axios";

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  description: string;
  industry: string;
  companySize: string;
  country: string;
  timezone: string;
  logoUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  companySize: string | null;
  country: string | null;
  timezone: string;
  logoUrl: string | null;
  status: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type EyeTypeKey = "chat" | "meeting" | "task" | "coding";

export interface ProviderSelection {
  eyeType: EyeTypeKey;
  providerKey: string;
}

export interface UpdateProvidersPayload {
  providers: ProviderSelection[];
}

export interface UpdatedEye {
  id: string;
  status: string;
  eyeTypeId: string;
  selectedProviderId: string;
}

export interface OnboardingProgress {
  id: string;
  organizationId: string;
  currentStep: string;
  completedSteps: Record<string, boolean>;
  isCompleted: boolean;
  startedAt: string;
  completedAt: string | null;
}

export const onboardingApi = {
  createOrganization: async (
    payload: CreateOrganizationPayload,
  ): Promise<{ success: boolean; message?: string; data: Organization }> => {
    const response = await api.post("/onboarding/organization", payload);
    return response.data;
  },

  getProgress: async (): Promise<{
    success: boolean;
    data: OnboardingProgress;
  }> => {
    const response = await api.get("/onboarding/progress");
    return response.data;
  },

  updateProviders: async (
    payload: UpdateProvidersPayload,
  ): Promise<{
    success: boolean;
    message?: string;
    data: { updatedEyes: UpdatedEye[] };
  }> => {
    const response = await api.put("/onboarding/providers", payload);
    return response.data;
  },

  completeOnboarding: async (): Promise<{
    success: boolean;
    data: OnboardingProgress;
  }> => {
    const response = await api.post("/onboarding/complete");
    return response.data;
  },

  uploadOrganizationLogo: async (
  file: File
): Promise<{
  success: boolean;
  data: { logoUrl: string };
}> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/onboarding/organization/logo",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
},
};
