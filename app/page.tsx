"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChatPanel, EmailData } from "@/components/chat-panel";
import { ArtifactPanel, EmailArtifact } from "@/components/artifact-panel";
import {
  HistorySidebar,
  HistoryEmail,
} from "@/components/history-sidebar";
import { useConvexSave } from "@/components/use-convex-save";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailArtifact | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat");

  const savedEmails = useQuery(api.emails.list, session ? {} : "skip");
  const upsertUser = useMutation(api.users.upsertFromSession);

  const emailHistory = useMemo<HistoryEmail[]>(() => {
    if (!savedEmails) {
      return [];
    }
    return savedEmails.map((email) => ({
      id: String(email._id),
      name: email.name,
      description: email.description,
      tsxCode: email.tsxCode,
      htmlCode: email.htmlCode,
      createdAt: email.createdAt,
    }));
  }, [savedEmails]);

  const { saveEmail, deleteEmail } = useConvexSave();

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

  const handleGoogleSignIn = useCallback(async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    setCurrentEmail(null);
    setCompilationError(null);
    setActivePanel("chat");
  }, []);

  const handleEmailGenerated = useCallback(
    (data: EmailData) => {
      if (!data.success) {
        setCompilationError(data.error || "Failed to compile email template");
        // Still show the code even on error
        if (data.tsxCode) {
          setCurrentEmail({
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
      const email: EmailArtifact = {
        name: data.name,
        description: data.description,
        tsxCode: data.tsxCode,
        htmlCode: data.htmlCode,
      };
      setCurrentEmail(email);
      setActivePanel("preview");

      // Save to Convex if available
      saveEmail(email);
    },
    [saveEmail]
  );

  const handleSelectEmail = useCallback((email: HistoryEmail) => {
    setCurrentEmail({
      name: email.name,
      description: email.description,
      tsxCode: email.tsxCode,
      htmlCode: email.htmlCode,
    });
    setCompilationError(null);
    setSidebarOpen(false);
    setActivePanel("preview");
  }, []);

  const handleDeleteEmail = useCallback(
    (id: string) => {
      deleteEmail(id);
    },
    [deleteEmail]
  );

  const handleNewChat = useCallback(() => {
    setCurrentEmail(null);
    setCompilationError(null);
    setActivePanel("chat");
  }, []);

  if (sessionPending) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0d1117",
          color: "#9ca3af",
          fontSize: "14px",
        }}
      >
        Checking session...
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0d1117",
          color: "#f9fafb",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: "#111827",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
            Sign in to continue
          </h1>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "14px" }}>
            Use Google to access your saved email templates and conversations.
          </p>
          <button
            onClick={handleGoogleSignIn}
            style={{
              marginTop: "8px",
              border: "1px solid #374151",
              borderRadius: "10px",
              backgroundColor: "#1f2937",
              color: "#f9fafb",
              fontSize: "14px",
              fontWeight: 600,
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "999px",
          padding: "6px 8px 6px 12px",
        }}
      >
        <span style={{ color: "#9ca3af", fontSize: "12px" }}>
          {session.user.email ?? "Signed in"}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            border: "none",
            borderRadius: "999px",
            backgroundColor: "#1f2937",
            color: "#f3f4f6",
            fontSize: "12px",
            fontWeight: 600,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        emails={emailHistory}
        onSelectEmail={handleSelectEmail}
        onDeleteEmail={handleDeleteEmail}
      />

      {/* Mobile tab bar */}
      <div
        className="mobile-tabs"
        style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          borderTop: "1px solid #1f2937",
          backgroundColor: "#111827",
        }}
      >
        <button
          onClick={() => setActivePanel("chat")}
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            backgroundColor: activePanel === "chat" ? "#1f2937" : "transparent",
            color: activePanel === "chat" ? "#6366f1" : "#9ca3af",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Chat
        </button>
        <button
          onClick={() => setActivePanel("preview")}
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            backgroundColor:
              activePanel === "preview" ? "#1f2937" : "transparent",
            color: activePanel === "preview" ? "#6366f1" : "#9ca3af",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Preview
        </button>
      </div>

      {/* Chat Panel - Left */}
      <div
        className="chat-panel-container"
        data-active={activePanel === "chat"}
        style={{
          width: "420px",
          minWidth: "360px",
          flexShrink: 0,
          height: "100%",
        }}
      >
        <ChatPanel
          onEmailGenerated={handleEmailGenerated}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Artifact Panel - Right */}
      <div
        className="artifact-panel-container"
        data-active={activePanel === "preview"}
        style={{ flex: 1, height: "100%", minWidth: 0 }}
      >
        <ArtifactPanel email={currentEmail} compilationError={compilationError} />
      </div>
    </div>
  );
}
