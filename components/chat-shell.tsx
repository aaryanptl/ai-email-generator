"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatPanel, EmailData } from "@/components/chat-panel";
import { ArtifactPanel, EmailArtifact } from "@/components/artifact-panel";
import { HistorySidebar, type HistoryChat } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChatShellProps {
  initialChatId?: string;
  initialMessages?: UIMessage[];
}

export function ChatShell({ initialChatId, initialMessages = [] }: ChatShellProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const bootChatId = useMemo(() => {
    return initialChatId ?? `chat_${crypto.randomUUID()}`;
  }, [initialChatId]);

  const [chatId, setChatId] = useState(bootChatId);
  const [hasPersistedPath, setHasPersistedPath] = useState(Boolean(initialChatId));
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [historyDockedOpen, setHistoryDockedOpen] = useState(true);
  const [previewEmail, setPreviewEmail] = useState<EmailArtifact | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat");
  const [isDesktop, setIsDesktop] = useState(false);

  const upsertUser = useMutation(api.users.upsertFromSession);
  const deleteChat = useMutation(api.chats.remove);

  const chats = useQuery(api.chats.list, session ? {} : "skip");
  const latestEmail = useQuery(
    api.emails.getLatestForChat,
    session && hasPersistedPath ? { chatId } : "skip",
  );

  const historyChats = useMemo<HistoryChat[]>(() => {
    if (!chats) {
      return [];
    }
    return chats.map((chat: { chatId: string; title: string; updatedAt: number }) => ({
      chatId: chat.chatId,
      title: chat.title,
      updatedAt: chat.updatedAt,
    }));
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

  const handleEnsureChatPath = useCallback((nextChatId: string) => {
    if (!hasPersistedPath) {
      setChatId(nextChatId);
      window.history.replaceState({}, "", `/chat/${nextChatId}`);
      setHasPersistedPath(true);
    }
  }, [hasPersistedPath]);

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

  const handleSelectChat = useCallback((selectedChatId: string) => {
    setMobileHistoryOpen(false);
    router.push(`/chat/${selectedChatId}`);
  }, [router]);

  const handleDeleteChat = useCallback(async (selectedChatId: string) => {
    await deleteChat({ chatId: selectedChatId });
    if (selectedChatId === chatId) {
      setPreviewEmail(null);
      router.replace("/chat");
    }
  }, [chatId, deleteChat, router]);

  const handleNewChat = useCallback(() => {
    setMobileHistoryOpen(false);
    setPreviewEmail(null);
    setCompilationError(null);
    setActivePanel("chat");
    const nextChatId = `chat_${crypto.randomUUID()}`;
    setChatId(nextChatId);
    setHasPersistedPath(false);
    window.history.replaceState({}, "", "/chat");
  }, []);

  const handleToggleHistory = useCallback(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setHistoryDockedOpen((value) => !value);
      return;
    }
    setMobileHistoryOpen((value) => !value);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-sm border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Checking session</CardTitle>
            <CardDescription>Please wait while we authenticate your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-6 py-10">
        <Card className="w-full max-w-md border-border/70 bg-card/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Sign in to continue</CardTitle>
            <CardDescription>
              Use Google to access your saved chats and generated email templates.
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
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      <HistorySidebar
        open={mobileHistoryOpen}
        onClose={() => setMobileHistoryOpen(false)}
        chats={historyChats}
        activeChatId={hasPersistedPath ? chatId : undefined}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        userEmail={session.user.email ?? "Signed in"}
        userName={session.user.name ?? undefined}
        userImage={session.user.image ?? null}
        onSignOut={() => void handleSignOut()}
      />

      {isDesktop ? (
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          {historyDockedOpen ? (
            <>
              <ResizablePanel defaultSize="22%" minSize={240} maxSize={420} className="min-w-[240px]">
                <HistorySidebar
                  variant="docked"
                  chats={historyChats}
                  activeChatId={hasPersistedPath ? chatId : undefined}
                  onSelectChat={handleSelectChat}
                  onDeleteChat={handleDeleteChat}
                  userEmail={session.user.email ?? "Signed in"}
                  userName={session.user.name ?? undefined}
                  userImage={session.user.image ?? null}
                  onSignOut={() => void handleSignOut()}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          ) : null}

          <ResizablePanel
            defaultSize={historyDockedOpen ? "31%" : "38%"}
            minSize={320}
            maxSize="48%"
            className="min-w-[320px]"
          >
            <ChatPanel
              key={chatId}
              chatId={chatId}
              initialMessages={chatInitialMessages}
              onEmailGenerated={handleEmailGenerated}
              onEnsureChatPath={handleEnsureChatPath}
              onToggleSidebar={handleToggleHistory}
              onNewChat={handleNewChat}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={historyDockedOpen ? "47%" : "62%"} minSize={360} className="min-w-[360px]">
            <ArtifactPanel
              chatId={chatId}
              email={currentEmail}
              compilationError={compilationError}
              onEnsureChatPath={handleEnsureChatPath}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          <div className="fixed inset-x-3 top-3 z-30 flex rounded-4xl border border-border/70 bg-card/95 p-1 shadow-sm backdrop-blur">
            <Button
              onClick={() => setActivePanel("chat")}
              variant={activePanel === "chat" ? "secondary" : "ghost"}
              className="flex-1"
            >
              Chat
            </Button>
            <Button
              onClick={() => setActivePanel("preview")}
              variant={activePanel === "preview" ? "secondary" : "ghost"}
              className="flex-1"
            >
              Preview
            </Button>
          </div>

          <div
            className={cn(
              "h-full w-full shrink-0 border-r border-border/60 pt-16",
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
              onToggleSidebar={handleToggleHistory}
              onNewChat={handleNewChat}
            />
          </div>

          <div
            className={cn("min-w-0 flex-1 pt-16", activePanel !== "preview" && "hidden")}
            data-active={activePanel === "preview"}
          >
            <ArtifactPanel
              chatId={chatId}
              email={currentEmail}
              compilationError={compilationError}
              onEnsureChatPath={handleEnsureChatPath}
            />
          </div>
        </>
      )}
    </div>
  );
}
