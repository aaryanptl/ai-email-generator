"use client";

import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: isUser ? "#6366f1" : "#1f2937",
          color: "#fff",
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: "12px",
          backgroundColor: isUser ? "#6366f1" : "#1f2937",
          color: isUser ? "#fff" : "#e5e7eb",
          fontSize: "14px",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}
