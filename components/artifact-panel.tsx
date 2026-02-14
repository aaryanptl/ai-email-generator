"use client";

import { useState } from "react";
import { Eye, Code2, Copy, Check, Download } from "lucide-react";
import { EmailPreview } from "./email-preview";
import { CodeViewer } from "./code-viewer";

export interface EmailArtifact {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
}

interface ArtifactPanelProps {
  email: EmailArtifact | null;
}

export function ArtifactPanel({ email }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copiedHtml, setCopiedHtml] = useState(false);

  const handleCopyHtml = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email.htmlCode);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadHtml = () => {
    if (!email) return;
    const blob = new Blob([email.htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${email.name.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!email) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "#0d1117",
          color: "#6b7280",
          textAlign: "center",
          padding: "32px",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "16px",
            backgroundColor: "#1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          <Eye size={32} color="#4b5563" />
        </div>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#9ca3af",
            margin: 0,
          }}
        >
          Email Preview
        </h3>
        <p style={{ fontSize: "14px", maxWidth: "280px", margin: 0 }}>
          Generated email templates will appear here with a live preview and
          source code.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0d1117",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#f9fafb",
              margin: 0,
            }}
          >
            {email.name}
          </h3>
          <span
            style={{
              fontSize: "12px",
              color: "#6b7280",
              padding: "2px 8px",
              backgroundColor: "#1f2937",
              borderRadius: "4px",
            }}
          >
            {email.description}
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {/* Tabs */}
          <button
            onClick={() => setActiveTab("preview")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              backgroundColor:
                activeTab === "preview" ? "#374151" : "transparent",
              color: activeTab === "preview" ? "#fff" : "#9ca3af",
            }}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              backgroundColor: activeTab === "code" ? "#374151" : "transparent",
              color: activeTab === "code" ? "#fff" : "#9ca3af",
            }}
          >
            <Code2 size={14} />
            Code
          </button>
          <div
            style={{
              width: "1px",
              backgroundColor: "#374151",
              margin: "0 4px",
            }}
          />
          <button
            onClick={handleCopyHtml}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "transparent",
              color: "#d1d5db",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {copiedHtml ? <Check size={14} /> : <Copy size={14} />}
            {copiedHtml ? "Copied!" : "Copy HTML"}
          </button>
          <button
            onClick={handleDownloadHtml}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "transparent",
              color: "#d1d5db",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "preview" ? (
          <EmailPreview htmlCode={email.htmlCode} />
        ) : (
          <CodeViewer code={email.tsxCode} />
        )}
      </div>
    </div>
  );
}
