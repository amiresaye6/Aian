// @ts-nocheck
import { api } from "@/api/axios";
import { ArtifactActivity } from "@/types/knowledge";

export const knowledgeApi = {
  getKnowledgeActivity: async (connectionId: string) => {
    const response = await api.get<ArtifactActivity[]>(`/eyes/${connectionId}/knowledge/activity`);
    return response.data?.data || response.data;
  },
};

