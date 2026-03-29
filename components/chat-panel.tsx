"use client";

import { useChat } from "@ai-sdk/react";
import {
	type ChatStatus,
	DefaultChatTransport,
	type FileUIPart,
	type UIMessage,
} from "ai";
import { useMutation, useQuery } from "convex/react";
import {
	Bot,
	Copy,
	Mail,
	MessageSquare,
	Palette,
	PlusIcon,
	RefreshCcw,
	SquarePen,
} from "lucide-react";
import { motion } from "motion/react";
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
	type PromptInputMessage,
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
import type { EmailArtifactRevision } from "@/components/artifact-panel";

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
	type ChatModelId,
	DEFAULT_CHAT_MODEL,
	isChatModelId,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";

const CHAT_MODEL_STORAGE_KEY = "preferred-chat-model";
const MAX_CONVEX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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
	emailHistory: EmailArtifactRevision[];
	selectedRevisionId: string | null;
	onEmailGenerated: (data: EmailData) => void;
	onEnsureChatPath: (chatId: string) => void;
	onSelectRevision: (revisionId: string) => void;
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

function createOccurrenceKey(base: string, counts: Map<string, number>) {
	const nextCount = (counts.get(base) ?? 0) + 1;
	counts.set(base, nextCount);
	return `${base}-${nextCount}`;
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

const isImageFilePart = (file: FileUIPart) =>
	typeof file.mediaType === "string" && file.mediaType.startsWith("image/");

const shouldUploadImageFile = (file: FileUIPart) =>
	isImageFilePart(file) &&
	typeof file.url === "string" &&
	(file.url.startsWith("data:") || file.url.startsWith("blob:"));

const filePartToBlob = async (file: FileUIPart) => {
	const response = await fetch(file.url);
	if (!response.ok) {
		throw new Error(`Failed to read attachment "${file.filename ?? "image"}".`);
	}

	return await response.blob();
};

function MessageArtifactCard({
	revision,
	isSelected,
	onSelect,
}: {
	revision: EmailArtifactRevision;
	isSelected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"mt-4 w-full max-w-md rounded-2xl border p-3 text-left shadow-sm transition-all",
				isSelected
					? "border-foreground/20 bg-card shadow-md"
					: "border-border/60 bg-background/70 hover:border-foreground/15 hover:bg-background",
			)}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground">
					<Mail className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-foreground">
						{revision.name}
					</p>
					<span className="mt-1 inline-flex rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Artifact
					</span>
				</div>
			</div>
		</button>
	);
}

