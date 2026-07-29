import { useMutation } from "@tanstack/react-query";
import { chatApi, ChatResponse } from "@/api/chat";

export function useAskQuestion() {
  return useMutation<ChatResponse, Error, string>({
    mutationFn: (query: string) => chatApi.askQuestion(query),
  });
}
