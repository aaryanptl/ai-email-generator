"use client";

import { useState, useCallback } from "react";
import { ChatPanel, EmailData } from "@/components/chat-panel";
import { ArtifactPanel, EmailArtifact } from "@/components/artifact-panel";
import {
  HistorySidebar,
  HistoryEmail,
} from "@/components/history-sidebar";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailArtifact | null>(null);
  const [emailHistory, setEmailHistory] = useState<HistoryEmail[]>([]);

  const handleEmailGenerated = useCallback(
    (data: EmailData) => {
      if (!data.success) return;

      const email: EmailArtifact = {
        name: data.name,
        description: data.description,
        tsxCode: data.tsxCode,
        htmlCode: data.htmlCode,
      };
      setCurrentEmail(email);

      // Add to local history
      const historyEntry: HistoryEmail = {
        id: crypto.randomUUID(),
        ...email,
        createdAt: Date.now(),
      };
      setEmailHistory((prev) => [historyEntry, ...prev]);
    },
    []
  );

  const handleSelectEmail = useCallback((email: HistoryEmail) => {
    setCurrentEmail({
      name: email.name,
      description: email.description,
      tsxCode: email.tsxCode,
      htmlCode: email.htmlCode,
    });
    setSidebarOpen(false);
  }, []);

  const handleDeleteEmail = useCallback((id: string) => {
    setEmailHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentEmail(null);
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

      {/* Chat Panel - Left */}
      <div
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
      <div style={{ flex: 1, height: "100%", minWidth: 0 }}>
        <ArtifactPanel email={currentEmail} />
      </div>
    </div>
  );
}
