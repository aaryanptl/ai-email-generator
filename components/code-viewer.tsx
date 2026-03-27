"use client";

import { Highlight, themes } from "prism-react-renderer";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="relative h-full overflow-auto">
      <Button onClick={handleCopy} variant="outline" size="sm" className="absolute right-3 top-3 z-10">
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {copied ? "Copied!" : "Copy Code"}
      </Button>
      <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            style={{
              ...style,
              margin: 0,
              padding: "18px 16px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: "1.6",
              height: "100%",
              overflow: "auto",
              borderRadius: "0.9rem",
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
                    color: "var(--code-gutter)",
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
