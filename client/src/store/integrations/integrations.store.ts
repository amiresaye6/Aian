import { create } from "zustand";
import { getOwnerDashboard } from "@/api/dashboard";
import { PROVIDER_LIST, Provider } from "@/components/features/integrations/providers";

type IntegrationsState = {
  providers: Provider[];
  isLoading: boolean;
  error: Error | null;
  fetchIntegrations: () => Promise<void>;
  getProviderByKey: (key: string) => Provider | undefined;
};

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  providers: PROVIDER_LIST,
  isLoading: false,
  error: null,
  fetchIntegrations: async () => {
    set({ isLoading: true, error: null });
    try {
      // getOwnerDashboard already uses useAuthStore's token via the axios interceptor
      const data = await getOwnerDashboard();
      
      if (data?.eyes) {
        set((state) => ({
          providers: state.providers.map((p) => {
            const eye = data.eyes.find((e: any) => e.providerName === p.name);
            const integration = data.integrations?.find((i: any) => i.organizationEyeId === eye?.id);
            
            if (eye) {
              return {
                ...p,
                status: eye.status as any,
                health: integration ? 100 : 0, 
                knowledgeItems: 0, // Could be derived if needed
                connectionId: integration?.id,
                organizationEyeId: eye.id,
              };
            }
            return p;
          }),
        }));
      }
    } catch (error: any) {
      set({ error });
    } finally {
      set({ isLoading: false });
    }
  },
  getProviderByKey: (key: string) => {
    return get().providers.find((p) => p.key === key);
  },
}));
