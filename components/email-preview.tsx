"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailPreviewProps {
  htmlCode: string;
}

const DESKTOP_PREVIEW_MAX_WIDTH = "720px";

const getPreviewHtml = (htmlCode: string, isMobile: boolean) => {
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
      ${
        isMobile
          ? ""
          : `
      body {
        background: transparent !important;
      }
      body > div:not([style*="display:none"]):not([style*="max-height:0"]):not([style*="opacity:0"]),
      body > table:not([style*="display:none"]):not([style*="max-height:0"]),
      body > center:not([style*="display:none"]):not([style*="max-height:0"]) {
        width: min(100%, ${DESKTOP_PREVIEW_MAX_WIDTH}) !important;
        max-width: ${DESKTOP_PREVIEW_MAX_WIDTH} !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      body > center > table,
      body > div:not([style*="display:none"]):not([style*="max-height:0"]):not([style*="opacity:0"]) > table:first-child {
        width: 100% !important;
        max-width: 100% !important;
      }
      body > div:not([style*="display:none"]):not([style*="max-height:0"]):not([style*="opacity:0"]) {
        background: transparent !important;
      }
      `
      }
    </style>
  `;

  if (htmlCode.includes("</head>")) {
    return htmlCode.replace("</head>", `${previewReset}</head>`);
  }

  return `${previewReset}${htmlCode}`;
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
      <div className="flex flex-1 justify-center overflow-auto bg-muted/35 p-4">
        <iframe
          srcDoc={getPreviewHtml(htmlCode, isMobile)}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="h-full min-h-0 border-0 bg-white shadow-sm"
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
