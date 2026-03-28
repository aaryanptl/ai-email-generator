import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findCurrentUserId, getOrCreateCurrentUserId } from "./auth_helpers";

type MessageInput = {
	id?: string;
	role?: unknown;
	parts?: unknown[];
	createdAt?: unknown;
};

const coerceTimestamp = (value: unknown, fallback: number): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	return fallback;
};

const deriveTitle = (messages: MessageInput[]): string => {
	const userMessage = messages.find((message) => message.role === "user");
	if (!userMessage || !Array.isArray(userMessage.parts)) {
		return "New chat";
	}

	const text = userMessage.parts
		.map((part) => {
			if (
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				(part as { type?: unknown }).type === "text" &&
				"text" in part
			) {
				return String((part as { text?: unknown }).text ?? "");
			}
			return "";
		})
		.join(" ")
		.trim();

	if (!text) {
		return "New chat";
	}

	return text.slice(0, 80);
};

export const saveChatMessages = mutation({
	args: {
		chatId: v.string(),
		messages: v.array(v.any()),
	},
	handler: async (ctx, args) => {
		const ownerUserId = await getOrCreateCurrentUserId(ctx);
		const now = Date.now();

		const existingChat = await ctx.db
			.query("chats")
			.withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
			.unique();

		const title = deriveTitle(args.messages as MessageInput[]);

		if (!existingChat) {
			await ctx.db.insert("chats", {
				chatId: args.chatId,
				ownerUserId,
				title,
				createdAt: now,
				updatedAt: now,
				lastMessageAt: now,
			});
		} else {
			if (existingChat.ownerUserId !== ownerUserId) {
				throw new Error("Unauthorized");
			}

			await ctx.db.patch(existingChat._id, {
				title: existingChat.title === "New chat" ? title : existingChat.title,
				updatedAt: now,
				lastMessageAt: now,
			});
		}

		const oldMessages = await ctx.db
			.query("messages")
			.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
			.collect();
		const oldByMessageId = new Map(
			oldMessages.map((row) => [row.messageId, row]),
		);
		const incomingMessageIds = new Set<string>();

		const inserted: Array<{
			id: string;
			dbId: string;
			role: unknown;
			parts: unknown[];
		}> = [];
		for (const [index, input] of (args.messages as MessageInput[]).entries()) {
			const messageId =
				typeof input.id === "string" && input.id.length > 0
					? input.id
					: `${args.chatId}-${index}`;
			const parts = Array.isArray(input.parts) ? input.parts : [];
			const createdAt = coerceTimestamp(input.createdAt, now + index);
			incomingMessageIds.add(messageId);

			const existing = oldByMessageId.get(messageId);
			if (existing) {
				if (existing.ownerUserId !== ownerUserId) {
					throw new Error("Unauthorized");
				}

				await ctx.db.patch(existing._id, {
					role: input.role,
					parts,
					updatedAt: now,
				});

				inserted.push({
					id: messageId,
					dbId: String(existing._id),
					role: input.role,
					parts,
				});
				continue;
			}

			const dbId = await ctx.db.insert("messages", {
				chatId: args.chatId,
				ownerUserId,
				messageId,
				role: input.role,
				parts,
				createdAt,
				updatedAt: now,
			});

			inserted.push({
				id: messageId,
				dbId: String(dbId),
				role: input.role,
				parts,
			});
		}

		for (const oldMessage of oldMessages) {
			if (incomingMessageIds.has(oldMessage.messageId)) {
				continue;
			}
			if (oldMessage.ownerUserId !== ownerUserId) {
				throw new Error("Unauthorized");
			}

			const linkedEmails = await ctx.db
				.query("emails")
				.withIndex("by_assistant_message", (q) =>
					q.eq("assistantMessageId", oldMessage._id),
				)
				.collect();
			for (const linkedEmail of linkedEmails) {
				if (linkedEmail.ownerUserId === ownerUserId) {
					await ctx.db.delete(linkedEmail._id);
				}
			}

			await ctx.db.delete(oldMessage._id);
		}

		return { inserted };
	},
});

export const listByChatId = query({
	args: {
		chatId: v.string(),
	},
	handler: async (ctx, args) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			return [];
		}

		const rows = await ctx.db
			.query("messages")
			.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
			.collect();

		const ownedRows = rows
			.filter((row) => row.ownerUserId === ownerUserId)
			.sort((a, b) => a.createdAt - b.createdAt);

		return ownedRows.map((row) => ({
			id: row.messageId,
			role: row.role,
			parts: row.parts,
			createdAt: row.createdAt,
		}));
	},
});
