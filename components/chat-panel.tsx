"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { MessageSquare, PanelLeftOpen, Plus, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}: {
  input: string;
  status: ChatStatus;
}) {
  const attachments = usePromptInputAttachments();
  const isDisabled = input.trim().length === 0 && attachments.files.length === 0;

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
}: ChatPanelProps) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    messages: initialMessages,
  });

  const isStreaming = status === "streaming" || status === "submitted";

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
    onNewChat();
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text.trim());
    const hasAttachments = message.files.length > 0;

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
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button onClick={onToggleSidebar} variant="ghost" size="icon-sm" aria-label="Open chats">
            <PanelLeftOpen />
          </Button>
          <h2 className="text-sm font-semibold">AI Email Generator</h2>
          <Badge variant="outline" className="hidden sm:inline-flex">
            React Email
          </Badge>
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
            <PromptInputTools>
              <PromptAddAttachmentButton />
            </PromptInputTools>
            <PromptSubmitButton input={input} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