export function ChatPanel({
	chatId,
	initialMessages,
	emailHistory,
	selectedRevisionId,
	onEmailGenerated,
	onEnsureChatPath,
	onSelectRevision,
	onStatusChange,
}: ChatPanelProps) {
	const processedToolCallsRef = useRef<Set<string>>(new Set());
	const submitInFlightRef = useRef(false);
	const [input, setInput] = useState("");
	const [selectedModel, setSelectedModel] = useState<ChatModelId>(() => {
		if (typeof window === "undefined") {
			return DEFAULT_CHAT_MODEL;
		}

		try {
			const storedModel = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
			return storedModel && isChatModelId(storedModel)
				? storedModel
				: DEFAULT_CHAT_MODEL;
		} catch {
			return DEFAULT_CHAT_MODEL;
		}
	});
	const [chatError, setChatError] = useState<string | null>(null);
	const [hasPendingStop, setHasPendingStop] = useState(false);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const dailyPromptStatus = useQuery(api.usage.getDailyPromptStatus, {}) as
		| DailyPromptStatus
		| undefined;
	const hasReachedDailyLimit = dailyPromptStatus?.reached ?? false;
	const generateUploadUrl = useMutation(api.images.generateUploadUrl);
	const finalizeUpload = useMutation(api.images.finalizeUpload);

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
		if (!isStreaming) {
			submitInFlightRef.current = false;
		}
	}, [isStreaming]);

	useEffect(() => {
		onStatusChange?.(isAssistantStreaming);
	}, [isAssistantStreaming, onStatusChange]);

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
				? (messages.find(
						(message) =>
							message.id === editingMessageId && message.role === "user",
					) ?? null)
				: null,
		[editingMessageId, messages],
	);
	const editingMessageFiles = useMemo(
		() => (editingMessage ? getMessageFiles(editingMessage) : []),
		[editingMessage],
	);

	const uploadAttachedImages = useCallback(
		async (files: FileUIPart[]) => {
			const preparedFiles = [...files];
			const uploadTargets = preparedFiles
				.map((file, index) => ({ file, index }))
				.filter(({ file }) => shouldUploadImageFile(file));

			if (uploadTargets.length === 0) {
				return preparedFiles;
			}

			for (const { file, index } of uploadTargets) {
				const uploadUrl = await generateUploadUrl({ chatId });
				const blob = await filePartToBlob(file);
				if (blob.size > MAX_CONVEX_IMAGE_SIZE_BYTES) {
					throw new Error(
						`Image "${file.filename ?? "attachment"}" exceeds the 5 MB upload limit.`,
					);
				}

				const uploadResponse = await fetch(uploadUrl, {
					method: "POST",
					headers: {
						"Content-Type":
							file.mediaType || blob.type || "application/octet-stream",
					},
					body: blob,
				});

				if (!uploadResponse.ok) {
					throw new Error(
						`Failed to upload image "${file.filename ?? "attachment"}".`,
					);
				}

				const { storageId } = (await uploadResponse.json()) as {
					storageId?: string;
				};
				if (!storageId) {
					throw new Error(
						`Convex did not return a storage id for "${file.filename ?? "attachment"}".`,
					);
				}

				const uploadedImage = await finalizeUpload({
					chatId,
					storageId: storageId as never,
					fileName: file.filename ?? "image",
					contentType:
						file.mediaType || blob.type || "application/octet-stream",
					sizeBytes: blob.size,
				});

				preparedFiles[index] = {
					...file,
					url: uploadedImage.url,
				};
			}

			return preparedFiles;
		},
		[chatId, finalizeUpload, generateUploadUrl],
	);

	const handleSubmit = async (message: PromptInputMessage) => {
		if (submitInFlightRef.current) {
			return;
		}

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

		submitInFlightRef.current = true;

		if (messages.length === 0) {
			onEnsureChatPath(chatId);
		}

		let preparedFiles = files;
		try {
			preparedFiles = await uploadAttachedImages(files);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to upload one or more attached images.";
			setChatError(message);
			toast.error("Image upload failed", {
				description: message,
			});
			submitInFlightRef.current = false;
			return;
		}

		setHasPendingStop(false);
		void sendMessage(
			buildSendMessagePayload({
				text: hasText ? text : "Attached files for context",
				files: preparedFiles,
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
								const textPartKeyCounts = new Map<string, number>();
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
								const isLastAssistantMessage = isLiveAssistantMessage;
								const showMessageActions =
									message.role === "user" || !isStreaming;
								const artifactCards =
									message.role === "assistant"
										? message.parts.flatMap((part) => {
												if (!isToolUIPart(part) || !("output" in part)) {
													return [];
												}

												const output = part.output as
													| Partial<EmailData>
													| undefined;
												if (
													!output ||
													output.success !== true ||
													typeof output.htmlCode !== "string" ||
													typeof output.tsxCode !== "string"
												) {
													return [];
												}

												const matchedRevision = emailHistory.find(
													(revision) =>
														revision.htmlCode === output.htmlCode &&
														revision.tsxCode === output.tsxCode,
												);

												if (!matchedRevision) {
													return [];
												}

												return [{ revision: matchedRevision }];
											})
										: [];

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
													isLive={
														isLiveAssistantMessage && isAssistantStreaming
													}
												/>
											) : null}

											{message.parts.map((part) => {
												if (part.type === "text") {
													if (!part.text.trim()) {
														return null;
													}

													return (
														<MessageResponse
															key={createOccurrenceKey(
																`${message.id}-${part.text}`,
																textPartKeyCounts,
															)}
														>
															{part.text}
														</MessageResponse>
													);
												}

												if (isToolUIPart(part)) {
													return null;
												}

												return null;
											})}
											{artifactCards.map(({ revision }) => (
												<MessageArtifactCard
													key={revision.id}
													revision={revision}
													isSelected={selectedRevisionId === revision.id}
													onSelect={() => onSelectRevision(revision.id)}
												/>
											))}
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
