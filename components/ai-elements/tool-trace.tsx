"use client";

import type { UIMessage } from "ai";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

export function isToolUIPart(
  part: UIMessage["parts"][number],
): part is ToolPart {
  return part.type.startsWith("tool-");
}

function getToolName(part: ToolPart) {
  return part.type.replace("tool-", "");
}

function getToolState(part: ToolPart) {
  return "state" in part && typeof part.state === "string"
    ? part.state
    : "unknown";
}

function isRunningToolState(state: string) {
  return state === "input-streaming" || state === "input-available";
}

function getToolStateMeta(state: string) {
  switch (state) {
    case "input-streaming":
      return {
        label: "input-streaming",
        icon: Loader2,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: true,
      };
    case "input-available":
      return {
        label: "input-available",
        icon: Loader2,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: true,
      };
    case "approval-requested":
      return {
        label: "approval-requested",
        icon: ShieldAlert,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: false,
      };
    case "output-error":
      return {
        label: "output-error",
        icon: XCircle,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: false,
      };
    case "output-denied":
      return {
        label: "output-denied",
        icon: XCircle,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: false,
      };
    case "output-available":
      return {
        label: "output-available",
        icon: CheckCircle2,
        rowTone:
          "border-border/60 bg-muted/20 text-foreground",
        badgeTone:
          "border-border/60 bg-background/80 text-muted-foreground",
        iconTone: "text-muted-foreground",
        spin: false,
      };
    default:
      return {
        label: state,
        icon: Circle,
        rowTone:
          "border-border/70 bg-linear-to-r from-muted/40 to-background text-foreground",
        badgeTone:
          "border-border/70 bg-background/80 text-muted-foreground dark:bg-muted/20",
        iconTone: "text-muted-foreground",
        spin: false,
      };
  }
}

function hasToolDetails(part: ToolPart) {
  return (
    ("input" in part && part.input !== undefined) ||
    ("output" in part && part.output !== undefined) ||
    ("errorText" in part && typeof part.errorText === "string")
  );
}

function stringifyDetail(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolTraceRow({
  part,
  isLive,
}: {
  part: ToolPart;
  isLive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toolName = getToolName(part);
  const state = getToolState(part);
  const meta = getToolStateMeta(state);
  const Icon = meta.icon;
  const detailsAvailable = hasToolDetails(part);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border transition-colors",
          meta.rowTone,
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
            detailsAvailable ? "cursor-pointer" : "cursor-default",
          )}
          disabled={!detailsAvailable}
        >
          <span
            className={cn(
              "flex size-5.5 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background",
              meta.iconTone,
            )}
          >
            <Icon
              className={cn(
                "size-3",
                meta.spin && isLive && "animate-spin",
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-foreground">
              {toolName}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-full border px-2 text-[10px]",
              meta.badgeTone,
            )}
          >
            {meta.label}
          </Badge>
          {detailsAvailable ? (
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          ) : null}
        </CollapsibleTrigger>
        {detailsAvailable ? (
          <CollapsibleContent>
            <div className="border-t border-border/50 bg-background/70 px-3 pb-3 pt-2.5">
              {"input" in part && part.input !== undefined ? (
                <div className="mb-2.5">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Input
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-[11px] leading-4.5 text-foreground whitespace-pre-wrap break-words">
                    {stringifyDetail(part.input)}
                  </pre>
                </div>
              ) : null}
              {"output" in part && part.output !== undefined ? (
                <div className="mb-2.5">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Output
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-[11px] leading-4.5 text-foreground whitespace-pre-wrap break-words">
                    {stringifyDetail(part.output)}
                  </pre>
                </div>
              ) : null}
              {"errorText" in part && typeof part.errorText === "string" ? (
                <div>
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Error
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px] leading-4.5 text-foreground">
                    {part.errorText}
                  </div>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  );
}

export function ToolTrace({
  parts,
  isLive = false,
}: {
  parts: ToolPart[];
  isLive?: boolean;
}) {
  const summary = useMemo(() => {
    const completed = parts.filter(
      (part) => getToolState(part) === "output-available",
    ).length;
    const running = isLive
      ? parts.filter((part) => isRunningToolState(getToolState(part))).length
      : 0;
    const errored = parts.filter((part) =>
      ["output-error", "output-denied"].includes(getToolState(part)),
    ).length;

    if (running > 0) {
      return `Using ${parts.length} ${parts.length === 1 ? "tool" : "tools"}`;
    }
    if (errored > 0) {
      return `${errored} tool ${errored === 1 ? "issue" : "issues"}`;
    }
    return `Used ${completed || parts.length} ${
      parts.length === 1 ? "tool" : "tools"
    }`;
  }, [isLive, parts]);

  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-center gap-1.5 px-1 text-[13px] text-muted-foreground">
        <span className="font-medium">{summary}</span>
        <ChevronDown className="size-3" />
      </div>
      <div className="space-y-1.5">
        {parts.map((part, index) => (
          <ToolTraceRow
            key={`${part.type}-${index}`}
            part={part}
            isLive={isLive}
          />
        ))}
      </div>
    </div>
  );
}
