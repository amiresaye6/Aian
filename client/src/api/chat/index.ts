import api from "../axios";

export interface EvidenceNode {
  artifactId: string;
  type: string;
  provider: string;
  timestamp: string;
  title: string | null;
  content: string | null;
  relevanceScore: number;
  graphReasons: string[];
}

export interface ChatResponse {
  answer: string;
  evidenceChains: EvidenceNode[];
}

export const chatApi = {
  askQuestion: async (query: string): Promise<ChatResponse> => {
    // Note: The NestJS endpoint returns { success: true, data: { answer, evidenceChains } } 
    // depending on global interceptors. If it wraps in 'data', Axios double wraps it.
    // Let's inspect the response shape safely.
    const response = await api.post("/chat/query", { query });
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
};
