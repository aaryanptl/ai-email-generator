"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery } from "convex/react";
import {
  DefaultChatTransport,
  type ChatStatus,
  type FileUIPart,
  type UIMessage,
} from "ai";
import {
  MessageSquare,
  PlusIcon,
  Palette,
  Loader2,
  Filter,
  Bot,
} from "lucide-react";
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
import { motion } from "motion/react";

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
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  type ChatModelId,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";

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
  onStatusChange?: (isStreaming: boolean) => void;
}

interface TemplateOption {
  _id: string;
  name: string;
}

type EmailCategoryOption = {
  value: string;
  label: string;
};

const EMAIL_CATEGORY_OPTIONS: EmailCategoryOption[] = [
  { value: "auto", label: "Auto detect" },
  { value: "marketing_newsletter", label: "Marketing Newsletter" },
  { value: "product_launch", label: "Product Launch" },
  { value: "cold_outreach_b2b", label: "Cold Outreach (B2B)" },
  { value: "follow_up_nurture", label: "Follow-up / Nurture" },
  { value: "promo_offer", label: "Promotional Offer" },
  { value: "transactional_update", label: "Transactional Update" },
];

interface DailyPromptStatus {
  limit: number;
  used: number;
  remaining: number;
  reached: boolean;
  dayKey: string;
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
        return (
          part.type === "reasoning" ||
          part.type === "file" ||
          part.type.startsWith("tool-")
        );
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
  const isDisabled =
    blocked || (input.trim().length === 0 && attachments.files.length === 0);

  return (
    <PromptInputSubmit
      status={status}
      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
      disabled={isDisabled}
    />
  );
}

