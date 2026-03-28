"use client";

import type { UIMessage } from "ai";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArtifactPanel, type EmailArtifact } from "@/components/artifact-panel";
import { ChatPanel, type EmailData } from "@/components/chat-panel";
import { useAuthBootstrap } from "@/components/convex-client-provider";
import { type HistoryChat, HistorySidebar } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChatShellProps {
	initialChatId?: string;
	initialMessages?: UIMessage[];
}

const createChatId = () => `chat_${crypto.randomUUID()}`;
const LAYOUT_BREAKPOINT = "(min-width: 880px)";
const DOCKED_SIDEBAR_BREAKPOINT = "(min-width: 1100px)";

export function ChatShell({
	initialChatId,
	initialMessages = [],
}: ChatShellProps) {
	const router = useRouter();
	const { hasInitialToken } = useAuthBootstrap();
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const { data: session } = authClient.useSession();
	const canUseAuthenticatedData = isAuthenticated || hasInitialToken;

	const [chatId, setChatId] = useState(() => initialChatId ?? createChatId());
	const [hasPersistedPath, setHasPersistedPath] = useState(() =>
		Boolean(initialChatId),
	);
	const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
	const [historyDockedOpen, setHistoryDockedOpen] = useState(true);
	const [previewEmail, setPreviewEmail] = useState<EmailArtifact | null>(null);
	const [compilationError, setCompilationError] = useState<string | null>(null);
	const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat");
	const [isDesktop, setIsDesktop] = useState(false);
	const [isHistoryDockedDesktop, setIsHistoryDockedDesktop] = useState(false);
	const [isViewportReady, setIsViewportReady] = useState(false);
	const [isChatStreaming, setIsChatStreaming] = useState(false);

	const upsertUser = useMutation(api.users.upsertFromSession);
	const deleteChat = useMutation(api.chats.remove);

	const currentUser = useQuery(
		api.users.current,
		canUseAuthenticatedData ? {} : "skip",
	);
	const chats = useQuery(api.chats.list, canUseAuthenticatedData ? {} : "skip");
	const latestEmail = useQuery(
		api.emails.getLatestForChat,
		canUseAuthenticatedData && hasPersistedPath ? { chatId } : "skip",
	);

	const historyChats = useMemo<HistoryChat[]>(() => {
		if (!chats) {
			return [];
		}
		return chats.map(
			(chat: { chatId: string; title: string; updatedAt: number }) => ({
				chatId: chat.chatId,
				title: chat.title,
				updatedAt: chat.updatedAt,
			}),
		);
	}, [chats]);

	const chatInitialMessages = useMemo<UIMessage[]>(() => {
		if (!hasPersistedPath) {
			return [];
		}
		return initialMessages;
	}, [hasPersistedPath, initialMessages]);

	useEffect(() => {
		if (!session?.user) {
			return;
		}

		void upsertUser({
			email: session.user.email ?? undefined,
			name: session.user.name ?? undefined,
			image: session.user.image ?? undefined,
		});
	}, [session?.user, upsertUser]);

	const currentEmail = useMemo<EmailArtifact | null>(() => {
		if (previewEmail) {
			return previewEmail;
		}
		if (!latestEmail) {
			return null;
		}
		return {
			name: latestEmail.name,
			description: latestEmail.description,
			tsxCode: latestEmail.tsxCode,
			htmlCode: latestEmail.htmlCode,
		};
	}, [latestEmail, previewEmail]);

	const showDockedHistory = isHistoryDockedDesktop && historyDockedOpen;
	const userEmail = currentUser?.email ?? session?.user.email ?? "Signed in";
	const userName = currentUser?.name ?? session?.user.name ?? undefined;
	const userImage = currentUser?.image ?? session?.user.image ?? null;

	const handleGoogleSignIn = useCallback(async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: initialChatId ? `/chat/${initialChatId}` : "/chat",
		});
	}, [initialChatId]);

	const handleSignOut = useCallback(async () => {
		await authClient.signOut();
		setPreviewEmail(null);
		setCompilationError(null);
		setActivePanel("chat");
		setMobileHistoryOpen(false);
		router.replace("/chat");
	}, [router]);

	const handleEnsureChatPath = useCallback(
		(nextChatId: string) => {
			if (!hasPersistedPath) {
				setChatId(nextChatId);
				window.history.replaceState({}, "", `/chat/${nextChatId}`);
				setHasPersistedPath(true);
			}
		},
		[hasPersistedPath],
	);

	const handleEmailGenerated = useCallback((data: EmailData) => {
		if (!data.success) {
			setCompilationError(data.error || "Failed to compile email template");
			if (data.tsxCode) {
				setPreviewEmail({
					name: data.name,
					description: data.description,
					tsxCode: data.tsxCode,
					htmlCode: "",
				});
				setActivePanel("preview");
			}
			return;
		}

		setCompilationError(null);
		setPreviewEmail({
			name: data.name,
			description: data.description,
			tsxCode: data.tsxCode,
			htmlCode: data.htmlCode,
		});
		setActivePanel("preview");
	}, []);

	const handleSelectChat = useCallback(
		(selectedChatId: string) => {
			setMobileHistoryOpen(false);
			router.push(`/chat/${selectedChatId}`);
		},
		[router],
	);

	const handleDeleteChat = useCallback(
		async (selectedChatId: string) => {
			await deleteChat({ chatId: selectedChatId });
			if (selectedChatId === chatId) {
				setPreviewEmail(null);
				router.replace("/chat");
			}
		},
		[chatId, deleteChat, router],
	);

	const handleNewChat = useCallback(() => {
		setMobileHistoryOpen(false);
		setPreviewEmail(null);
		setCompilationError(null);
		setActivePanel("chat");
		const nextChatId = createChatId();
		setChatId(nextChatId);
		setHasPersistedPath(false);
		window.history.replaceState({}, "", "/chat");
	}, []);

	const handleToggleHistory = useCallback(() => {
		const isDockedDesktop = window.matchMedia(
			DOCKED_SIDEBAR_BREAKPOINT,
		).matches;
		if (isDockedDesktop) {
			setHistoryDockedOpen((value) => !value);
			return;
		}
		setMobileHistoryOpen((value) => !value);
	}, []);

	useEffect(() => {
		const layoutMediaQuery = window.matchMedia(LAYOUT_BREAKPOINT);
		const dockedMediaQuery = window.matchMedia(DOCKED_SIDEBAR_BREAKPOINT);

		const update = () => {
			setIsDesktop(layoutMediaQuery.matches);
			setIsHistoryDockedDesktop(dockedMediaQuery.matches);
			setIsViewportReady(true);
		};

		update();
		layoutMediaQuery.addEventListener("change", update);
		dockedMediaQuery.addEventListener("change", update);
		return () => {
			layoutMediaQuery.removeEventListener("change", update);
			dockedMediaQuery.removeEventListener("change", update);
		};
	}, []);

	if (!isViewportReady) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-6">
				<Card className="w-full max-w-sm border-border/70 bg-card/80 backdrop-blur">
					<CardHeader>
						<CardTitle>Preparing workspace</CardTitle>
						<CardDescription>
							Loading the correct layout for your device.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (authLoading && !hasInitialToken) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-6">
				<Card className="w-full max-w-sm border-border/70 bg-card/80 backdrop-blur">
					<CardHeader>
						<CardTitle>Checking session</CardTitle>
						<CardDescription>
							Please wait while we authenticate your account.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (!canUseAuthenticatedData) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-6 py-10">
				<Card className="w-full max-w-md border-border/70 bg-card/90 backdrop-blur">
					<CardHeader className="space-y-3">
						<CardTitle className="text-2xl">Sign in to continue</CardTitle>
						<CardDescription>
							Use Google to access your saved chats and generated email
							templates.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleGoogleSignIn} className="w-full" size="lg">
							Continue with Google
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="relative flex h-screen min-w-0 overflow-hidden bg-surface-app">
			<HistorySidebar
				open={mobileHistoryOpen}
				onClose={() => setMobileHistoryOpen(false)}
				chats={historyChats}
				activeChatId={hasPersistedPath ? chatId : undefined}
				onSelectChat={handleSelectChat}
				onDeleteChat={handleDeleteChat}
				userEmail={userEmail}
				userName={userName}
				userImage={userImage}
				onSignOut={() => void handleSignOut()}
				onNewChat={handleNewChat}
			/>

			{isDesktop ? (
				<>
					{!isHistoryDockedDesktop ? (
						<div className="pointer-events-none fixed left-3 top-3 z-30">
							<Button
								type="button"
								onClick={handleToggleHistory}
								variant="ghost"
								size="icon"
								className="pointer-events-auto size-9 rounded-3xl border border-border/70 bg-card/95 shadow-sm backdrop-blur"
								aria-label="Open history"
							>
								<PanelLeftOpen className="size-4" />
							</Button>
						</div>
					) : null}

					<ResizablePanelGroup
						id="chat-layout"
						orientation="horizontal"
						className="h-full w-full min-w-0"
					>
						{isHistoryDockedDesktop && historyDockedOpen ? (
							<>
								<ResizablePanel
									id="history-panel"
									defaultSize={10}
									minSize={15}
									maxSize={25}
									className="min-w-[150px]"
								>
									<HistorySidebar
										variant="docked"
										chats={historyChats}
										activeChatId={hasPersistedPath ? chatId : undefined}
										onSelectChat={handleSelectChat}
										onDeleteChat={handleDeleteChat}
										userEmail={userEmail}
										userName={userName}
										userImage={userImage}
										onSignOut={() => void handleSignOut()}
										onNewChat={handleNewChat}
									/>
								</ResizablePanel>
								<ResizableHandle className="w-0.5 bg-border/20 hover:bg-foreground/10 transition-colors" />
							</>
						) : null}

						<ResizablePanel
							id="chat-panel"
							defaultSize={showDockedHistory ? 35 : 40}
							minSize={20}
							maxSize={70}
							className="bg-card min-w-[150px]"
						>
							<ChatPanel
								key={chatId}
								chatId={chatId}
								initialMessages={chatInitialMessages}
								onEmailGenerated={handleEmailGenerated}
								onEnsureChatPath={handleEnsureChatPath}
								onStatusChange={setIsChatStreaming}
							/>
						</ResizablePanel>

						<ResizableHandle className="w-0.5 bg-border/20 hover:bg-foreground/10 transition-colors" />

						<ResizablePanel
							id="preview-panel"
							defaultSize={showDockedHistory ? 45 : 60}
							minSize={20}
							maxSize={70}
							className="min-w-[360px]"
						>
							<ArtifactPanel
								key={chatId}
								chatId={chatId}
								email={currentEmail}
								compilationError={compilationError}
								isStreaming={isChatStreaming}
								onEnsureChatPath={handleEnsureChatPath}
							/>
						</ResizablePanel>
					</ResizablePanelGroup>
				</>
			) : (
				<>
					<div className="fixed inset-x-3 top-3 z-30 flex items-center gap-1 rounded-4xl border border-border/70 bg-card/95 p-1 shadow-sm backdrop-blur">
						<Button
							type="button"
							onClick={handleToggleHistory}
							variant="ghost"
							size="icon"
							className="size-9 shrink-0 rounded-3xl"
							aria-label="Open history"
						>
							<PanelLeftOpen className="size-4" />
						</Button>
						<Button
							onClick={() => setActivePanel("chat")}
							variant={activePanel === "chat" ? "secondary" : "ghost"}
							className="min-w-0 flex-1"
						>
							Chat
						</Button>
						<Button
							onClick={() => setActivePanel("preview")}
							variant={activePanel === "preview" ? "secondary" : "ghost"}
							className="min-w-0 flex-1"
						>
							Preview
						</Button>
					</div>

					<div
						className={cn(
							"h-full w-full shrink-0 min-w-0 border-r border-border/60 pt-16",
							activePanel !== "chat" && "hidden",
						)}
						data-active={activePanel === "chat"}
					>
						<ChatPanel
							key={chatId}
							chatId={chatId}
							initialMessages={chatInitialMessages}
							onEmailGenerated={handleEmailGenerated}
							onEnsureChatPath={handleEnsureChatPath}
							onStatusChange={setIsChatStreaming}
						/>
					</div>

					<div
						className={cn(
							"min-w-0 flex-1 pt-16",
							activePanel !== "preview" && "hidden",
						)}
						data-active={activePanel === "preview"}
					>
						<ArtifactPanel
							key={chatId}
							chatId={chatId}
							email={currentEmail}
							compilationError={compilationError}
							isStreaming={isChatStreaming}
							onEnsureChatPath={handleEnsureChatPath}
						/>
					</div>
				</>
			)}
		</div>
	);
}
