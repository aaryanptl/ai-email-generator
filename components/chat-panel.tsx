"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery } from "convex/react";
import { DefaultChatTransport, type ChatStatus, type FileUIPart, type UIMessage } from "ai";
import { MessageSquare, PanelLeftOpen, Plus, PlusIcon, Palette, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

export interface EmailData {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
  success: boolean;
  error?: string;
}

interface ChatPanelProps {
  chatId: string;
  initialMessages: UIMessage[];
  onEmailGenerated: (data: EmailData) => void;
  onEnsureChatPath: (chatId: string) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onStatusChange?: (isStreaming: boolean) => void;
}

interface TemplateOption {
  _id: string;
  name: string;
}

interface DailyPromptStatus {
  limit: number;
  used: number;
  remaining: number;
  reached: boolean;
  dayKey: string;
}

function PromptUsageRing({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(limit - used, 0);
  const ratio = Math.min(used / limit, 1);
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isExhausted = remaining === 0;

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${remaining}/${limit} prompts left today (resets at 00:00 UTC)`}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="2.5"
        />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke="currentColor"
          className={isExhausted ? "text-destructive" : "text-foreground"}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-xs tabular-nums ${isExhausted ? "text-destructive" : "text-muted-foreground"}`}>
        {remaining}/{limit}
      </span>
    </div>
  );
}

function useDisplayMessages(messages: UIMessage[]) {
  return useMemo(() => {
    return messages.filter((message) => {
      if (message.role === "user") {
        return true;
      }

      if (message.role !== "assistant") {
        return false;
      }

      return message.parts.some((part) => {
        if (part.type === "text") {
          return part.text.trim().length > 0;
        }
        return part.type === "reasoning" || part.type === "file" || part.type.startsWith("tool-");
      });
    });
  }, [messages]);
}

