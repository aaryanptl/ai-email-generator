"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

interface EmailPreviewProps {
  htmlCode: string;
}

export function EmailPreview({ htmlCode }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderBottom: "1px solid #374151",
        }}
      >
        <button
          onClick={() => setViewMode("desktop")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 12px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            backgroundColor: viewMode === "desktop" ? "#374151" : "transparent",
            color: viewMode === "desktop" ? "#fff" : "#9ca3af",
          }}
        >
          <Monitor size={14} />
          Desktop
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 12px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            backgroundColor: viewMode === "mobile" ? "#374151" : "transparent",
            color: viewMode === "mobile" ? "#fff" : "#9ca3af",
          }}
        >
          <Smartphone size={14} />
          Mobile
        </button>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: "16px",
          backgroundColor: "#f3f4f6",
          overflow: "auto",
        }}
      >
        <iframe
          srcDoc={htmlCode}
          title="Email Preview"
          sandbox="allow-same-origin"
          style={{
            width: viewMode === "desktop" ? "100%" : "375px",
            maxWidth: "600px",
            height: "100%",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        />
      </div>
    </div>
  );
}
