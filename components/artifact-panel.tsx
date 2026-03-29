"use client";

import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	ArrowLeft,
	Check,
	Code2,
	Copy,
	Download,
	Eye,
	FolderOpen,
	ImagePlus,
	Link2,
	Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { CodeViewer } from "./code-viewer";
import { EmailPreview } from "./email-preview";

export interface EmailArtifact {
	name: string;
	description: string;
	tsxCode: string;
	htmlCode: string;
}

export interface EmailArtifactRevision extends EmailArtifact {
	id: string;
	assistantMessageId: string;
	createdAt: number;
	updatedAt: number;
}

type ArtifactTab = "preview" | "code" | "assets";

interface ArtifactPanelProps {
	chatId: string;
	email: EmailArtifact | null;
	emailHistory: EmailArtifactRevision[];
	selectedRevisionId: string | null;
	compilationError?: string | null;
	isStreaming?: boolean;
	onEnsureChatPath?: (chatId: string) => void;
	onSelectRevision?: (revisionId: string) => void;
}

interface UploadedImage {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	uploadedAt: number;
	url: string | null;
}

const formatSize = (sizeBytes: number) => {
	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}
	if (sizeBytes < 1024 * 1024) {
		return `${Math.round(sizeBytes / 1024)} KB`;
	}
	return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatHtmlForDisplay = (html: string) => {
	const normalized = html
		.replace(/></g, ">\n<")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	const lines = normalized.split("\n");
	let indentLevel = 0;

	return lines
		.map((line) => {
			const trimmed = line.trim();

			if (!trimmed) {
				return "";
			}

			const isClosingTag = /^<\/[^>]+>/.test(trimmed);
			const isComment = /^<!--/.test(trimmed);
			const isDoctype = /^<!DOCTYPE/i.test(trimmed);
			const isOpeningTag =
				/^<[^!/][^>]*[^/]>$/.test(trimmed) &&
				!/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(
					trimmed,
				) &&
				!trimmed.includes("</");

			if (isClosingTag) {
				indentLevel = Math.max(indentLevel - 1, 0);
			}

			const formattedLine = `${"  ".repeat(indentLevel)}${trimmed}`;

			if (isOpeningTag && !isComment && !isDoctype) {
				indentLevel += 1;
			}

			return formattedLine;
		})
		.join("\n");
};

