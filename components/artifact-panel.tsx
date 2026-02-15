"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Eye, Code2, Copy, Check, Download, AlertTriangle, ImagePlus, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailPreview } from "./email-preview";
import { CodeViewer } from "./code-viewer";
import { cn } from "@/lib/utils";

export interface EmailArtifact {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
}

interface ArtifactPanelProps {
  chatId: string;
  email: EmailArtifact | null;
  compilationError?: string | null;
  onEnsureChatPath?: (chatId: string) => void;
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

function EmailAssetsPanel({
  chatId,
  onEnsureChatPath,
  compact,
}: {
  chatId: string;
  onEnsureChatPath?: (chatId: string) => void;
  compact?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const finalizeUpload = useMutation(api.images.finalizeUpload);
  const uploadedImages = (useQuery(api.images.listByChatId, { chatId }) ?? []) as UploadedImage[];

  const handleUploadImage = useCallback(async (file: File) => {
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
        error instanceof Error ? error.message : "Could not upload image. Please retry.",
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [chatId, finalizeUpload, generateUploadUrl, onEnsureChatPath]);

  const handleCopyUrl = useCallback(async (id: string, url: string | null) => {
    if (!url) {
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopiedImageId(id);
    setTimeout(() => setCopiedImageId(null), 1600);
  }, []);

  return (
    <div className={cn("h-full", compact ? "px-4 py-3" : "p-4")}>
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

      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Email assets</p>
          <p className="text-xs text-muted-foreground">Upload logos, product images, and icons.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage}
        >
          {isUploadingImage ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <ImagePlus data-icon="inline-start" />}
          {isUploadingImage ? "Uploading" : "Upload"}
        </Button>
      </div>

      {imageUploadError ? <p className="mb-2 text-xs text-destructive">{imageUploadError}</p> : null}

      <div className={cn("space-y-2", compact && "max-h-44 overflow-auto")}>
        {uploadedImages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/25 px-3 py-3 text-xs text-muted-foreground">
            No assets yet. Upload an image, copy its link, and tell AI where to place it.
          </div>
        ) : (
          uploadedImages.map((image) => (
            <div key={image.id} className="rounded-xl border border-border/70 bg-card/70 p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid size-10 place-items-center overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                  <ImagePlus className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{image.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{formatSize(image.sizeBytes)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => void handleCopyUrl(image.id, image.url)}
                disabled={!image.url}
              >
                {copiedImageId === image.id ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
                {copiedImageId === image.id ? "Copied link" : "Copy link"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ArtifactPanel({ chatId, email, compilationError, onEnsureChatPath }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "assets">("preview");
  const [copiedHtml, setCopiedHtml] = useState(false);

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

  return (
    <div className="flex h-full min-h-0 bg-background/60">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              onClick={() => setActiveTab("preview")}
              variant={activeTab === "preview" ? "secondary" : "ghost"}
              size="sm"
            >
              <Eye data-icon="inline-start" />
              Preview
            </Button>
            <Button
              onClick={() => setActiveTab("code")}
              variant={activeTab === "code" ? "secondary" : "ghost"}
              size="sm"
            >
              <Code2 data-icon="inline-start" />
              Code
            </Button>
            <Button
              onClick={() => setActiveTab("assets")}
              variant={activeTab === "assets" ? "secondary" : "ghost"}
              size="sm"
            >
              <ImagePlus data-icon="inline-start" />
              Assets
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button onClick={handleCopyHtml} disabled={!email?.htmlCode} variant="outline" size="sm">
              {copiedHtml ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copiedHtml ? "Copied" : "Copy HTML"}
            </Button>
            <Button
              onClick={handleDownloadHtml}
              disabled={!email?.htmlCode}
              variant="outline"
              size="icon-sm"
              aria-label="Download HTML"
            >
              <Download />
            </Button>
          </div>
        </div>

        {compilationError && (
          <div className="flex items-start gap-3 border-b border-amber-700/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <strong>Compilation Error:</strong> {compilationError}
              <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                The generated code had an error. Ask the AI to fix it or regenerate the template.
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "assets" ? (
            <EmailAssetsPanel chatId={chatId} onEnsureChatPath={onEnsureChatPath} />
          ) : !email ? (
            <div className="grid h-full place-items-center px-6">
              <Card className="w-full max-w-md border-border/70 bg-card/85 text-center backdrop-blur">
                <CardHeader className="items-center gap-3">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-border/70 bg-muted/50">
                    <Eye className="size-7 text-muted-foreground" />
                  </div>
                  <CardTitle>Email preview</CardTitle>
                  <CardDescription>
                    Generated templates appear here with live rendering and source code.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          ) : activeTab === "preview" ? (
            email.htmlCode ? (
              <EmailPreview htmlCode={email.htmlCode} />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
                No preview available. Check the Code tab for the generated source.
              </div>
            )
          ) : (
            <CodeViewer code={email.tsxCode} />
          )}
        </div>
      </div>
    </div>
  );
}
