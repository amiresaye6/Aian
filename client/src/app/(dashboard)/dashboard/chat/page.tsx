import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import ChatScreen from "@/components/features/chat/ChatScreen";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="absolute inset-0 z-10 flex flex-col">
        <Suspense fallback={<div className="flex h-full items-center justify-center">Loading chat...</div>}>
          <ChatScreen />
        </Suspense>
      </div>
    </AppLayout>
  );
}
