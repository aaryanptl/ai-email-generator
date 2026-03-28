"use client";

import { Check, Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeViewerProps {
	code: string;
	language?: string;
	copyLabel?: string;
	copyCode?: string;
}

function createOccurrenceKey(base: string, counts: Map<string, number>) {
	const nextCount = (counts.get(base) ?? 0) + 1;
	counts.set(base, nextCount);
	return `${base}-${nextCount}`;
}

export function CodeViewer({
	code,
	language = "tsx",
	copyLabel = "Copy Code",
	copyCode,
}: CodeViewerProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(copyCode ?? code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="relative h-full overflow-auto">
			<Button
				onClick={handleCopy}
				variant="ghost"
				size="sm"
				className="absolute right-4 top-4 z-10 h-9 rounded-full border border-white/16 bg-slate-800/88 px-3.5 text-[11px] font-semibold text-slate-100 shadow-lg shadow-black/25 backdrop-blur-md transition hover:bg-slate-700/92 hover:text-white"
			>
				{copied ? (
					<Check
						data-icon="inline-start"
						className="size-3.5 text-emerald-300"
					/>
				) : (
					<Copy data-icon="inline-start" className="size-3.5 text-slate-200" />
				)}
				{copied ? "Copied!" : copyLabel}
			</Button>
			<Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
				{({ style, tokens, getLineProps, getTokenProps }) => {
					const lineKeyCounts = new Map<string, number>();

					return (
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
							{tokens.map((line, i) => {
								const tokenKeyCounts = new Map<string, number>();
								const lineSignature = line
									.map((token) => `${token.types.join(".")}:${token.content}`)
									.join("|");

								return (
									<div
										key={createOccurrenceKey(lineSignature, lineKeyCounts)}
										{...getLineProps({ line })}
									>
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
										{line.map((token) => (
											<span
												key={createOccurrenceKey(
													`${token.types.join(".")}:${token.content}`,
													tokenKeyCounts,
												)}
												{...getTokenProps({ token })}
											/>
										))}
									</div>
								);
							})}
						</pre>
					);
				}}
			</Highlight>
		</div>
	);
}
