import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { google } from "@/lib/google";
import { EMAIL_SYSTEM_PROMPT } from "@/lib/email-system-prompt";
import { compileEmail } from "@/lib/compile-email";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export const maxDuration = 60;

const clamp = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
};

export async function POST(req: Request) {
  const { id, messages, templateIds } = await req.json();

  if (typeof id !== "string" || !Array.isArray(messages)) {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const dailyUsage = await fetchAuthMutation(api.usage.consumeDailyPrompt, {});
  if (!dailyUsage.allowed) {
    return Response.json(
      {
        error: `Daily limit reached (${dailyUsage.limit} prompts/day).`,
      },
      { status: 429 },
    );
  }

  const safeTemplateIds = Array.isArray(templateIds)
    ? templateIds
        .filter((value): value is string => typeof value === "string")
        .slice(0, 3)
    : [];

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

  const referenceTemplates =
    safeTemplateIds.length > 0
      ? await fetchAuthQuery(api.emails.getTemplateStyleReferences, {
          ids: safeTemplateIds as never,
        })
      : [];

  const templateContext = referenceTemplates
    .map((template, index) => {
      const style = template.styleProfile;
      return [
        `Template ${index + 1}: ${template.name}`,
        `Description: ${template.description}`,
        `Colors: ${style.colors.join(", ") || "not detected"}`,
        `Fonts: ${style.fontFamilies.join(", ") || "not detected"}`,
        `Max width: ${style.maxWidth ?? "not detected"}`,
        `Radius values: ${style.radiusValues.join(", ") || "not detected"}`,
        `Spacing values: ${style.spacingValues.join(", ") || "not detected"}`,
        `Button backgrounds: ${style.buttonBackgrounds.join(", ") || "not detected"}`,
        `Button text colors: ${style.buttonTextColors.join(", ") || "not detected"}`,
        `Header-like section: ${style.hasHeaderLikeSection ? "yes" : "no"}`,
        `Footer-like section: ${style.hasFooterLikeSection ? "yes" : "no"}`,
        `HTML style excerpt:\n${clamp(template.htmlCode, 2400)}`,
      ].join("\n");
    })
    .join("\n\n");

  const imagePromptSection = imageContext
    ? `\n\nUploaded images for this chat:\n${imageContext}\n\nIf the user asks for logos, illustrations, product images, avatars, hero images, icons, or card art, prefer these uploaded image URLs over placeholders.`
    : "";

  const templatePromptSection = templateContext
    ? `\n\nReference templates selected by the user:\n${templateContext}\n\nUse these references to keep a consistent visual theme across emails. Match color palette, typography feel, spacing rhythm, and CTA styling. Do not copy exact marketing text from references; only transfer style and layout language.`
    : "";

  const systemPrompt = `${EMAIL_SYSTEM_PROMPT}${imagePromptSection}${templatePromptSection}`;

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
    model: google("gemini-3.1-pro-preview"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(6),
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
