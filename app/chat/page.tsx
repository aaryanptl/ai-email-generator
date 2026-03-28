import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat-shell";
import { isAuthenticated } from "@/lib/auth-server";

export default async function NewChatPage() {
	if (!(await isAuthenticated())) {
		redirect("/login");
	}

	return <ChatShell key="new-chat" />;
}