function PromptInputAttachmentsInline() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="ml-1">
      {attachments.files.map((attachment) => (
        <Attachment
          key={attachment.id}
          data={attachment}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function PromptSubmitButton({
  input,
  status,
  blocked,
}: {
  input: string;
  status: ChatStatus;
  blocked: boolean;
}) {
  const attachments = usePromptInputAttachments();
  const isDisabled = blocked || (input.trim().length === 0 && attachments.files.length === 0);

  return (
    <PromptInputSubmit
      status={status}
      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
      disabled={isDisabled}
    />
  );
}

function PromptAddAttachmentButton() {
  const attachments = usePromptInputAttachments();

  return (
    <button
      type="button"
      onClick={() => attachments.openFileDialog()}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
      aria-label="Attach files"
    >
      <PlusIcon className="size-4" />
    </button>
  );
}

function MessageFiles({
  parts,
  from,
}: {
  parts: UIMessage["parts"];
  from: UIMessage["role"];
}) {
  const files = parts
    .filter((part): part is FileUIPart => part.type === "file")
    .map((part, index) => ({ ...part, id: `${part.url}-${index}` }));

  if (files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="grid" className={from === "assistant" ? "ml-0" : "ml-auto"}>
      {files.map((file) => (
        <Attachment key={file.id} data={file}>
          <AttachmentPreview />
        </Attachment>
      ))}
    </Attachments>
  );
}

export function ChatPanel({
  chatId,
  initialMessages,
  onEmailGenerated,
  onEnsureChatPath,
  onToggleSidebar,
  onNewChat,
  onStatusChange,
}: ChatPanelProps) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateCodeType, setTemplateCodeType] = useState<"html" | "tsx">("html");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const saveTemplate = useMutation(api.emails.saveTemplate);

  const templates = (useQuery(api.emails.listTemplates, {}) ?? []) as TemplateOption[];
  const dailyPromptStatus = useQuery(api.usage.getDailyPromptStatus, {}) as
    | DailyPromptStatus
    | undefined;
  const hasReachedDailyLimit = dailyPromptStatus?.reached ?? false;

  const selectedTemplateIds = useMemo(
    () => (selectedTemplateId === "none" ? [] : [selectedTemplateId]),
    [selectedTemplateId],
  );

  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        templateIds: selectedTemplateIds,
      },
    });
  }, [selectedTemplateIds]);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: chatTransport,
    onError: (error) => {
      const message = error.message ?? "Failed to send prompt.";
      if (message.toLowerCase().includes("daily limit reached")) {
        toast.error("Daily limit reached", {
          description: "You've used all 20 prompts for today. Resets at 00:00 UTC.",
        });
        return;
      }
      setChatError(message);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    onStatusChange?.(isStreaming);
  }, [isStreaming, onStatusChange]);

  const suggestions = [
    "Welcome email with hero banner and CTA",
    "Password reset notification",
    "Monthly newsletter with sections",
    "Order confirmation with details",
  ];

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }

      for (const part of message.parts) {
        if (
          part.type.startsWith("tool-") &&
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

  const displayMessages = useDisplayMessages(messages);

  const handleNewChat = () => {
    setMessages([]);
    processedToolCallsRef.current.clear();
    setInput("");
    setChatError(null);
    onNewChat();
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text.trim());
    const hasAttachments = message.files.length > 0;

    if (hasReachedDailyLimit) {
      toast.error("Daily limit reached", {
        description: "You've used all 20 prompts for today. Resets at 00:00 UTC.",
      });
      return;
    }

    if (!(hasText || hasAttachments) || isStreaming) {
      return;
    }

    if (messages.length === 0) {
      onEnsureChatPath(chatId);
    }

    sendMessage({
      text: hasText ? message.text : "Attached files for context",
      files: message.files,
    });
    setChatError(null);
    setInput("");
  };

  const handleManualTemplateSave = async () => {
    const normalizedName = templateName.trim();
    const normalizedDescription = templateDescription.trim();
    const normalizedCode = templateCode.trim();

    if (!normalizedName || !normalizedCode) {
      setSaveTemplateError("Template name and code are required.");
      return;
    }

    setSaveTemplateError(null);
    setIsSavingTemplate(true);

    try {
      let htmlCode = normalizedCode;
      let tsxCode: string | undefined;

      if (templateCodeType === "tsx") {
        tsxCode = normalizedCode;

        const response = await fetch("/api/render-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tsxCode: normalizedCode,
          }),
        });

        const payload = (await response.json()) as { htmlCode?: string; error?: string };
        if (!response.ok || !payload.htmlCode) {
          throw new Error(payload.error ?? "Could not compile TSX template.");
        }

        htmlCode = payload.htmlCode;
      }

      const insertedId = await saveTemplate({
        name: normalizedName,
        description: normalizedDescription || "Manual template",
        htmlCode,
        tsxCode,
      });

      setSelectedTemplateId(insertedId as string);
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCode("");
      setTemplateCodeType("html");
      setIsAddTemplateOpen(false);
    } catch (error) {
      setSaveTemplateError(
        error instanceof Error ? error.message : "Failed to save template.",
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleThemeSelection = (value: string) => {
    setSelectedTemplateId(value);
  };

  return (
    <div className="flex h-full flex-col bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button onClick={onToggleSidebar} variant="ghost" size="icon-sm" aria-label="Open chats">
            <PanelLeftOpen />
          </Button>
          <h2 className="text-sm font-semibold">AI Email Generator</h2>
          {dailyPromptStatus ? (
            <PromptUsageRing
              used={dailyPromptStatus.used}
              limit={dailyPromptStatus.limit}
            />
          ) : null}
        </div>
        <Button onClick={handleNewChat} variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          New Chat
        </Button>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 px-3 py-4">
          {displayMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-10" />}
              title="Create beautiful emails with AI"
              description="Describe your campaign, layout, and tone to generate a production-ready React Email template."
            >
              <div className="mt-2 grid w-full max-w-sm gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal py-2 text-left text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            displayMessages.map((message, messageIndex) => {
              const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
              const reasoningText = reasoningParts
                .map((part) => part.text)
                .join("\n\n");
              const lastPart = message.parts.at(-1);
              const isReasoningStreaming =
                messageIndex === displayMessages.length - 1 &&
                isStreaming &&
                lastPart?.type === "reasoning";

              return (
                <Message key={message.id} from={message.role}>
                  <MessageFiles parts={message.parts} from={message.role} />
                  <MessageContent>
                    {reasoningText ? (
                      <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoningText}</ReasoningContent>
                      </Reasoning>
                    ) : null}

                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        if (!part.text.trim()) {
                          return null;
                        }

                        return (
                          <MessageResponse key={`${message.id}-${index}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }

                      if (part.type.startsWith("tool-")) {
                        const toolName = part.type.replace("tool-", "");
                        const toolState = "state" in part ? String(part.state) : "unknown";
                        return (
                          <div
                            key={`${message.id}-${index}`}
                            className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium">Tool: {toolName}</span>
                              <span className="text-muted-foreground">{toolState}</span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </MessageContent>
                </Message>
              );
            })
          )}

          {isStreaming ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border/60 bg-background/70 px-4 py-4 pb-4">
        {chatError ? <p className="mb-2 text-xs text-destructive">{chatError}</p> : null}
        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-border/70 bg-card/90 p-2.5 shadow-sm"
          accept="image/*,application/pdf,text/*"
          multiple
          maxFiles={8}
          maxFileSize={10 * 1024 * 1024}
        >
          <PromptInputHeader>
            <PromptInputAttachmentsInline />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Message AI Email Generator"
              className="max-h-36 min-h-[56px] border-0 bg-transparent px-2 py-1.5 text-base shadow-none"
            />
          </PromptInputBody>
          <PromptInputFooter className="pt-1">
            <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add theme template</DialogTitle>
                  <DialogDescription>
                    Paste HTML or TSX code to save a reusable theme reference.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="template-name">Template name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g. Product launch clean"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.currentTarget.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      placeholder="Optional description"
                      value={templateDescription}
                      onChange={(event) =>
                        setTemplateDescription(event.currentTarget.value)
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Code type</Label>
                    <select
                      value={templateCodeType}
                      onChange={(event) =>
                        setTemplateCodeType(event.currentTarget.value as "html" | "tsx")
                      }
                      className="border-input bg-input/30 h-9 w-[160px] rounded-4xl border px-3 text-sm outline-none"
                    >
                      <option value="html">HTML</option>
                      <option value="tsx">TSX</option>
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="template-code">Template code</Label>
                    <Textarea
                      id="template-code"
                      placeholder={
                        templateCodeType === "html"
                          ? "Paste full HTML email code"
                          : "Paste full React Email TSX code"
                      }
                      value={templateCode}
                      onChange={(event) => setTemplateCode(event.currentTarget.value)}
                      className="h-52 min-h-52 max-h-52 overflow-y-auto font-mono text-xs"
                    />
                  </div>

                  {saveTemplateError ? (
                    <p className="text-xs text-destructive">{saveTemplateError}</p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => void handleManualTemplateSave()}
                    disabled={isSavingTemplate}
                  >
                    {isSavingTemplate ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : null}
                    {isSavingTemplate ? "Saving" : "Save template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <PromptInputTools>
              <PromptAddAttachmentButton />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 px-3">
                    <Palette className="size-4" />
                    <span className="text-xs">Theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Choose theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={selectedTemplateId}
                    onValueChange={handleThemeSelection}
                  >
                    <DropdownMenuRadioItem value="none">
                      No reference template
                    </DropdownMenuRadioItem>
                    {templates.map((template) => (
                      <DropdownMenuRadioItem key={template._id} value={template._id}>
                        {template.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setSaveTemplateError(null);
                      setIsAddTemplateOpen(true);
                    }}
                  >
                    Paste HTML / TSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PromptInputTools>
            <PromptSubmitButton input={input} status={status} blocked={hasReachedDailyLimit} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
