"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Bot, User, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EvidenceChainCard } from "./EvidenceChainCard";
import { useAskQuestion } from "@/hooks/use-chat";
import { EvidenceNode } from "@/api/chat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useChatStore } from "@/store/chat/chat.store";
import { ChatSidebar } from "./ChatSidebar";
import { RotateCcw } from "lucide-react";

const SUGGESTIONS = [
  "Summarize the recent engineering discussions on Slack",
  "What is the architecture of the GraphRAG pipeline?",
  "List the active Jira tickets for the upcoming sprint",
];

const LOADING_MESSAGES = [
  "Analyzing query intent...",
  "Searching Neo4j Knowledge Graph...",
  "Retrieving artifact fragments...",
  "Compiling chronological timeline...",
  "Drafting final response...",
];

export default function ChatScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q");

  const { messages, addMessage, activeConversationId, loadConversations, setActiveConversation, isSidebarOpen } = useChatStore();
  const [input, setInput] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const askMutation = useAskQuestion();

  // Load persisted conversation messages on refresh
  useEffect(() => {
    if (activeConversationId && messages.length === 0) {
      setActiveConversation(activeConversationId);
    }
  }, []);

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(initialQuery);
      router.replace("/dashboard/chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (askMutation.isPending) {
      interval = setInterval(() => {
        setLoadingPhase((p) => (p + 1) % LOADING_MESSAGES.length);
      }, 2500);
    } else {
      setLoadingPhase(0);
    }
    return () => clearInterval(interval);
  }, [askMutation.isPending]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, askMutation.isPending, loadingPhase]);

  const handleSend = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || askMutation.isPending) return;

    setInput("");
    
    // Add temporary user message
    addMessage({
      role: "user",
      content: text,
    });

    try {
      const response = await askMutation.mutateAsync({ 
        query: text, 
        conversationId: activeConversationId || undefined 
      });
      
      // If this was a new conversation, we need to refresh the conversation list
      // and set the active conversation ID
      if (!activeConversationId && response.conversationId) {
        await loadConversations();
        await setActiveConversation(response.conversationId);
      } else {
        // Just add the assistant response
        addMessage({
          id: response.messageId,
          role: "assistant",
          content: response.answer,
          evidenceChains: response.evidenceChains,
        });
      }
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request.",
        isError: true,
      });
    }
  };

  const handleRetry = (queryText: string) => {
    handleSend(queryText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="relative flex h-full w-full bg-transparent overflow-hidden">
      <ChatSidebar />
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
      
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[800px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--gold-soft)] opacity-[0.05] blur-[150px]" />
      
      {/* Floating Tag Header */}
      <div 
        className={cn(
          "absolute top-4 z-20 flex items-center gap-2 rounded-full border border-black/5 dark:border-white/5 bg-background/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-md transition-all duration-300",
          !isSidebarOpen ? "left-16 md:left-20" : "left-4 md:left-6 md:top-6"
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold-soft)]" />
        AIAN Portal
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pb-48 pt-20">
          
          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && !askMutation.isPending && (
            <div className="flex w-full flex-col items-center justify-center pt-10">
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gold-gradient shadow-[0_0_40px_rgba(201,152,43,0.3)]">
                <div className="absolute inset-0 rounded-3xl bg-white/20 mix-blend-overlay" />
                <Sparkles className="h-10 w-10 text-[#17130A]" />
              </div>
              <h2 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">
                How can I help you today?
              </h2>
              <p className="mb-10 text-center text-muted-foreground">
                I'm connected to your entire Knowledge Graph. Ask me anything.
              </p>
              
              <div className="grid w-full gap-3 sm:grid-cols-2 md:grid-cols-3">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="group relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4 text-left transition-all hover:border-[color:var(--gold-soft)]/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  >
                    <MessageSquare className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-[color:var(--gold-soft)]" />
                    <span className="text-[13px] leading-snug text-foreground/80">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex w-full gap-4",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-sm">
                  <Bot className="h-4 w-4 text-[#17130A]" />
                </div>
              )}

              <div
                className={cn(
                  "flex flex-col gap-3 text-[15.5px] leading-7",
                  msg.role === "user"
                    ? "max-w-[85%] rounded-3xl bg-black/[0.05] dark:bg-white/[0.08] px-5 py-3 text-foreground shadow-sm md:max-w-[75%] md:px-6 md:py-4"
                    : "min-w-0 flex-1 pt-1 text-foreground"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {/* Citations block for Assistant */}
                {msg.evidenceChains && msg.evidenceChains.length > 0 && (
                  <div className="mt-4 flex w-full flex-col gap-2 rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      Sources & Evidence ({msg.evidenceChains.length})
                    </div>
                    {msg.evidenceChains.map((evidence, idx) => (
                      <EvidenceChainCard key={idx} evidence={evidence} />
                    ))}
                  </div>
                )}
                
                {/* Retry Button for Errors */}
                {msg.isError && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit gap-2 border-red-500/20 text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      // Find the last user message to retry
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) {
                        handleRetry(lastUserMsg.content);
                      }
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {askMutation.isPending && (
            <div className="flex w-full gap-4 justify-start">
              <div className="mt-1 flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-xl bg-gold-gradient shadow-sm">
                <Sparkles className="h-4 w-4 text-[#17130A]" />
              </div>
              <div className="flex w-full items-center gap-3 pt-2 text-[15.5px]">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--gold-soft)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[color:var(--gold-soft)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[color:var(--gold-soft)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="bg-gradient-to-r from-[color:var(--gold-soft)] to-yellow-200 bg-clip-text font-medium italic tracking-wide text-transparent">
                  {LOADING_MESSAGES[loadingPhase]}
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pb-8 pt-12">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="relative flex items-end gap-2 rounded-[28px] border border-black/10 dark:border-white/10 bg-[color:var(--surface)]/80 shadow-2xl backdrop-blur-xl focus-within:border-[color:var(--gold-soft)]/50 focus-within:ring-1 focus-within:ring-[color:var(--gold-soft)]/20 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AIAN..."
              className="max-h-48 min-h-[60px] w-full resize-none bg-transparent py-4 pl-6 pr-14 text-[15.5px] outline-none placeholder:text-muted-foreground/70"
              rows={1}
            />
            <Button
              size="icon"
              className={cn(
                "absolute bottom-2 right-2 h-10 w-10 shrink-0 rounded-2xl transition-all",
                input.trim()
                  ? "bg-gold-gradient text-[#17130A] shadow-md hover:opacity-90"
                  : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
              )}
              disabled={!input.trim() || askMutation.isPending}
              onClick={() => handleSend(input)}
            >
              {input.trim() ? <ArrowRight className="h-5 w-5" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 text-center text-[11px] text-muted-foreground opacity-60">
            AIAN can make mistakes. Verify important information using the provided evidence citations.
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
