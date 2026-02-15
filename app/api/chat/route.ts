import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { openrouter } from "@/lib/openrouter";
import { EMAIL_SYSTEM_PROMPT } from "@/lib/email-system-prompt";
import { compileEmail } from "@/lib/compile-email";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { id, messages } = await req.json();

  if (typeof id !== "string" || !Array.isArray(messages)) {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const uploadedImages = await fetchAuthQuery(api.images.listByChatId, {
    chatId: id,
  });

  const imageContext = uploadedImages
    .filter((image: { url: string | null }) => typeof image.url === "string")
    .map(
      (image: { fileName: string; url: string | null }) =>
        `- ${image.fileName}: ${image.url as string}`,
    )
    .join("\n");

  const systemPrompt = imageContext
    ? `${EMAIL_SYSTEM_PROMPT}\n\nUploaded images for this chat:\n${imageContext}\n\nIf the user asks for logos, illustrations, product images, avatars, hero images, icons, or card art, prefer these uploaded image URLs over placeholders.`
    : EMAIL_SYSTEM_PROMPT;

  const tools = {
    generate_email: tool({
      description:
        "Generate a React Email template. Use this tool whenever the user asks you to create, modify, or update an email template. The tsxCode parameter must contain the complete email component code.",
      inputSchema: z.object({
        name: z
          .string()
          .describe("Name of the email template (e.g. 'Welcome Email')"),
        description: z
          .string()
          .describe("Brief description of what the email is for"),
        tsxCode: z
          .string()
          .describe(
            "The complete TSX/JS code for the email template using React.createElement and @react-email/components. Must use require() and module.exports.default.",
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
            error instanceof Error
              ? error.message
              : "Unknown compilation error";
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
  };

  const result = streamText({
    model: openrouter("moonshotai/kimi-k2.5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onFinish: async ({ messages: responseMessages }) => {
      const saved = await fetchAuthMutation(api.messages.saveChatMessages, {
        chatId: id,
        messages: responseMessages,
      });

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

          await fetchAuthMutation(api.emails.createLinked, {
            chatId: id,
            assistantMessageId: assistantMessageId as never,
            name: email.name,
            description: email.description,
            tsxCode: email.tsxCode,
            htmlCode: email.htmlCode,
          });
        }
      }
    },
  });
}
