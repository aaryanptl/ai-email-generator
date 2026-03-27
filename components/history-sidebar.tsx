"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import {
  X,
  MessageSquare,
  Trash2,
  Plus,
  LogOut,
  Settings,
  CreditCard,
  Search,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptUsageRing } from "@/components/prompt-usage-ring";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

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
  onNewChat?: () => void;
  variant?: "drawer" | "docked";
}

/** Full class strings per row so Tailwind picks up chart-* utilities. */
const HISTORY_ROW_ACCENTS = [
  {
    iconBox: "bg-chart-1/28 text-chart-1 dark:bg-chart-1/32",
    iconHover: "group-hover:bg-chart-1/40 dark:group-hover:bg-chart-1/45",
    row: "border-chart-1/30 bg-linear-to-br from-chart-1/16 via-card to-card dark:from-chart-1/20 dark:via-card/75 dark:to-card/55",
    rowHover: "hover:border-chart-1/50 hover:shadow-md",
    ringHover: "hover:ring-2 hover:ring-chart-1/25",
  },
  {
    iconBox: "bg-chart-2/28 text-chart-2 dark:bg-chart-2/32",
    iconHover: "group-hover:bg-chart-2/40 dark:group-hover:bg-chart-2/45",
    row: "border-chart-2/30 bg-linear-to-br from-chart-2/16 via-card to-card dark:from-chart-2/20 dark:via-card/75 dark:to-card/55",
    rowHover: "hover:border-chart-2/50 hover:shadow-md",
    ringHover: "hover:ring-2 hover:ring-chart-2/25",
  },
  {
    iconBox: "bg-chart-3/28 text-chart-3 dark:bg-chart-3/32",
    iconHover: "group-hover:bg-chart-3/40 dark:group-hover:bg-chart-3/45",
    row: "border-chart-3/30 bg-linear-to-br from-chart-3/16 via-card to-card dark:from-chart-3/20 dark:via-card/75 dark:to-card/55",
    rowHover: "hover:border-chart-3/50 hover:shadow-md",
    ringHover: "hover:ring-2 hover:ring-chart-3/25",
  },
  {
    iconBox: "bg-chart-4/28 text-chart-4 dark:bg-chart-4/32",
    iconHover: "group-hover:bg-chart-4/40 dark:group-hover:bg-chart-4/45",
    row: "border-chart-4/30 bg-linear-to-br from-chart-4/16 via-card to-card dark:from-chart-4/20 dark:via-card/75 dark:to-card/55",
    rowHover: "hover:border-chart-4/50 hover:shadow-md",
    ringHover: "hover:ring-2 hover:ring-chart-4/25",
  },
  {
    iconBox: "bg-chart-5/28 text-chart-5 dark:bg-chart-5/32",
    iconHover: "group-hover:bg-chart-5/40 dark:group-hover:bg-chart-5/45",
    row: "border-chart-5/30 bg-linear-to-br from-chart-5/16 via-card to-card dark:from-chart-5/20 dark:via-card/75 dark:to-card/55",
    rowHover: "hover:border-chart-5/50 hover:shadow-md",
    ringHover: "hover:ring-2 hover:ring-chart-5/25",
  },
] as const;

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
  onNewChat,
  variant = "drawer",
}: HistorySidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dailyPromptStatus = useQuery(api.usage.getDailyPromptStatus, {});

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

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const panel = (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-linear-to-b from-primary/6 via-sidebar to-secondary/25 text-sidebar-foreground dark:from-primary/10 dark:via-sidebar dark:to-secondary/20">
      <div className="flex flex-col gap-3 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-foreground flex items-center justify-center shadow-lg shadow-foreground/10">
              <div className="size-3 rounded-full border-2 border-background" />
            </div>
            <span className="font-medium tracking-tight text-sm">EmailGen</span>
          </div>
          {variant === "drawer" && (
            <Button onClick={onClose} variant="ghost" size="icon-sm" className="rounded-xl">
              <X className="size-4" />
            </Button>
          )}
        </div>

        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 h-10 rounded-xl bg-linear-to-r from-primary to-sidebar-primary text-primary-foreground shadow-md shadow-primary/30 transition-all group hover:from-primary/92 hover:to-sidebar-primary/92 hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]"
        >
          <Plus className="size-4 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-medium text-[13px]">New Campaign</span>
        </Button>

        <div className="relative group">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-1 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-primary/20 bg-linear-to-br from-card via-card to-secondary/15 pl-9 pr-3 text-[12px] text-foreground shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:from-card/90 dark:via-card/70 dark:to-secondary/25"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-2 custom-scrollbar">
        <div className="sticky top-0 z-1 flex items-center gap-2 bg-linear-to-r from-sidebar/98 via-sidebar/95 to-transparent py-3 backdrop-blur-sm dark:from-sidebar/95 dark:via-sidebar/90">
          <span className="size-2 shrink-0 rounded-full bg-linear-to-br from-chart-2 to-primary shadow-sm ring-4 ring-primary/25" />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/85 dark:text-primary/90">
            Recent campaigns
          </span>
        </div>
        {filteredChats.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-gradient-to-br from-chart-4/[0.12] via-card/80 to-chart-1/[0.1] px-5 text-center dark:from-chart-4/15 dark:via-card/50 dark:to-chart-1/12">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-chart-2/30 text-primary shadow-sm ring-1 ring-primary/20">
              <MessageSquare className="size-5 stroke-[1.5]" />
            </div>
            <p className="text-[12px] font-medium text-muted-foreground">
              {searchQuery.trim() ? "No campaigns match your search" : "No campaigns yet"}
            </p>
          </div>
        ) : (
          <ul className="flex list-none flex-col gap-2 pb-2">
            {filteredChats.map((chat, rowIndex) => {
              const isActive = activeChatId === chat.chatId;
              const tone = HISTORY_ROW_ACCENTS[rowIndex % HISTORY_ROW_ACCENTS.length];
              return (
                <li key={chat.chatId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectChat(chat.chatId);
                      }
                    }}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2.5 transition-all duration-200",
                      isActive
                        ? "border-primary/45 bg-gradient-to-br from-primary/[0.2] via-primary/[0.08] to-card shadow-md ring-2 ring-primary/25 dark:from-primary/25 dark:via-primary/12 dark:to-card/70"
                        : cn(tone.row, tone.rowHover, tone.ringHover, "ring-offset-1 ring-offset-sidebar dark:ring-offset-sidebar"),
                    )}
                    onClick={() => onSelectChat(chat.chatId)}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-inner transition-all duration-200",
                        isActive
                          ? "bg-primary/30 text-primary shadow-sm ring-1 ring-primary/30 dark:bg-primary/35"
                          : cn(tone.iconBox, tone.iconHover),
                      )}
                      aria-hidden
                    >
                      <Mail className="size-4 stroke-[1.75]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-[13px] font-medium leading-snug tracking-tight transition-colors",
                          isActive
                            ? "text-foreground"
                            : "text-foreground/75 group-hover:text-foreground",
                        )}
                      >
                        {chat.title}
                      </div>
                      <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year:
                            new Date(chat.updatedAt).getFullYear() !==
                            new Date().getFullYear()
                              ? "numeric"
                              : undefined,
                        })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex shrink-0 items-center transition-opacity duration-200",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.chatId);
                        }}
                        variant="ghost"
                        size="icon-xs"
                        className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/12 hover:text-destructive"
                        aria-label="Delete campaign"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto p-4">
        <div className="relative" ref={accountMenuRef}>
          <AnimatePresence>
            {accountMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full left-0 right-0 mb-3 z-50 rounded-3xl border border-border/50 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-3 py-2.5 mb-1 bg-muted/30 rounded-t-[20px] rounded-b-lg">
                  <div className="text-[12px] font-medium truncate leading-tight">{userName || "User"}</div>
                  <div className="text-[10px] text-muted-foreground truncate font-medium opacity-70">{userEmail}</div>
                </div>
                <div className="space-y-0.5 p-1">
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[12px] transition-all hover:bg-muted text-foreground font-semibold">
                    <Settings className="size-3.5 opacity-60" /> Account Settings
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[12px] transition-all hover:bg-muted text-foreground font-semibold">
                    <CreditCard className="size-3.5 opacity-60" /> Subscription
                  </button>
                  <div className="h-px bg-border/50 my-1 mx-2" />
                  <button
                    onClick={onSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[12px] transition-all hover:bg-muted text-destructive font-semibold"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setAccountMenuOpen((value) => !value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl p-2 transition-all hover:bg-muted/40 ring-1 ring-transparent",
              accountMenuOpen && "bg-muted/40 ring-border/40 shadow-sm"
            )}
          >
            <div className="relative shrink-0">
              <div
                className="size-8 rounded-xl border border-border/40 bg-muted/30 overflow-hidden shadow-sm"
              >
                {userImage ? (
                  <img src={userImage} alt={userName || ""} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-[10px] font-medium text-muted-foreground uppercase">
                    {initials}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-chart-3 border-2 border-sidebar" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[12px] font-medium text-foreground leading-tight">
                {userName || "User"}
              </div>
              <div className="truncate text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                Personal
              </div>
            </div>
            {dailyPromptStatus ? (
              <div className="shrink-0 text-sidebar-foreground">
                <PromptUsageRing used={dailyPromptStatus.used} limit={dailyPromptStatus.limit} />
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === "docked") {
    return <div className="h-full min-w-0 overflow-hidden border-r border-border/70">{panel}</div>;
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] lg:hidden"
      />
      <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-hidden border-r border-border/70 bg-card shadow-2xl lg:hidden">
        {panel}
      </div>
    </>
  );
}
