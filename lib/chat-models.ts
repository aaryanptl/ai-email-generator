export const CHAT_MODELS = [
	{
		id: "moonshotai/kimi-k2-thinking",
		label: "Kimi K2 Thinking",
		supportsImageInput: false,
	},
	{
		id: "google/gemini-3.1-pro-preview",
		label: "Gemini 3.1 Pro Preview",
		supportsImageInput: true,
	},
	{
		id: "z-ai/glm-5-turbo",
		label: "GLM-5 Turbo",
		supportsImageInput: false,
	},
	{
		id: "anthropic/claude-sonnet-4.6",
		label: "Claude Sonnet 4.6",
		supportsImageInput: true,
	},
	{
		id: "openai/gpt-5.4",
		label: "GPT-5.4",
		supportsImageInput: true,
	},
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = "moonshotai/kimi-k2-thinking";
export const DEFAULT_VISION_CHAT_MODEL: ChatModelId =
	"anthropic/claude-sonnet-4.6";

export function isChatModelId(value: string): value is ChatModelId {
	return CHAT_MODELS.some((model) => model.id === value);
}

export function modelSupportsImageInput(modelId: ChatModelId): boolean {
	return (
		CHAT_MODELS.find((model) => model.id === modelId)?.supportsImageInput ??
		false
	);
}
