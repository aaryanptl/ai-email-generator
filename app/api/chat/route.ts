import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import {
	type ChatModelId,
	DEFAULT_CHAT_MODEL,
	DEFAULT_VISION_CHAT_MODEL,
	isChatModelId,
	modelSupportsImageInput,
} from "@/lib/chat-models";
import { compileEmail, normalizeEmailSource } from "@/lib/compile-email";
import { EMAIL_SYSTEM_PROMPT } from "@/lib/email-system-prompt";
import { openrouter } from "@/lib/openrouter";
import { listSkills, readSkill } from "@/lib/skills";

export const maxDuration = 60;

const clamp = (text: string, maxLength: number) => {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength)}...`;
};

const generateEmailInputSchema = z
	.object({
		name: z
			.union([z.string(), z.null()])
			.optional()
			.describe("Name of the email template."),
		description: z
			.union([z.string(), z.null()])
			.optional()
			.describe("Short plain-English summary of the email."),
		tsxCode: z
			.union([z.string(), z.null()])
			.optional()
			.describe("Complete React Email source code for the email template."),
	})
	.passthrough();

const normalizeOptionalText = (value: string | null | undefined) => {
	if (typeof value !== "string") {
		return "";
	}

	const trimmed = value.trim();
	if (!trimmed || /^(null|undefined|n\/a)$/i.test(trimmed)) {
		return "";
	}

	return trimmed;
};

const fallbackTemplateName = (latestUserText: string) => {
	const normalizedRequest = latestUserText.replace(/\s+/g, " ").trim();
	if (!normalizedRequest) {
		return "Generated Email Template";
	}

	return clamp(normalizedRequest, 60);
};

const fallbackTemplateDescription = (
	latestUserText: string,
	templateName: string,
) => {
	const normalizedRequest = latestUserText.replace(/\s+/g, " ").trim();
	if (!normalizedRequest) {
		return `Generated email template for ${templateName}.`;
	}

	return clamp(`Generated email template for: ${normalizedRequest}`, 160);
};

const extractLatestUserText = (messages: unknown[]): string => {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		if (typeof message !== "object" || message === null) {
			continue;
		}

		const row = message as {
			role?: unknown;
			content?: unknown;
			parts?: unknown;
		};

		if (row.role !== "user") {
			continue;
		}

		if (typeof row.content === "string" && row.content.trim()) {
			return row.content.trim();
		}

		if (Array.isArray(row.parts)) {
			const chunks: string[] = [];
			for (const part of row.parts) {
				if (typeof part !== "object" || part === null) {
					continue;
				}
				const candidate = part as { text?: unknown; type?: unknown };
				if (typeof candidate.text === "string" && candidate.text.trim()) {
					chunks.push(candidate.text.trim());
				}
			}

			if (chunks.length > 0) {
				return chunks.join("\n");
			}
		}
	}

	return "";
};

const messageHasImageInput = (message: unknown): boolean => {
	if (typeof message !== "object" || message === null) {
		return false;
	}

	const row = message as {
		parts?: unknown;
		experimental_attachments?: unknown;
		files?: unknown;
	};

	const hasImageLikeValue = (value: unknown): boolean => {
		if (typeof value !== "object" || value === null) {
			return false;
		}

		const candidate = value as {
			type?: unknown;
			mediaType?: unknown;
			mimeType?: unknown;
			contentType?: unknown;
			url?: unknown;
			data?: unknown;
		};

		const mimeCandidates = [
			candidate.mediaType,
			candidate.mimeType,
			candidate.contentType,
			candidate.type,
		];

		if (
			mimeCandidates.some(
				(mime) => typeof mime === "string" && mime.startsWith("image/"),
			)
		) {
			return true;
		}

		return (
			(typeof candidate.url === "string" &&
				candidate.url.startsWith("data:image/")) ||
			(typeof candidate.data === "string" &&
				candidate.data.startsWith("data:image/"))
		);
	};

	return [row.parts, row.experimental_attachments, row.files].some(
		(collection) =>
			Array.isArray(collection) &&
			collection.some((item) => hasImageLikeValue(item)),
	);
};

const messagesHaveImageInput = (messages: unknown[]): boolean =>
	messages.some((message) => messageHasImageInput(message));

const resolveModelForRequest = (
	selectedModel: ChatModelId,
	hasImageInput: boolean,
): ChatModelId => {
	if (!hasImageInput || modelSupportsImageInput(selectedModel)) {
		return selectedModel;
	}

	return DEFAULT_VISION_CHAT_MODEL;
};

const isEmailGenerationRequest = (text: string): boolean => {
	const normalized = text.toLowerCase();

	return /email|newsletter|campaign|template|welcome|reset password|password reset|receipt|invoice|confirmation|launch|promo|follow-up|follow up|transactional/i.test(
		normalized,
	);
};

type StepToolResult = {
	toolName?: unknown;
	output?: unknown;
};

type StepRecord = {
	toolResults?: unknown;
};

const getToolResults = (steps: unknown[]): StepToolResult[] => {
	const results: StepToolResult[] = [];

	for (const step of steps) {
		if (typeof step !== "object" || step === null) {
			continue;
		}

		const record = step as StepRecord;
		if (!Array.isArray(record.toolResults)) {
			continue;
		}

		for (const toolResult of record.toolResults) {
			if (typeof toolResult === "object" && toolResult !== null) {
				results.push(toolResult as StepToolResult);
			}
		}
	}

	return results;
};

const getLatestToolSuccessState = (
	steps: unknown[],
	toolName: string,
): boolean | null => {
	const latestResult = [...getToolResults(steps)]
		.reverse()
		.find((result) => result.toolName === toolName);

	if (!latestResult) {
		return null;
	}

	const output = latestResult.output;
	if (
		typeof output === "object" &&
		output !== null &&
		"success" in output &&
		typeof (output as { success?: unknown }).success === "boolean"
	) {
		return (output as { success: boolean }).success;
	}

	return null;
};

const buildPlanBrief = (latestUserText: string) => ({
	success: true,
	goal:
		clamp(
			latestUserText.replace(/\s+/g, " ").trim() ||
				"Generate a clear, high-converting email.",
			140,
		) || "Generate a clear, high-converting email.",
	audience: "Recipient described in the user's request.",
	tone: "Match the user's requested tone and level of formality.",
	visualDirection:
		"Choose a distinctive visual direction that fits the request and brand intent.",
	primaryCta: "Use the main action implied by the request.",
	sections: ["Preview", "Hero", "Body", "Primary CTA", "Footer"],
});

type StoredMessage = {
	id?: string;
	role?: unknown;
	parts: unknown[];
	createdAt?: unknown;
};

const safeJsonClone = <T>(value: T, fallback: T): T => {
	try {
		return JSON.parse(JSON.stringify(value)) as T;
	} catch {
		return fallback;
	}
};

const normalizeMessagesForStorage = (
	chatId: string,
	messages: unknown[],
): StoredMessage[] =>
	messages.flatMap((message, index) => {
		if (typeof message !== "object" || message === null) {
			return [];
		}

		const row = message as {
			id?: unknown;
			role?: unknown;
			parts?: unknown;
			createdAt?: unknown;
		};

		return [
			{
				id:
					typeof row.id === "string" && row.id.length > 0
						? row.id
						: `${chatId}-${index}`,
				role: row.role,
				parts: safeJsonClone(Array.isArray(row.parts) ? row.parts : [], []),
				createdAt:
					typeof row.createdAt === "number" ||
					typeof row.createdAt === "string" ||
					row.createdAt instanceof Date
						? row.createdAt
						: undefined,
			},
		];
	});

export async function POST(req: Request) {
	const { id, messages, model } = await req.json();

	if (typeof id !== "string" || !Array.isArray(messages)) {
		return Response.json({ error: "Invalid request payload" }, { status: 400 });
	}

	const authToken = await getToken();
	const convexAuthOptions = {
		token: authToken ?? undefined,
	};

	const selectedModel =
		typeof model === "string" && isChatModelId(model)
			? model
			: DEFAULT_CHAT_MODEL;
	const hasImageInput = messagesHaveImageInput(messages);
	const resolvedModel = resolveModelForRequest(selectedModel, hasImageInput);

	const dailyUsage = await fetchMutation(
		api.usage.consumeDailyPrompt,
		{},
		convexAuthOptions,
	);
	if (!dailyUsage.allowed) {
		return Response.json(
			{
				error: `Daily limit reached (${dailyUsage.limit} prompts/day).`,
			},
			{ status: 429 },
		);
	}

	const uploadedImages = await fetchQuery(
		api.images.listByChatId,
		{
			chatId: id,
		},
		convexAuthOptions,
	);

	const imageContext = uploadedImages
		.filter((image: { url: string | null }) => typeof image.url === "string")
		.map(
			(image: { fileName: string; url: string | null }) =>
				`- ${image.fileName}: ${image.url as string}`,
		)
		.join("\n");

	const imagePromptSection = imageContext
		? `\n\nUploaded images for this chat:\n${imageContext}\n\nIf the user asks for logos, illustrations, product images, avatars, hero images, icons, or card art, prefer these uploaded image URLs over placeholders.`
		: "";

	const latestUserText = extractLatestUserText(messages);
	const skillCatalog = await listSkills();
	const hasFrontendDesignSkill = skillCatalog.some(
		(skill) => skill.slug === "frontend-design",
	);

	const skillsPromptSection =
		skillCatalog.length > 0
			? `\n\nLocal skills available:\n${skillCatalog
					.map((skill) => `- ${skill.slug}: ${skill.description}`)
					.join(
						"\n",
					)}\n\nBefore any generate_email tool call, first call read_frontend_design whenever that skill is available. Treat that skill load as required preparation for email generation, not as an optional step. Use the loaded skill guidance to shape the final design decisions.`
			: "";

	const designRequestPromptSection =
		hasFrontendDesignSkill && isEmailGenerationRequest(latestUserText)
			? "\n\nThe latest user request is asking for an email. You must first call plan_email with no arguments, then call read_frontend_design, and only then call generate_email."
			: "";
	const requiresToolExecution = isEmailGenerationRequest(latestUserText);
	const toolCompletionPromptSection = requiresToolExecution
		? '\n\nRequired workflow for email requests:\n1. Call plan_email with no arguments to create a short brief.\n2. Call read_frontend_design when available to decide the visual direction.\n3. Call generate_email with the complete template code.\n4. If generate_email returns success: false, revise the code and call generate_email again.\n5. Only after generate_email returns success: true, send a short final response.\n\nCode generation requirements:\n- Import React Email primitives from require("@react-email/components").\n- Do not define local stub components for Preview, Html, Head, Body, Container, Section, Row, Column, Text, Heading, Link, Button, Img, Hr, or Font.\n- Preview must be the real @react-email/components Preview component so preview text stays hidden and does not render visibly at the top of the email.\n\nFinal response format:\n- One short sentence confirming what was generated.\n- One short sentence summarizing the chosen design direction.\n- One short question or next-step suggestion.\n\nDo not output a long explanation or checklist for successful email generations.'
		: "";

	const systemPrompt = `${EMAIL_SYSTEM_PROMPT}${imagePromptSection}${skillsPromptSection}${designRequestPromptSection}${toolCompletionPromptSection}`;

	const tools = {
		plan_email: tool({
			description:
				"Create a concise implementation brief for the requested email before any design or code generation work begins. Call this tool with no arguments.",
			inputSchema: z.object({}).passthrough(),
			execute: async () => buildPlanBrief(latestUserText),
		}),
		read_frontend_design: tool({
			description:
				"Load the frontend-design skill from the local repository. Use this before generating any email so the visual output follows the design skill.",
			inputSchema: z.object({}),
			execute: async () => {
				try {
					const loadedSkill = await readSkill("frontend-design");

					return {
						success: true,
						skill: loadedSkill.slug,
						name: loadedSkill.name,
						description: loadedSkill.description,
						content: loadedSkill.content,
					};
				} catch (error) {
					return {
						success: false,
						skill: "frontend-design",
						error:
							error instanceof Error
								? error.message
								: "Failed to read skill file.",
					};
				}
			},
		}),
		generate_email: tool({
			description:
				"Generate a React Email template. Use this tool whenever the user asks you to create, modify, or update an email template. Call read_frontend_design before using this tool for email requests. Pass name, description, and tsxCode. The system will normalize equivalent React Email source formats before compiling.",
			inputSchema: generateEmailInputSchema,
			execute: async ({ name, description, tsxCode }) => {
				const normalizedName =
					normalizeOptionalText(name) || fallbackTemplateName(latestUserText);
				const normalizedDescription =
					normalizeOptionalText(description) ||
					fallbackTemplateDescription(latestUserText, normalizedName);
				const normalizedTsxCode = normalizeEmailSource(
					normalizeOptionalText(tsxCode),
				);

				if (normalizedTsxCode.length < 40) {
					return {
						success: false,
						error:
							"No usable email source code was provided. Retry generate_email with the full React Email source file in tsxCode.",
						name: normalizedName,
						description: normalizedDescription,
						tsxCode: normalizedTsxCode,
						htmlCode: "",
					};
				}

				try {
					const htmlCode = await compileEmail(normalizedTsxCode);
					return {
						success: true,
						name: normalizedName,
						description: normalizedDescription,
						tsxCode: normalizedTsxCode,
						htmlCode,
					};
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Unknown compilation error";
					return {
						success: false,
						error: `${message}\n\nRetry generate_email with name, description, and the full React Email source file in tsxCode. Equivalent export styles are allowed, but the code must compile cleanly.`,
						name: normalizedName,
						description: normalizedDescription,
						tsxCode: normalizedTsxCode,
						htmlCode: "",
					};
				}
			},
		}),
	};

	const result = streamText({
		model: openrouter(resolvedModel),
		system: systemPrompt,
		messages: await convertToModelMessages(messages, { tools }),
		tools,
		toolChoice: requiresToolExecution ? "required" : "auto",
		prepareStep: async ({ steps }) => {
			if (!requiresToolExecution) {
				return undefined;
			}

			const planned = getLatestToolSuccessState(steps, "plan_email") === true;
			const designLoaded =
				!hasFrontendDesignSkill ||
				getLatestToolSuccessState(steps, "read_frontend_design") === true;
			const emailStatus = getLatestToolSuccessState(steps, "generate_email");

			if (!planned) {
				return {
					activeTools: ["plan_email"],
					toolChoice: { type: "tool", toolName: "plan_email" },
					system: `${systemPrompt}\n\nCurrent step: create the brief first. Call plan_email with no arguments. Do not call any other tool yet.`,
				};
			}

			if (!designLoaded) {
				return {
					activeTools: ["read_frontend_design"],
					toolChoice: { type: "tool", toolName: "read_frontend_design" },
					system: `${systemPrompt}\n\nCurrent step: load the frontend-design skill and use it to decide the email's visual direction.`,
				};
			}

			if (emailStatus !== true) {
				return {
					activeTools: ["generate_email"],
					toolChoice: { type: "tool", toolName: "generate_email" },
					system: `${systemPrompt}\n\nCurrent step: generate the full email template now.\n\nYour next response must be a generate_email tool call with this JSON shape:\n{\n  "name": "Descriptive template name",\n  "description": "Short plain-English summary of the email's purpose",\n  "tsxCode": "Full React Email source code as a string"\n}\n\nDo not omit tsxCode. Avoid placeholder punctuation or partial code. If the compile fails, fix the code and call generate_email again.`,
				};
			}

			return {
				activeTools: [],
				system: `${systemPrompt}\n\nCurrent step: write the short final response only. Do not call more tools.`,
			};
		},

		stopWhen: stepCountIs(10),
	});

	return result.toUIMessageStreamResponse({
		originalMessages: messages,
		sendReasoning: true,
		onFinish: async ({ messages: responseMessages }) => {
			try {
				const storedMessages = normalizeMessagesForStorage(
					id,
					responseMessages,
				);
				const saved = await fetchMutation(
					api.messages.saveChatMessages,
					{
						chatId: id,
						messages: storedMessages,
					},
					convexAuthOptions,
				);

				const insertedByMessageId = new Map(
					saved.inserted.map((item: { id: string; dbId: string }) => [
						item.id,
						item.dbId,
					]),
				);

				for (const row of saved.inserted) {
					if (row.role !== "assistant") {
						continue;
					}

					for (const part of row.parts) {
						if (
							typeof part !== "object" ||
							part === null ||
							!("output" in part)
						) {
							continue;
						}

						const output = (part as { output?: unknown }).output;
						if (typeof output !== "object" || output === null) {
							continue;
						}

						const email = output as {
							success?: unknown;
							name?: unknown;
							description?: unknown;
							tsxCode?: unknown;
							htmlCode?: unknown;
						};

						if (
							email.success !== true ||
							typeof email.name !== "string" ||
							typeof email.description !== "string" ||
							typeof email.tsxCode !== "string" ||
							typeof email.htmlCode !== "string"
						) {
							continue;
						}

						const assistantMessageId = insertedByMessageId.get(row.id);
						if (!assistantMessageId) {
							continue;
						}

						await fetchMutation(
							api.emails.createLinked,
							{
								chatId: id,
								assistantMessageId: assistantMessageId as never,
								name: email.name,
								description: email.description,
								tsxCode: email.tsxCode,
								htmlCode: email.htmlCode,
							},
							convexAuthOptions,
						);
					}
				}
			} catch (error) {
				// Persisting chat history should not tear down a successful streamed reply.
				console.error("Failed to persist streamed chat response.", error);
			}
		},
	});
}
