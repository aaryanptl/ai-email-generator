import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat-shell";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

type Props = {
	params: Promise<{ chatId: string }>;
};

export default async function ChatByIdPage({ params }: Props) {
	if (!(await isAuthenticated())) {
		redirect("/login");
	}

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
