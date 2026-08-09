import api from "../axios";
import { EvidenceNode } from "../chat";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export const conversationsApi = {
  createConversation: async (title: string): Promise<Conversation> => {
    const response = await api.post("/conversations", { title });
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  listConversations: async (): Promise<Conversation[]> => {
    const response = await api.get("/conversations");
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const response = await api.get(`/conversations/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  },

  searchConversations: async (query: string): Promise<Conversation[]> => {
    const response = await api.get(`/conversations/search`, { params: { q: query } });
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
};
