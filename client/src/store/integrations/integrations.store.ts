import { create } from "zustand";
import { getOwnerDashboard } from "@/api/dashboard";
import { getProvidersMetadata } from "@/api/integrations";
import { PROVIDER_GLYPHS, Provider } from "@/components/features/integrations/providers";

type IntegrationsState = {
  providers: Provider[];
  isLoading: boolean;
  error: Error | null;
  fetchIntegrations: () => Promise<void>;
  getProviderByKey: (key: string) => Provider | undefined;
};

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  providers: [],
  isLoading: false,
  error: null,
  fetchIntegrations: async () => {
    set({ isLoading: true, error: null });
    try {
      const metadataRes = await getProvidersMetadata();
      const providersList = metadataRes.map((meta: any) => {
        meta.glyph = PROVIDER_GLYPHS[meta.key] || PROVIDER_GLYPHS.jira;
        meta.status = "disconnected";
        meta.health = 0;
        meta.knowledgeItems = 0;
        meta.lastSyncMin = 0;
        meta.resources = 0;
        meta.sampleResources = meta.sampleResources || [];
        meta.workspace = meta.defaultWorkspaceName;
        return meta;
      });

      // Set base providers immediately so UI doesn't hang
      set({ providers: providersList });

      // Then fetch and overlay dashboard data
      try {
        const dashboardData = await getOwnerDashboard();
        if (dashboardData?.eyes) {
          set((state) => ({
            providers: state.providers.map((p: any) => {
              const eye = dashboardData.eyes.find((e: any) => e.providerName === p.name);
              const integration = dashboardData.integrations?.find((i: any) => i.organizationEyeId === eye?.id);
              
              if (eye) {
                let lastSyncMin = 0;
                let nextSyncMin = dashboardData?.processingSettings?.timeIntervalHours ? dashboardData.processingSettings.timeIntervalHours * 60 : 360;
                
                if (integration?.lastSyncAt) {
                  const lastSyncDate = new Date(integration.lastSyncAt);
                  lastSyncMin = Math.max(0, Math.round((Date.now() - lastSyncDate.getTime()) / 60000));
                  nextSyncMin = Math.max(0, nextSyncMin - lastSyncMin);
                }

                return {
                  ...p,
                  status: eye.status as any,
                  health: integration ? 100 : 0, 
                  knowledgeItems: integration?.knowledgeItems || 0,
                  connectionId: integration?.id,
                  organizationEyeId: eye.id,
                  lastSyncMin,
                  nextSyncMin,
                };
              }
              return p;
            }),
          }));
        }
      } catch (dashErr) {
        console.warn("Failed to fetch dashboard data for integrations:", dashErr);
      }

    } catch (error: any) {
      set({ error });
    } finally {
      set({ isLoading: false });
    }
  },
  getProviderByKey: (key: string) => {
    return get().providers.find((p) => p.key.toLowerCase() === key.toLowerCase());
  },
}));
