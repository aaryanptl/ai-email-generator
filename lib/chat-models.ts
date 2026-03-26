export const CHAT_MODELS = [
  {
    id: "moonshotai/kimi-k2-thinking",
    label: "Kimi K2 Thinking",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = "moonshotai/kimi-k2-thinking";

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODELS.some((model) => model.id === value);
}
