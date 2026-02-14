import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { openrouter } from "@/lib/openrouter";
import { EMAIL_SYSTEM_PROMPT } from "@/lib/email-system-prompt";
import { compileEmail } from "@/lib/compile-email";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openrouter("google/gemini-2.0-flash-001"),
    system: EMAIL_SYSTEM_PROMPT,
    messages,
    tools: {
      generate_email: tool({
        description:
          "Generate a React Email template. Use this tool whenever the user asks you to create, modify, or update an email template. The tsxCode parameter must contain the complete email component code.",
        inputSchema: z.object({
          name: z.string().describe("Name of the email template (e.g. 'Welcome Email')"),
          description: z
            .string()
            .describe("Brief description of what the email is for"),
          tsxCode: z
            .string()
            .describe(
              "The complete TSX/JS code for the email template using React.createElement and @react-email/components. Must use require() and module.exports.default."
            ),
        }),
        execute: async ({ name, description, tsxCode }) => {
          try {
            const htmlCode = await compileEmail(tsxCode);
            return {
              success: true,
              name,
              description,
              tsxCode,
              htmlCode,
            };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown compilation error";
            return {
              success: false,
              error: message,
              name,
              description,
              tsxCode,
              htmlCode: "",
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