function EmailAssetsPanel({
	chatId,
	onEnsureChatPath,
}: {
	chatId: string;
	onEnsureChatPath?: (chatId: string) => void;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [imageUploadError, setImageUploadError] = useState<string | null>(null);
	const [copiedImageId, setCopiedImageId] = useState<string | null>(null);

	const generateUploadUrl = useMutation(api.images.generateUploadUrl);
	const finalizeUpload = useMutation(api.images.finalizeUpload);
	const uploadedImages = (useQuery(api.images.listByChatId, { chatId }) ??
		[]) as UploadedImage[];

	const handleUploadImage = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				setImageUploadError("Please select an image file.");
				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				setImageUploadError("Image must be 5 MB or smaller.");
				return;
			}

			setImageUploadError(null);
			setIsUploadingImage(true);

			try {
				onEnsureChatPath?.(chatId);

				const uploadUrl = await generateUploadUrl({ chatId });
				const response = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				});

				if (!response.ok) {
					throw new Error("Upload failed");
				}

				const payload = (await response.json()) as { storageId?: string };
				if (!payload.storageId) {
					throw new Error("Upload response missing storage ID");
				}

				await finalizeUpload({
					chatId,
					storageId: payload.storageId as Id<"_storage">,
					fileName: file.name,
					contentType: file.type,
					sizeBytes: file.size,
				});
			} catch (error) {
				setImageUploadError(
					error instanceof Error
						? error.message
						: "Could not upload image. Please retry.",
				);
			} finally {
				setIsUploadingImage(false);
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}
		},
		[chatId, finalizeUpload, generateUploadUrl, onEnsureChatPath],
	);

	const handleCopyUrl = useCallback(async (id: string, url: string | null) => {
		if (!url) {
			return;
		}
		await navigator.clipboard.writeText(url);
		setCopiedImageId(id);
		setTimeout(() => setCopiedImageId(null), 1600);
	}, []);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const selectedFile = event.target.files?.[0];
					if (!selectedFile) {
						return;
					}
					void handleUploadImage(selectedFile);
				}}
			/>

			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1">
					<h3 className="text-2xl font-semibold tracking-tight">
						Email Assets
					</h3>
					<p className="text-sm text-muted-foreground">
						Manage your logos, product photography, and icons.
					</p>
				</div>
				<Button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploadingImage}
					className="h-11 px-6 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-medium shadow-lg gap-2"
				>
					{isUploadingImage ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<ImagePlus className="size-4" />
					)}
					{isUploadingImage ? "Processing..." : "Add New Asset"}
				</Button>
			</div>

			{imageUploadError && (
				<div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-3">
					<AlertTriangle className="size-4" />
					{imageUploadError}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{uploadedImages.length === 0 ? (
					<div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border-2 border-dashed border-border/50 bg-muted/20">
						<div className="size-16 rounded-3xl bg-background flex items-center justify-center shadow-sm">
							<ImagePlus className="size-6 text-muted-foreground/50" />
						</div>
						<div className="space-y-1 px-6">
							<p className="font-medium">No assets found</p>
							<p className="text-xs text-muted-foreground max-w-[240px]">
								Upload your brand assets here to easily reference them in your
								campaign designs.
							</p>
						</div>
					</div>
				) : (
					uploadedImages.map((image) => (
						<motion.div
							layout
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							key={image.id}
							className="group relative flex flex-col rounded-3xl border border-border/50 bg-card dark:bg-surface-elevated overflow-hidden hover:shadow-2xl hover:border-foreground/10 transition-all"
						>
							<div className="aspect-[4/3] w-full bg-muted/30 relative overflow-hidden flex items-center justify-center">
								{image.url ? (
									<img
										src={image.url}
										alt={image.fileName}
										className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								) : (
									<ImagePlus className="size-8 text-muted-foreground/30" />
								)}
								<div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										className="h-9 w-full rounded-xl bg-card font-medium text-foreground shadow-2xl hover:bg-card/90"
										onClick={() => void handleCopyUrl(image.id, image.url)}
										disabled={!image.url}
									>
										{copiedImageId === image.id ? (
											<Check className="size-3.5 mr-2" />
										) : (
											<Link2 className="size-3.5 mr-2" />
										)}
										{copiedImageId === image.id
											? "Copied Link"
											: "Copy Asset URL"}
									</Button>
								</div>
							</div>
							<div className="p-4 space-y-1">
								<div className="flex items-center justify-between gap-2">
									<p className="truncate text-[13px] font-medium">
										{image.fileName}
									</p>
									<p className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
										{formatSize(image.sizeBytes)}
									</p>
								</div>
								<p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">
									{image.contentType.split("/")[1] || "Image"}
								</p>
							</div>
						</motion.div>
					))
				)}
			</div>
		</div>
	);
}

