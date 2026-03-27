"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailPreviewProps {
  htmlCode: string;
}

const expandDesktopPreviewHtml = (htmlCode: string) =>
  htmlCode
    .replace(
      /<(table|div|td)([^>]*?)style="([^"]*)"([^>]*)>/gi,
      (_match, tag: string, before: string, style: string, after: string) => {
        let nextStyle = style;

        if (/max-width\s*:/i.test(nextStyle)) {
          nextStyle = nextStyle.replace(/max-width\s*:\s*[^;"]+;?/gi, "max-width:100%;");
        }

        if (/width\s*:\s*\d+px/i.test(nextStyle)) {
          nextStyle = nextStyle.replace(/width\s*:\s*\d+px;?/gi, "width:100%;");
        }

        if (/margin\s*:\s*0\s+auto/i.test(nextStyle)) {
          nextStyle = nextStyle.replace(/margin\s*:\s*0\s+auto;?/gi, "margin:0;");
        }

        return `<${tag}${before}style="${nextStyle}"${after}>`;
      },
    )
    .replace(/<(table|td|div)([^>]*?)\swidth="(\d+%?|\d+px|\d+)"([^>]*)>/gi, "<$1$2 width=\"100%\"$4>");

const getPreviewHtml = (htmlCode: string, isMobile: boolean) => {
  const previewMarkup = isMobile ? htmlCode : expandDesktopPreviewHtml(htmlCode);
  const desktopExpansion = isMobile
    ? ""
    : `
      body > div,
      body > table,
      body > center,
      body > center > table,
      body > center > div,
      table[align="center"],
      [style*="max-width"] {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      body > div,
      body > table,
      body > center,
      body > center > table,
      body > center > div {
        min-height: 100vh !important;
      }
      body > div:first-child,
      body > table:first-child,
      body > center:first-child,
      body > center > div:first-child,
      body > center > table:first-child,
      body > div:first-child > table:first-child,
      body > table:first-child > tbody > tr:first-child > td:first-child,
      body > center > table:first-child > tbody > tr:first-child > td:first-child {
        min-height: 100vh !important;
        height: 100vh !important;
      }
    `;

  const previewReset = `
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        overflow: auto;
      }
      body {
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      ${desktopExpansion}
    </style>
  `;

  if (previewMarkup.includes("</head>")) {
    return previewMarkup.replace("</head>", `${previewReset}</head>`);
  }

  return `${previewReset}${previewMarkup}`;
};

export function EmailPreview({ htmlCode }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const isMobile = viewMode === "mobile";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border/60 px-4 py-2.5">
        <Button
          onClick={() => setViewMode("desktop")}
          variant={viewMode === "desktop" ? "secondary" : "ghost"}
          size="sm"
        >
          <Monitor data-icon="inline-start" />
          Desktop
        </Button>
        <Button
          onClick={() => setViewMode("mobile")}
          variant={viewMode === "mobile" ? "secondary" : "ghost"}
          size="sm"
        >
          <Smartphone data-icon="inline-start" />
          Mobile
        </Button>
      </div>
      <div
        className={`flex flex-1 overflow-auto bg-muted/35 ${
          isMobile ? "justify-center" : "justify-stretch"
        }`}
      >
        <iframe
          srcDoc={getPreviewHtml(htmlCode, isMobile)}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="h-full min-h-0 border-0 bg-white"
          style={{
            width: isMobile ? "375px" : "100%",
            maxWidth: isMobile ? "375px" : "100%",
            minHeight: "100%",
          }}
        />
      </div>
    </div>
  );
}
