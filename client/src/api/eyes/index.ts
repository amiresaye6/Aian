import api from "../axios";

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

export const eyesApi = {
  getCatalog: async (): Promise<EyeCatalogResponse[]> => {
    const response = await api.get<{ success: boolean; data: EyeCatalogResponse[] }>("/eyes/catalog");
    return response.data.data;
  },
};
