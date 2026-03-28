import { ChatShell } from "@/components/chat-shell";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";

type Props = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatByIdPage({ params }: Props) {
  const { chatId } = await params;
  const initialMessages = await fetchAuthQuery(api.messages.listByChatId, {
    chatId,
  });

  return (
    <ChatShell
      key={chatId}
      initialChatId={chatId}
      initialMessages={initialMessages}
    />
  );
}
