"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HistoryChat {
  chatId: string;
  title: string;
  updatedAt: number;
}

interface HistorySidebarProps {
  open?: boolean;
  onClose?: () => void;
  chats: HistoryChat[];
  activeChatId?: string;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  userEmail: string;
  userName?: string;
  userImage?: string | null;
  onSignOut: () => void;
  variant?: "drawer" | "docked";
}

export function HistorySidebar({
  open,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  userEmail,
  userName,
  userImage,
  onSignOut,
  variant = "drawer",
}: HistorySidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen]);

  const initialsSource = (userName || userEmail || "U").trim();
  const initials = initialsSource.slice(0, 1).toUpperCase();

  const panel = (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
        <h3 className="text-sm font-semibold">Chats</h3>
        {variant === "drawer" ? (
          <Button onClick={onClose} variant="ghost" size="icon-sm" aria-label="Close chat history">
            <X />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 space-y-1 overflow-auto p-2">
        {chats.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <MessageSquare className="size-5" />
            <p>No chats yet.</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatId === chat.chatId;
            return (
              <div
                key={chat.chatId}
                className={cn(
                  "group flex items-start justify-between rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/40",
                  isActive && "border-border/70 bg-muted/50",
                )}
              >
                <div
                  onClick={() => onSelectChat(chat.chatId)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="truncate text-sm font-medium">
                    {chat.title}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(chat.updatedAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.chatId);
                  }}
                  variant="ghost"
                  size="icon-xs"
                  className="ml-2 mt-0.5 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${chat.title}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/70 p-3">
        <div className="relative" ref={accountMenuRef}>
          {accountMenuOpen ? (
            <div className="absolute bottom-12 left-0 right-0 z-10 rounded-xl border border-border/70 bg-popover p-2 shadow-md">
              <div className="mb-2 rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
                {userName ? <div className="truncate text-xs font-medium">{userName}</div> : null}
                <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
              </div>
              <Button
                onClick={onSignOut}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Sign out
              </Button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setAccountMenuOpen((value) => !value)}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/35"
            aria-label="Open account menu"
            aria-expanded={accountMenuOpen}
          >
            <div
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border/70 bg-muted/50 text-[11px] font-semibold text-muted-foreground"
              style={
                userImage
                  ? {
                      backgroundImage: `url(${userImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "transparent",
                    }
                  : undefined
              }
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {userName ? <div className="truncate text-xs font-medium">{userName}</div> : null}
              <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === "docked") {
    return <div className="h-full border-r border-border/70">{panel}</div>;
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] lg:hidden"
      />
      <div className="fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[90vw] flex-col overflow-hidden border-r border-border/70 bg-card/95 backdrop-blur lg:hidden">
        {panel}
      </div>
    </>
  );
}
