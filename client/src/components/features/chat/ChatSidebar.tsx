import { useEffect, useState } from "react";
import { Plus, MessageSquare, Search, Trash2, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chat/chat.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export function ChatSidebar() {
  const {
    conversations,
    activeConversationId,
    isSidebarOpen,
    setSidebarOpen,
    loadConversations,
    setActiveConversation,
    createNewConversation,
    deleteConversation,
    searchConversations,
    isSearching,
    isCreatingNewChat,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchConversations(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchConversations]);

  const displayConversations = [...conversations];
  if (isCreatingNewChat && !isSearching && displayConversations.every(c => c.id !== 'new-chat')) {
    displayConversations.unshift({
      id: 'new-chat',
      title: 'New Chat',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      organizationId: '',
      userId: '',
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Toggle Button (Mobile) */}
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-50 md:hidden bg-background/50 backdrop-blur-md"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="absolute bottom-0 left-0 top-0 z-40 flex shrink-0 flex-col border-r border-black/5 dark:border-white/5 bg-[color:var(--background)]/95 dark:bg-[color:var(--surface)]/95 backdrop-blur-xl md:relative md:z-10"
          >
            <div className="flex w-[280px] flex-col h-full">
              <div className="flex items-center justify-between p-4 pb-2">
                <span className="font-semibold text-foreground tracking-tight">Conversations</span>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden">
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="hidden md:flex text-muted-foreground hover:text-foreground">
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              </div>

              <div className="px-4 pb-4">
                <Button
                  onClick={() => {
                    createNewConversation();
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2 bg-gold-gradient text-[#17130A] hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              <div className="px-4 pb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 py-2 pl-9 pr-4 text-[13px] outline-none placeholder:text-muted-foreground focus:border-[color:var(--gold-soft)]/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
                <div className="flex flex-col gap-1">
                  {displayConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors",
                        (activeConversationId === conv.id || (activeConversationId === null && conv.id === 'new-chat'))
                          ? "bg-black/5 dark:bg-white/10 text-foreground"
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                      )}
                      onClick={() => {
                        if (conv.id === 'new-chat') {
                          createNewConversation();
                        } else {
                          setActiveConversation(conv.id);
                        }
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <MessageSquare className={cn("h-4 w-4 shrink-0", activeConversationId === conv.id && "text-[color:var(--gold-soft)]")} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium leading-none mb-1">
                            {conv.title}
                          </div>
                          <div className="text-[10px] opacity-70">
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-black/10 dark:border-white/10 bg-background/95 backdrop-blur-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the conversation and all its messages.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground hover:bg-black/10 dark:hover:bg-white/10">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteConversation(conv.id)}
                              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  
                  {displayConversations.length === 0 && (
                    <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No conversations found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Show small toggle when closed */}
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-10 hidden md:flex text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
