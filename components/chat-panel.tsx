"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery } from "convex/react";
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
  Bot,
  Copy,
  RefreshCcw,
  SquarePen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MessageAction,
  MessageActions,
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
import { isToolUIPart, ToolTrace } from "@/components/ai-elements/tool-trace";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  isChatModelId,
  type ChatModelId,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";

const CHAT_MODEL_STORAGE_KEY = "preferred-chat-model";

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
  onStop,
}: {
  input: string;
  status: ChatStatus;
  blocked: boolean;
  onStop: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const isGenerating = status === "submitted" || status === "streaming";
  const isDisabled =
    !isGenerating &&
    (blocked || (input.trim().length === 0 && attachments.files.length === 0));

  return (
    <PromptInputSubmit
      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
      disabled={isDisabled}
      onStop={onStop}
      status={status}
    />
  );
}

function PromptAddAttachmentButton() {
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

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");

const getMessageFiles = (message: UIMessage): FileUIPart[] =>
  message.parts.flatMap((part) => {
    if (part.type !== "file") {
      return [];
    }

    return [
      {
        type: "file" as const,
        filename: part.filename,
        mediaType: part.mediaType,
        url: part.url,
      },
    ];
  });

const buildSendMessagePayload = ({
  text,
  files,
  messageId,
}: {
  text: string;
  files: FileUIPart[];
  messageId?: string;
}) => {
  const trimmedText = text.trim();

  if (files.length > 0) {
    if (trimmedText) {
      return messageId
        ? { text: trimmedText, files, messageId }
        : { text: trimmedText, files };
    }

    return messageId ? { files, messageId } : { files };
  }

  return messageId ? { text: trimmedText, messageId } : { text: trimmedText };
};

export function ChatPanel({
  chatId,
  initialMessages,
  onEmailGenerated,
  onEnsureChatPath,
  onStatusChange,
}: ChatPanelProps) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<ChatModelId>(DEFAULT_CHAT_MODEL);
  const [chatError, setChatError] = useState<string | null>(null);
  const [hasPendingStop, setHasPendingStop] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const dailyPromptStatus = useQuery(api.usage.getDailyPromptStatus, {}) as
    | DailyPromptStatus
    | undefined;
  const hasReachedDailyLimit = dailyPromptStatus?.reached ?? false;

  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        model: selectedModel,
      },
    });
  }, [selectedModel]);

  const { messages, sendMessage, regenerate, status, stop } = useChat({
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
  const isAssistantStreaming = isStreaming && !hasPendingStop;

  useEffect(() => {
    onStatusChange?.(isAssistantStreaming);
  }, [isAssistantStreaming, onStatusChange]);

  useEffect(() => {
    try {
      const storedModel = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
      if (storedModel && isChatModelId(storedModel)) {
        setSelectedModel(storedModel);
      }
    } catch {
      // Ignore storage access issues and keep the default model.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, selectedModel);
    } catch {
      // Ignore storage access issues; the in-memory selection still works.
    }
  }, [selectedModel]);

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
  const editingMessage = useMemo(
    () =>
      editingMessageId
        ? messages.find(
            (message) =>
              message.id === editingMessageId && message.role === "user",
          ) ?? null
        : null,
    [editingMessageId, messages],
  );
  const editingMessageFiles = useMemo(
    () => (editingMessage ? getMessageFiles(editingMessage) : []),
    [editingMessage],
  );

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    const files =
      editingMessageFiles.length > 0
        ? [...editingMessageFiles, ...message.files]
        : message.files;
    const hasText = Boolean(text);
    const hasAttachments = files.length > 0;

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

    setHasPendingStop(false);
    void sendMessage(
      buildSendMessagePayload({
        text: hasText ? text : "Attached files for context",
        files,
        messageId: editingMessage?.id,
      }),
    );
    setChatError(null);
    setInput("");
    setEditingMessageId(null);
  };

  const handleModelSelection = (value: string) => {
    if (!isChatModelId(value)) {
      return;
    }

    setSelectedModel(value);
  };

  const activeModelLabel =
    CHAT_MODELS.find((model) => model.id === selectedModel)?.label ?? "Model";

  const handleCopyMessage = useCallback(async (message: UIMessage) => {
    const text = getMessageText(message);

    if (!text) {
      toast.error("Nothing to copy");
      return;
    }

    await navigator.clipboard.writeText(text);
    toast.success("Message copied");
  }, []);

  const handleEditUserMessage = useCallback((message: UIMessage) => {
    setEditingMessageId(message.id);
    setInput(getMessageText(message));
  }, []);

  const handleResendUserMessage = useCallback(
    (message: UIMessage) => {
      const text = getMessageText(message);
      const files = getMessageFiles(message);

      if ((!text && files.length === 0) || isStreaming) {
        return;
      }

      setHasPendingStop(false);
      void sendMessage(
        buildSendMessagePayload({
          text,
          files,
          messageId: message.id,
        }),
      );
      setChatError(null);
      setEditingMessageId(null);
    },
    [isStreaming, sendMessage],
  );

  const handleRetryAssistantMessage = useCallback(
    (message: UIMessage) => {
      if (isStreaming) {
        return;
      }

      setHasPendingStop(false);
      void regenerate({ messageId: message.id });
      setChatError(null);
      setEditingMessageId(null);
    },
    [isStreaming, regenerate],
  );

  const handleCancelEditing = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleStopStreaming = useCallback(() => {
    setHasPendingStop(true);
    stop();
  }, [stop]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <Conversation className="h-full custom-scrollbar">
          <ConversationContent
            className={cn(
              "mx-auto flex w-full max-w-4xl flex-col px-4 sm:px-5",
              displayMessages.length === 0
                ? "min-h-0 flex-1 gap-0 pt-6 pb-4"
                : "min-h-full gap-8 pb-6 pt-4",
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
                const toolParts = message.parts.filter(isToolUIPart);
                const reasoningText = reasoningParts
                  .map((part) => part.text)
                  .join("\n\n");
                const messageText = getMessageText(message);
                const lastPart = message.parts.at(-1);
                const isLiveAssistantMessage =
                  message.role === "assistant" &&
                  messageIndex === displayMessages.length - 1;
                const isReasoningStreaming =
                  isLiveAssistantMessage &&
                  isAssistantStreaming &&
                  lastPart?.type === "reasoning";
                const isLastAssistantMessage =
                  isLiveAssistantMessage;
                const showMessageActions =
                  message.role === "user" || !isStreaming;

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
                          <ReasoningContent className="bg-muted/30 rounded-xl p-4">
                            {reasoningText}
                          </ReasoningContent>
                        </Reasoning>
                      ) : null}

                      {toolParts.length > 0 ? (
                        <ToolTrace
                          parts={toolParts}
                          isLive={isLiveAssistantMessage && isAssistantStreaming}
                        />
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

                        if (isToolUIPart(part)) {
                          return null;
                        }

                        return null;
                      })}
                    </MessageContent>

                    {isAssistantStreaming && isLiveAssistantMessage ? (
                      <Message from="assistant">
                        <MessageContent>
                          <Shimmer>Thinking...</Shimmer>
                        </MessageContent>
                      </Message>
                    ) : null}

                    {showMessageActions ? (
                      <MessageActions
                        className={cn(
                          "px-1",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        {message.role === "user" ? (
                          <>
                            <MessageAction
                              aria-label="Copy user message"
                              disabled={!messageText}
                              label="Copy"
                              onClick={() => void handleCopyMessage(message)}
                              tooltip="Copy"
                            >
                              <Copy className="size-3.5" />
                            </MessageAction>
                            <MessageAction
                              aria-label="Resend user message"
                              disabled={!messageText || isStreaming}
                              label="Resend"
                              onClick={() => handleResendUserMessage(message)}
                              tooltip="Resend"
                            >
                              <RefreshCcw className="size-3.5" />
                            </MessageAction>
                            <MessageAction
                              aria-label="Edit user message"
                              disabled={!messageText}
                              label="Edit"
                              onClick={() => handleEditUserMessage(message)}
                              tooltip="Edit"
                            >
                              <SquarePen className="size-3.5" />
                            </MessageAction>
                          </>
                        ) : (
                          <>
                            <MessageAction
                              aria-label="Copy assistant message"
                              disabled={!messageText}
                              label="Copy"
                              onClick={() => void handleCopyMessage(message)}
                              tooltip="Copy"
                            >
                              <Copy className="size-3.5" />
                            </MessageAction>
                            <MessageAction
                              aria-label="Retry assistant response"
                              disabled={!isLastAssistantMessage || isStreaming}
                              label="Retry"
                              onClick={() =>
                                handleRetryAssistantMessage(message)
                              }
                              tooltip={
                                isLastAssistantMessage
                                  ? "Retry"
                                  : "Retry latest response only"
                              }
                            >
                              <RefreshCcw className="size-3.5" />
                            </MessageAction>
                          </>
                        )}
                      </MessageActions>
                    ) : null}
                  </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="mx-auto w-full max-w-4xl p-2 pt-0">
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
            {editingMessage ? (
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                <span className="min-w-0 flex-1 leading-relaxed">
                  Editing a previous message. Sending will replace that turn and
                  remove every reply after it.
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg px-2 text-xs"
                  onClick={handleCancelEditing}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
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
            <PromptInputTools>
              <PromptAddAttachmentButton />
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
              onStop={handleStopStreaming}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
