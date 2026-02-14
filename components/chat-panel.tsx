"use client";

import { useChat } from "@ai-sdk/react";
import { Send, PanelLeftOpen, Plus, Loader2 } from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";
import { MessageBubble } from "./message-bubble";

export interface EmailData {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
  success: boolean;
  error?: string;
}

interface ChatPanelProps {
  onEmailGenerated: (data: EmailData) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

function getMessageText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

export function ChatPanel({
  onEmailGenerated,
  onToggleSidebar,
  onNewChat,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  // Detect email generation from tool parts in messages
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant" || !message.parts) continue;
      for (const part of message.parts) {
        if (
          "toolCallId" in part &&
          typeof part.toolCallId === "string" &&
          "state" in part &&
          part.state === "output-available" &&
          "output" in part &&
          !processedToolCallsRef.current.has(part.toolCallId)
        ) {
          processedToolCallsRef.current.add(part.toolCallId);
          onEmailGenerated(part.output as EmailData);
        }
      }
    }
  }, [messages, onEmailGenerated]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    processedToolCallsRef.current.clear();
    setInput("");
    onNewChat();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  // Filter displayable messages
  const displayMessages = useMemo(() => {
    return messages.filter((m) => {
      if (m.role === "user") return true;
      if (m.role === "assistant") {
        const text = getMessageText(
          m.parts as Array<{ type: string; text?: string }>
        );
        return text.trim().length > 0;
      }
      return false;
    });
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#111827",
        borderRight: "1px solid #1f2937",
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
          <button
            onClick={onToggleSidebar}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            <PanelLeftOpen size={18} />
          </button>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#f9fafb",
              margin: 0,
            }}
          >
            AI Email Generator
          </h2>
        </div>
        <button
          onClick={handleNewChat}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            border: "1px solid #374151",
            borderRadius: "8px",
            backgroundColor: "transparent",
            color: "#d1d5db",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 0",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#6b7280",
              textAlign: "center",
              padding: "32px",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "48px", lineHeight: 1 }}>&#9993;</div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#e5e7eb",
                margin: 0,
              }}
            >
              Create beautiful emails with AI
            </h3>
            <p style={{ fontSize: "14px", maxWidth: "300px", margin: 0 }}>
              Describe the email you want and the AI will generate a
              professional React Email template for you.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                maxWidth: "320px",
                marginTop: "8px",
              }}
            >
              {[
                "Welcome email with hero banner and CTA",
                "Password reset notification",
                "Monthly newsletter with sections",
                "Order confirmation with details",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    color: "#d1d5db",
                    cursor: "pointer",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {displayMessages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role as "user" | "assistant"}
            content={getMessageText(
              message.parts as Array<{ type: string; text?: string }>
            )}
          />
        ))}
        {isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "16px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px", borderTop: "1px solid #1f2937" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe the email you want to create..."
            rows={2}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #374151",
              backgroundColor: "#1f2937",
              color: "#f9fafb",
              fontSize: "14px",
              lineHeight: "1.5",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              border: "none",
              backgroundColor:
                isLoading || !input.trim() ? "#374151" : "#6366f1",
              color: isLoading || !input.trim() ? "#6b7280" : "#fff",
              cursor:
                isLoading || !input.trim() ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
