"use client";

import { X, Mail, Trash2 } from "lucide-react";

export interface HistoryEmail {
  id: string;
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
  createdAt: number;
}

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  emails: HistoryEmail[];
  onSelectEmail: (email: HistoryEmail) => void;
  onDeleteEmail: (id: string) => void;
}

export function HistorySidebar({
  open,
  onClose,
  emails,
  onSelectEmail,
  onDeleteEmail,
}: HistorySidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 40,
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "320px",
          backgroundColor: "#111827",
          borderRight: "1px solid #1f2937",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            borderBottom: "1px solid #1f2937",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#f9fafb",
              margin: 0,
            }}
          >
            Email History
          </h3>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Email list */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {emails.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "#6b7280",
                textAlign: "center",
                fontSize: "14px",
                gap: "12px",
              }}
            >
              <Mail size={24} />
              <p style={{ margin: 0 }}>No emails generated yet.</p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  marginBottom: "4px",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "#1f2937";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <div
                  onClick={() => onSelectEmail(email)}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#e5e7eb",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {email.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {email.description}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#4b5563",
                      marginTop: "4px",
                    }}
                  >
                    {new Date(email.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEmail(email.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "transparent",
                    color: "#6b7280",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginLeft: "8px",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
