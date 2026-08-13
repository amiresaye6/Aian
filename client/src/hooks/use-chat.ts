import { useMutation } from "@tanstack/react-query";
import { chatApi, ChatResponse } from "@/api/chat";

export function useAskQuestion() {
  return useMutation<ChatResponse, Error, { query: string; conversationId?: string }>({
    mutationFn: ({ query, conversationId }) => chatApi.askQuestion(query, conversationId),
  });
}