function PromptAddAttachmentButton({
  selectedTemplateId,
  templates,
  onSelectTemplate,
  selectedEmailCategory,
  onSelectEmailCategory,
  activeEmailCategoryLabel,
  onOpenAddTemplate,
}: {
  selectedTemplateId: string;
  templates: TemplateOption[];
  onSelectTemplate: (value: string) => void;
  selectedEmailCategory: string;
  onSelectEmailCategory: (value: string) => void;
  activeEmailCategoryLabel: string;
  onOpenAddTemplate: () => void;
}) {
  const attachments = usePromptInputAttachments();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
          aria-label="Open prompt tools"
        >
          <PlusIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 rounded-2xl border-border/40 p-1 shadow-2xl"
      >
        <DropdownMenuItem
          className="rounded-xl px-3 py-2.5 text-xs font-semibold"
          onSelect={(event) => {
            event.preventDefault();
            attachments.openFileDialog();
          }}
        >
          <PlusIcon className="size-4" />
          Add files or photos
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 opacity-40" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-xl px-3 py-2.5 text-xs font-semibold">
            <Palette className="size-4" />
            Use style
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 rounded-2xl border-border/40 p-1 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-widest opacity-50 px-2 py-1.5">
              Design Reference
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedTemplateId}
              onValueChange={onSelectTemplate}
              className="space-y-0.5"
            >
              <DropdownMenuRadioItem
                value="none"
                className="rounded-xl text-xs font-semibold py-2"
              >
                Blank Slate
              </DropdownMenuRadioItem>
              {templates.map((template) => (
                <DropdownMenuRadioItem
                  key={template._id}
                  value={template._id}
                  className="rounded-xl text-xs font-semibold py-2"
                >
                  {template.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="my-1 opacity-40" />
            <DropdownMenuItem
              className="rounded-xl text-xs font-medium py-2 focus:bg-foreground focus:text-background"
              onSelect={(event) => {
                event.preventDefault();
                onOpenAddTemplate();
              }}
            >
              + Import Custom Style
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-xl px-3 py-2.5 text-xs font-semibold">
            <Filter className="size-4" />
            Type
            <DropdownMenuShortcut className="max-w-[88px] truncate text-[10px]">
              {activeEmailCategoryLabel}
            </DropdownMenuShortcut>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 rounded-2xl border-border/40 p-1 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-widest opacity-50 px-2 py-1.5">
              Campaign Category
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedEmailCategory}
              onValueChange={onSelectEmailCategory}
              className="space-y-0.5"
            >
              {EMAIL_CATEGORY_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="rounded-xl text-xs font-semibold py-2"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
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
    <Attachments
      variant="grid"
      className={from === "assistant" ? "ml-0" : "ml-auto"}
    >
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
  onStatusChange,
}: ChatPanelProps) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [selectedEmailCategory, setSelectedEmailCategory] =
    useState<string>("auto");
  const [selectedModel, setSelectedModel] =
    useState<ChatModelId>(DEFAULT_CHAT_MODEL);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateCodeType, setTemplateCodeType] = useState<"html" | "tsx">(
    "html",
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(
    null,
  );
  const [chatError, setChatError] = useState<string | null>(null);
  const saveTemplate = useMutation(api.emails.saveTemplate);

  const templates = (useQuery(api.emails.listTemplates, {}) ??
    []) as TemplateOption[];
  const dailyPromptStatus = useQuery(api.usage.getDailyPromptStatus, {}) as
    | DailyPromptStatus
    | undefined;
  const hasReachedDailyLimit = dailyPromptStatus?.reached ?? false;

  const selectedTemplateIds = useMemo(
    () => (selectedTemplateId === "none" ? [] : [selectedTemplateId]),
    [selectedTemplateId],
  );

  const chatTransport = useMemo(() => {
    const emailCategory =
      selectedEmailCategory === "auto" ? null : selectedEmailCategory;

    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        templateIds: selectedTemplateIds,
        emailCategory,
        model: selectedModel,
      },
    });
  }, [selectedTemplateIds, selectedEmailCategory, selectedModel]);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: chatTransport,
    onError: (error) => {
      const message = error.message ?? "Failed to send prompt.";
      if (message.toLowerCase().includes("daily limit reached")) {
        toast.error("Daily limit reached", {
          description:
            "You've used all 20 prompts for today. Resets at 00:00 UTC.",
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

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text.trim());
    const hasAttachments = message.files.length > 0;

    if (hasReachedDailyLimit) {
      toast.error("Daily limit reached", {
        description:
          "You've used all 20 prompts for today. Resets at 00:00 UTC.",
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

        const payload = (await response.json()) as {
          htmlCode?: string;
          error?: string;
        };
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

  const handleCategorySelection = (value: string) => {
    setSelectedEmailCategory(value);
  };

  const handleModelSelection = (value: string) => {
    setSelectedModel(value as ChatModelId);
  };

  const activeEmailCategoryLabel =
    EMAIL_CATEGORY_OPTIONS.find(
      (option) => option.value === selectedEmailCategory,
    )?.label ?? "Auto detect";

  const activeModelLabel =
    CHAT_MODELS.find((model) => model.id === selectedModel)?.label ?? "Model";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <Conversation className="h-full custom-scrollbar">
          <ConversationContent
            className={cn(
              "mx-auto flex w-full max-w-4xl flex-col px-4 sm:px-5",
              displayMessages.length === 0
                ? "min-h-0 flex-1 gap-0 pt-6 pb-4"
                : "min-h-full gap-8 pb-24 pt-4",
            )}
          >
            {displayMessages.length === 0 ? (
              <div className="flex w-full flex-col items-stretch text-center sm:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6 space-y-3 sm:mb-8"
                >
                  <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-foreground shadow-md sm:mx-0">
                    <div className="size-5 rounded-full border-[2.5px] border-background" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem]">
                    Your AI Copilot Awaits.
                  </h1>
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground sm:mx-0">
                    Design professional, high-conversion email campaigns in
                    seconds. Start with a template or a custom prompt.
                  </p>
                </motion.div>

                <div className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:mx-0 sm:max-w-2xl">
                  {[
                    {
                      title: "Marketing",
                      desc: "Newsletters & product launches",
                      icon: <Palette className="size-5 text-chart-2" />,
                      prompt:
                        "Design a sleek marketing newsletter for a new SaaS product launch with a hero section and three feature highlights.",
                    },
                    {
                      title: "Transactional",
                      desc: "Orders & account updates",
                      icon: <MessageSquare className="size-5 text-chart-1" />,
                      prompt:
                        "Create a modern order confirmation email with a summary table, shipping details, and a 'track order' button.",
                    },
                    {
                      title: "Welcome",
                      desc: "Onboarding & user greetings",
                      icon: <PlusIcon className="size-5 text-chart-3" />,
                      prompt:
                        "Draft a friendly welcome email for new subscribers that introduces the team and provides three getting-started steps.",
                    },
                  ].map((item, idx) => (
                    <motion.button
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 * (idx + 1) }}
                      onClick={() => setInput(item.prompt)}
                      type="button"
                      className="group relative flex w-full flex-row items-center gap-4 rounded-2xl border border-border/60 bg-muted/25 p-4 text-left transition-all hover:border-foreground/15 hover:bg-muted/35 hover:shadow-md sm:gap-5 sm:p-4"
                    >
                      <div className="shrink-0 rounded-lg bg-card p-2.5 shadow-sm ring-1 ring-border/40 transition-transform group-hover:scale-[1.02]">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {item.desc}
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 transition-colors group-hover:text-foreground">
                        Try&nbsp;&rarr;
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              displayMessages.map((message, messageIndex) => {
                const reasoningParts = message.parts.filter(
                  (part) => part.type === "reasoning",
                );
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
                        <Reasoning
                          className="w-full"
                          isStreaming={isReasoningStreaming}
                        >
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
                          const toolState =
                            "state" in part ? String(part.state) : "unknown";
                          return (
                            <div
                              key={`${message.id}-${index}`}
                              className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium">
                                  Tool: {toolName}
                                </span>
                                <span className="text-muted-foreground">
                                  {toolState}
                                </span>
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
      </div>

      <div className="shrink-0 border-t border-border/50 bg-card px-3 py-2 shadow-premium-reverse sm:px-4">
        <div className="mx-auto w-full max-w-4xl">
          {chatError ? (
            <p className="mb-2 text-xs text-destructive">{chatError}</p>
          ) : null}
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border/70 bg-card p-1.5 shadow-premium dark:bg-surface-elevated"
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
                className="min-h-10 max-h-28 border-0 bg-transparent px-2 py-1 text-sm shadow-none"
              />
            </PromptInputBody>
            <PromptInputFooter className="pt-0">
              <Dialog
                open={isAddTemplateOpen}
                onOpenChange={setIsAddTemplateOpen}
              >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl rounded-3xl border-border/40 p-6 shadow-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      Add Design Reference
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium">
                      Inject a custom theme or existing code to guide the
                      AI&apos;s output style.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="template-name"
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        Template Name
                      </Label>
                      <Input
                        id="template-name"
                        placeholder="e.g. Minimalist Product Update"
                        value={templateName}
                        onChange={(event) =>
                          setTemplateName(event.currentTarget.value)
                        }
                        className="rounded-xl h-10 border-border/40 bg-muted/20"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="template-description"
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        Context (Optional)
                      </Label>
                      <Input
                        id="template-description"
                        placeholder="Briefly describe the design style..."
                        value={templateDescription}
                        onChange={(event) =>
                          setTemplateDescription(event.currentTarget.value)
                        }
                        className="rounded-xl h-10 border-border/40 bg-muted/20"
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="grid gap-2 flex-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Format
                        </Label>
                        <select
                          value={templateCodeType}
                          onChange={(event) =>
                            setTemplateCodeType(
                              event.currentTarget.value as "html" | "tsx",
                            )
                          }
                          className="border-border/40 bg-muted/20 h-10 rounded-xl border px-3 text-sm outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-semibold"
                        >
                          <option value="html">HTML Code</option>
                          <option value="tsx">React TSX</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="template-code"
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        Source Code
                      </Label>
                      <Textarea
                        id="template-code"
                        placeholder={
                          templateCodeType === "html"
                            ? "Paste raw HTML here..."
                            : "Paste React Email components here..."
                        }
                        value={templateCode}
                        onChange={(event) =>
                          setTemplateCode(event.currentTarget.value)
                        }
                        className="h-40 min-h-40 max-h-40 overflow-y-auto font-mono text-[11px] rounded-xl border-border/40 bg-muted/20 p-4"
                      />
                    </div>

                    {saveTemplateError ? (
                      <p className="text-xs text-destructive font-medium">
                        {saveTemplateError}
                      </p>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={() => void handleManualTemplateSave()}
                      disabled={isSavingTemplate}
                      className="w-full h-11 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
                    >
                      {isSavingTemplate ? (
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : null}
                      {isSavingTemplate
                        ? "Registering Template..."
                        : "Save Reference Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <PromptInputTools>
                <PromptAddAttachmentButton
                  selectedTemplateId={selectedTemplateId}
                  templates={templates}
                  onSelectTemplate={handleThemeSelection}
                  selectedEmailCategory={selectedEmailCategory}
                  onSelectEmailCategory={handleCategorySelection}
                  activeEmailCategoryLabel={activeEmailCategoryLabel}
                  onOpenAddTemplate={() => {
                    setSaveTemplateError(null);
                    setIsAddTemplateOpen(true);
                  }}
                />
                <div className="h-4 w-px bg-border/40 mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    >
                      <Bot className="size-3.5" />
                      <span className="text-[11px] font-medium tracking-wider">
                        {activeModelLabel}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-64 rounded-2xl p-1.5 shadow-2xl border-border/40"
                  >
                    <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-widest opacity-50 px-2 py-1.5">
                      Chat Model
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={selectedModel}
                      onValueChange={handleModelSelection}
                      className="space-y-0.5"
                    >
                      {CHAT_MODELS.map((model) => (
                        <DropdownMenuRadioItem
                          key={model.id}
                          value={model.id}
                          className="rounded-xl text-xs font-semibold py-2"
                        >
                          {model.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PromptInputTools>
              <PromptSubmitButton
                input={input}
                status={status}
                blocked={hasReachedDailyLimit}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
