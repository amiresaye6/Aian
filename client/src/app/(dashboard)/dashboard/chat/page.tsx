import { AppLayout } from "@/layouts/AppLayout";
import ChatScreen from "@/components/features/chat/ChatScreen";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="absolute inset-0 z-10 flex flex-col">
        <ChatScreen />
      </div>
    </AppLayout>
  );
}
