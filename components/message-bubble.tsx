"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
  parts?: Array<Record<string, unknown>>;
}

function getToolLabel(part: Record<string, unknown>): string {
  const explicitName = part.toolName;
  if (typeof explicitName === "string" && explicitName.length > 0) {
    return explicitName;
  }

  const type = part.type;
  if (typeof type === "string" && type.startsWith("tool-")) {
    return type.replace("tool-", "");
  }

  return "tool";
}

function getToolState(part: Record<string, unknown>): string {
  const state = part.state;
  if (typeof state === "string" && state.length > 0) {
    return state;
  }
  if ("output" in part) {
    return "output-available";
  }
  if ("input" in part) {
    return "input-available";
  }
  return "unknown";
}

function isToolPart(part: Record<string, unknown>): boolean {
  const type = part.type;
  return typeof type === "string" && type.startsWith("tool-");
}

function isFilePart(part: Record<string, unknown>): boolean {
  return part.type === "file";
}

export function MessageBubble({ role, content, parts }: MessageBubbleProps) {
  const isUser = role === "user";
  const toolParts = (parts ?? []).filter(isToolPart);
  const fileParts = (parts ?? []).filter(isFilePart);

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border/70",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 whitespace-pre-wrap break-words",
          isUser
            ? "border-primary/70 bg-primary text-primary-foreground"
            : "border-border/70 bg-card/90 text-foreground",
        )}
      >
        {content}
        {fileParts.length > 0 ? (
          <div className={cn("grid gap-2", content && "mt-3")}>
            {fileParts.map((part, index) => {
              const url = typeof part.url === "string" ? part.url : null;
              const filename = typeof part.filename === "string" ? part.filename : `attachment-${index + 1}`;
              const mediaType = typeof part.mediaType === "string" ? part.mediaType : "application/octet-stream";

              return (
                <div key={`${filename}-${index}`} className="rounded-xl border border-border/60 bg-background/70 p-2.5">
                  {url && mediaType.startsWith("image/") ? (
                    <img src={url} alt={filename} className="mb-2 max-h-52 w-full rounded-lg object-cover" />
                  ) : null}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{filename}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        Open
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{mediaType}</div>
                </div>
              );
            })}
          </div>
        ) : null}
        {!isUser && toolParts.length > 0 ? (
          <div className={cn("grid gap-2", content && "mt-3")}>
            {toolParts.map((part, index) => {
              const label = getToolLabel(part);
              const state = getToolState(part);
              return (
                <div
                  key={`${label}-${index}`}
                  className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground/90">
                      Tool: {label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{state}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
