import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, ChatMessage, conversationsApi } from "@/api/conversations";

export interface ExtendedMessage extends Omit<ChatMessage, "id" | "conversationId" | "createdAt"> {
  id?: string;
  conversationId?: string;
  createdAt?: string;
  evidenceChains?: any[]; // Store evidence chains for assistant messages
  isError?: boolean;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ExtendedMessage[]; // Messages for the active conversation
  isSidebarOpen: boolean;
  isLoadingConversations: boolean;
  isSearching: boolean;
  isCreatingNewChat: boolean;
  
  // Actions
  setSidebarOpen: (isOpen: boolean) => void;
  loadConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => Promise<void>;
  addMessage: (msg: ExtendedMessage) => void;
  updateMessage: (index: number, msg: Partial<ExtendedMessage>) => void;
  createNewConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  setConversations: (conversations: Conversation[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isSidebarOpen: false,
      isLoadingConversations: false,
      isSearching: false,
      isCreatingNewChat: false,

      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      loadConversations: async () => {
        set({ isLoadingConversations: true });
        try {
          const conversations = await conversationsApi.listConversations();
          set({ conversations, isLoadingConversations: false });
        } catch (error) {
          console.error("Failed to load conversations:", error);
          set({ isLoadingConversations: false });
        }
      },

      setActiveConversation: async (id) => {
        if (!id) {
          set({ activeConversationId: null, messages: [], isCreatingNewChat: false });
          return;
        }

        set({ activeConversationId: id, isCreatingNewChat: false });
        try {
          const conversation = await conversationsApi.getConversation(id);
          // Map DB messages to ExtendedMessage format
          const mappedMessages: ExtendedMessage[] = (conversation.messages || []).map((msg) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
          }));
          set({ messages: mappedMessages });
        } catch (error) {
          console.error(`Failed to load conversation ${id}:`, error);
          set({ messages: [] });
        }
      },

      addMessage: (msg) => {
        set((state) => ({ messages: [...state.messages, msg] }));
      },

      updateMessage: (index, partialMsg) => {
        set((state) => {
          const newMessages = [...state.messages];
          newMessages[index] = { ...newMessages[index], ...partialMsg };
          return { messages: newMessages };
        });
      },

      createNewConversation: () => {
        set({ activeConversationId: null, messages: [], isCreatingNewChat: true });
      },

      deleteConversation: async (id) => {
        try {
          await conversationsApi.deleteConversation(id);
          set((state) => {
            const filtered = state.conversations.filter((c) => c.id !== id);
            return {
              conversations: filtered,
              activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
              messages: state.activeConversationId === id ? [] : state.messages,
            };
          });
        } catch (error) {
          console.error(`Failed to delete conversation ${id}:`, error);
        }
      },

      searchConversations: async (query) => {
        if (!query.trim()) {
          get().loadConversations();
          return;
        }
        
        set({ isSearching: true });
        try {
          const results = await conversationsApi.searchConversations(query);
          set({ conversations: results, isSearching: false });
        } catch (error) {
          console.error("Failed to search conversations:", error);
          set({ isSearching: false });
        }
      },

      setConversations: (conversations) => set({ conversations }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ 
        isSidebarOpen: state.isSidebarOpen,
        // We do not persist messages or activeConversationId heavily because we want the DB to be source of truth
        // But for a seamless refresh, we can persist them temporarily
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
