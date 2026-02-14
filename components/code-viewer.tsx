"use client";

import { Highlight, themes } from "prism-react-renderer";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeViewerProps {
  code: string;
  language?: string;
}

export function CodeViewer({ code, language = "tsx" }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "relative", height: "100%", overflow: "auto" }}>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #374151",
          backgroundColor: "#1f2937",
          color: "#e5e7eb",
          cursor: "pointer",
          fontSize: "12px",
          zIndex: 10,
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied!" : "Copy Code"}
      </button>
      <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            style={{
              ...style,
              margin: 0,
              padding: "16px",
              fontSize: "13px",
              lineHeight: "1.6",
              height: "100%",
              overflow: "auto",
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span
                  style={{
                    display: "inline-block",
                    width: "3em",
                    textAlign: "right",
                    paddingRight: "1em",
                    color: "#636d83",
                    userSelect: "none",
                  }}
                >
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