export function ArtifactPanel({
	chatId,
	email,
	emailHistory,
	selectedRevisionId,
	compilationError,
	isStreaming,
	onEnsureChatPath,
	onSelectRevision,
}: ArtifactPanelProps) {
	const [activeTab, setActiveTab] = useState<ArtifactTab>("preview");
	const [activeSourceTab, setActiveSourceTab] = useState<"html" | "tsx">(
		"html",
	);
	const [copiedHtml, setCopiedHtml] = useState(false);
	const previousEmailRef = useRef(email);

	useEffect(() => {
		const hadEmail = Boolean(previousEmailRef.current);
		const hasEmail = Boolean(email);

		if (!hasEmail) {
			setActiveTab("preview");
		} else if (!hadEmail) {
			setActiveTab("preview");
		}

		previousEmailRef.current = email;
	}, [email]);

	useEffect(() => {
		if (!email) {
			setActiveSourceTab("html");
			return;
		}

		if (email.htmlCode) {
			setActiveSourceTab("html");
			return;
		}

		if (email.tsxCode) {
			setActiveSourceTab("tsx");
		}
	}, [email]);

	const handleCopyHtml = async () => {
		if (!email) return;
		await navigator.clipboard.writeText(email.htmlCode);
		setCopiedHtml(true);
		setTimeout(() => setCopiedHtml(false), 2000);
	};

	const handleDownloadHtml = () => {
		if (!email) return;
		const blob = new Blob([email.htmlCode], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${email.name.replace(/\s+/g, "-").toLowerCase()}.html`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const isEmailReady = Boolean(email);
	const hasHtmlSource = Boolean(email?.htmlCode);
	const hasTsxSource = Boolean(email?.tsxCode);
	const formattedHtmlCode = useMemo(
		() => (email?.htmlCode ? formatHtmlForDisplay(email.htmlCode) : ""),
		[email?.htmlCode],
	);
	const sourceCode =
		activeSourceTab === "html" ? formattedHtmlCode : (email?.tsxCode ?? "");
	const sourceCopyCode =
		activeSourceTab === "html"
			? (email?.htmlCode ?? "")
			: (email?.tsxCode ?? "");
	const sourceLanguage = activeSourceTab === "html" ? "markup" : "tsx";
	const sourceCopyLabel =
		activeSourceTab === "html" ? "Copy HTML" : "Copy React";
	const currentArtifactRevisions = useMemo(() => {
		if (!selectedRevisionId) {
			return [];
		}

		const selectedRevision = emailHistory.find(
			(revision) => revision.id === selectedRevisionId,
		);
		if (!selectedRevision) {
			return [];
		}

		return emailHistory
			.filter(
				(revision) =>
					revision.assistantMessageId === selectedRevision.assistantMessageId,
			)
			.sort((a, b) => a.createdAt - b.createdAt);
	}, [emailHistory, selectedRevisionId]);
	const selectedRevisionIndex = currentArtifactRevisions.findIndex(
		(revision) => revision.id === selectedRevisionId,
	);
	const selectedRevisionLabel =
		selectedRevisionIndex >= 0 ? `Version ${selectedRevisionIndex + 1}` : null;

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col bg-surface-canvas">
			{email ? (
				<div className="z-10 shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-md shadow-sm">
					<div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5">
						<div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted/40 p-1 overflow-x-auto no-scrollbar">
							{[
								{ id: "preview", label: "Visual", icon: Eye },
								{ id: "code", label: "Source", icon: Code2 },
								{ id: "assets", label: "Assets", icon: ImagePlus },
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id as ArtifactTab)}
									className={cn(
										"relative flex shrink-0 items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
										activeTab === tab.id
											? "text-foreground bg-card dark:bg-surface-elevated shadow-md ring-1 ring-border/20"
											: "text-muted-foreground hover:text-foreground hover:bg-muted/30",
									)}
								>
									<tab.icon className="size-3.5" />
									<span className="hidden sm:inline">{tab.label}</span>
									<span className="sm:hidden">{tab.label.slice(0, 3)}</span>
								</button>
							))}
						</div>

						<div className="hidden sm:block w-px h-5 bg-border/40 mx-1 shrink-0" />

						<div className="min-w-0 flex-1 hidden sm:block">
							{currentArtifactRevisions.length > 0 && onSelectRevision ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-8 rounded-xl px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
										>
											{selectedRevisionLabel ?? "Versions"}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="start"
										className="w-44 rounded-xl"
									>
										{currentArtifactRevisions.map((revision, index) => (
											<DropdownMenuItem
												key={revision.id}
												onSelect={() => onSelectRevision(revision.id)}
												className={cn(
													"rounded-lg text-xs font-medium",
													revision.id === selectedRevisionId &&
														"bg-muted text-foreground",
												)}
											>
												Version {index + 1}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							) : (
								<h3 className="truncate text-[12px] font-medium text-muted-foreground opacity-70">
									{email.name}
								</h3>
							)}
						</div>

						<div className="flex shrink-0 items-center gap-1.5 ml-auto">
							<Button
								onClick={handleCopyHtml}
								disabled={!email.htmlCode}
								variant="ghost"
								size="sm"
								className="h-8 px-2 sm:px-3 rounded-xl gap-2 text-[11px] font-medium hover:bg-muted/50"
							>
								{copiedHtml ? (
									<Check className="size-3" />
								) : (
									<Copy className="size-3" />
								)}
								<span className="hidden sm:inline">
									{copiedHtml ? "Copied" : "Copy"}
								</span>
							</Button>
							<Button
								onClick={handleDownloadHtml}
								disabled={!email.htmlCode}
								variant="ghost"
								size="icon-sm"
								className="size-8 rounded-xl hover:bg-muted/50"
							>
								<Download className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
				{compilationError && !isStreaming && (
					<div className="absolute top-4 left-6 right-6 z-20 flex items-start gap-4 rounded-3xl border border-warning-border bg-warning-muted backdrop-blur-md p-5 text-warning-foreground shadow-2xl animate-in fade-in slide-in-from-top-4">
						<AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-icon" />
						<div className="text-[12px]">
							<p className="font-semibold mb-1">Sync Conflict</p>
							<p className="opacity-80 leading-relaxed font-medium">
								{compilationError}
							</p>
						</div>
					</div>
				)}

				{isStreaming && (
					<div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background/60 backdrop-blur-md animate-in fade-in duration-500">
						{/* Chaotic/crazy scanning lines */}
						<motion.div
							className="absolute left-0 right-0 h-1 bg-primary/30 shadow-[0_0_40px_10px_hsl(var(--primary))]"
							animate={{ top: ["-10%", "110%", "-10%"] }}
							transition={{ duration: 4, ease: "linear", repeat: Infinity }}
						/>
						<motion.div
							className="absolute left-0 right-0 h-[1px] bg-primary/60"
							animate={{ top: ["-10%", "110%", "-10%"] }}
							transition={{ duration: 4, ease: "linear", repeat: Infinity }}
						/>

						{/* Core rotating elements */}
						<div className="relative flex size-40 items-center justify-center">
							{/* Outer dashed ring */}
							<motion.div
								className="absolute inset-0 rounded-full border border-dashed border-primary/50"
								animate={{ rotate: 360 }}
								transition={{ duration: 8, ease: "linear", repeat: Infinity }}
							/>
							{/* Offset spinning rings */}
							<motion.div
								className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary/80 border-r-primary/80"
								animate={{ rotate: -360 }}
								transition={{ duration: 3, ease: "linear", repeat: Infinity }}
							/>
							<motion.div
								className="absolute inset-5 rounded-full border-2 border-transparent border-b-primary border-l-primary"
								animate={{ rotate: 360 }}
								transition={{ duration: 2, ease: "linear", repeat: Infinity }}
							/>
							<motion.div
								className="absolute inset-8 rounded-full border border-primary/40"
								animate={{ scale: [1, 1.1, 1] }}
								transition={{
									duration: 2,
									ease: "easeInOut",
									repeat: Infinity,
								}}
							/>

							{/* Central glowing orb */}
							<div className="absolute inset-10 rounded-full bg-primary/20 blur-md animate-pulse" />
							<div className="relative flex size-12 items-center justify-center rounded-full bg-card border border-primary/50 shadow-[0_0_30px_hsl(var(--primary))]">
								<Loader2 className="size-6 text-primary animate-spin" />
							</div>
						</div>

						<div className="mt-10 flex flex-col items-center gap-3">
							<div className="flex items-center gap-1">
								<span className="text-sm font-bold tracking-[0.3em] text-foreground uppercase">
									Synchronizing
								</span>
								<span className="flex gap-1 ml-1">
									<motion.span
										animate={{ opacity: [0, 1, 0] }}
										transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
										className="size-1.5 bg-primary rounded-full"
									/>
									<motion.span
										animate={{ opacity: [0, 1, 0] }}
										transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
										className="size-1.5 bg-primary rounded-full"
									/>
									<motion.span
										animate={{ opacity: [0, 1, 0] }}
										transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
										className="size-1.5 bg-primary rounded-full"
									/>
								</span>
							</div>
							<p className="text-xs text-muted-foreground/80 font-medium tracking-wide">
								Compiling TSX & Render Context
							</p>
						</div>
					</div>
				)}

				<div className="h-full w-full min-w-0 overflow-hidden">
					{activeTab === "assets" ? (
						<div className="h-full overflow-auto custom-scrollbar">
							{!isEmailReady ? (
								<div className="sticky top-0 z-10 border-b border-border/50 bg-card/85 px-6 py-4 backdrop-blur-md dark:bg-card/60">
									<div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
												Asset Vault
											</p>
											<h3 className="text-lg font-semibold tracking-tight">
												Brand ingredients for the next campaign
											</h3>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-9 rounded-xl px-3 text-[11px] font-medium"
											onClick={() => setActiveTab("preview")}
										>
											<ArrowLeft className="size-3.5" />
											Back
										</Button>
									</div>
								</div>
							) : null}
							<div className="p-8 max-w-5xl mx-auto h-full">
								<EmailAssetsPanel
									chatId={chatId}
									onEnsureChatPath={onEnsureChatPath}
								/>
							</div>
						</div>
					) : !email ? (
						<div className="relative flex h-full flex-col overflow-hidden px-5 py-8 sm:px-8">
							<div className="absolute inset-0 bg-muted/30 dark:bg-background" />
							<div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
								<p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
									Preview
								</p>
								<div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
									<div className="mb-5 flex justify-center">
										<div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40">
											<Eye className="size-5 text-muted-foreground" />
										</div>
									</div>
									<h3 className="text-center text-xl font-semibold tracking-tight text-foreground">
										{emailHistory.length > 0
											? "Preview is closed"
											: "Nothing to preview yet"}
									</h3>
									<p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
										{emailHistory.length > 0
											? "Select an artifact card above to reopen any saved revision, or switch to Assets to manage uploaded files."
											: "Chat on the left to generate an email, or open the asset vault to add brand files first."}
									</p>
									<Button
										type="button"
										variant="secondary"
										onClick={() => setActiveTab("assets")}
										className="mt-6 h-10 w-full rounded-xl text-sm font-medium"
									>
										<FolderOpen className="size-4" />
										Open asset vault
									</Button>
								</div>
								<p className="mt-5 text-center text-xs text-muted-foreground">
									Example: &quot;Product launch email with hero image and strong
									CTA.&quot;
								</p>
							</div>
						</div>
					) : activeTab === "preview" ? (
						<div className="flex h-full w-full flex-col overflow-hidden bg-card">
							{email.htmlCode ? (
								<EmailPreview htmlCode={email.htmlCode} />
							) : (
								<div className="flex h-full items-center justify-center p-16 text-center text-[12px] font-medium text-muted-foreground animate-pulse">
									Initializing Preview...
								</div>
							)}
						</div>
					) : (
						<div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-code">
							{hasHtmlSource || hasTsxSource ? (
								<>
									{hasHtmlSource && hasTsxSource ? (
										<div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-slate-950/40 px-4 py-3">
											{[
												{ id: "html", label: "HTML Output" },
												{ id: "tsx", label: "React Source" },
											].map((tab) => (
												<button
													key={tab.id}
													type="button"
													onClick={() =>
														setActiveSourceTab(tab.id as "html" | "tsx")
													}
													className={cn(
														"rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
														activeSourceTab === tab.id
															? "border-white/18 bg-white text-slate-950 shadow-sm"
															: "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
													)}
												>
													{tab.label}
												</button>
											))}
										</div>
									) : null}
									<div className="min-h-0 flex-1">
										<CodeViewer
											code={sourceCode}
											copyCode={sourceCopyCode}
											language={sourceLanguage}
											copyLabel={sourceCopyLabel}
										/>
									</div>
								</>
							) : (
								<div className="flex h-full items-center justify-center p-16 text-center text-[12px] font-medium text-slate-300/70">
									Source code is not available for this email yet.
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
