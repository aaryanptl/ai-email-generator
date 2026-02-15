"use client";

import { useState, useCallback } from "react";
import { ChatPanel, EmailData } from "@/components/chat-panel";
import { ArtifactPanel, EmailArtifact } from "@/components/artifact-panel";
import {
  HistorySidebar,
  HistoryEmail,
} from "@/components/history-sidebar";
import { useConvexSave } from "@/components/use-convex-save";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailArtifact | null>(null);
  const [emailHistory, setEmailHistory] = useState<HistoryEmail[]>([]);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat");

  const { saveEmail, deleteEmail } = useConvexSave();

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

      // Add to local history
      const historyEntry: HistoryEmail = {
        id: crypto.randomUUID(),
        ...email,
        createdAt: Date.now(),
      };
      setEmailHistory((prev) => [historyEntry, ...prev]);

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
      setEmailHistory((prev) => prev.filter((e) => e.id !== id));
      deleteEmail(id);
    },
    [deleteEmail]
  );

  const handleNewChat = useCallback(() => {
    setCurrentEmail(null);
    setCompilationError(null);
    setActivePanel("chat");
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
