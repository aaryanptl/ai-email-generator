import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findCurrentUserId, getOrCreateCurrentUserId } from "./auth_helpers";

const styleProfileValidator = v.object({
	colors: v.array(v.string()),
	fontFamilies: v.array(v.string()),
	maxWidth: v.optional(v.string()),
	radiusValues: v.array(v.string()),
	spacingValues: v.array(v.string()),
	buttonBackgrounds: v.array(v.string()),
	buttonTextColors: v.array(v.string()),
	hasHeaderLikeSection: v.boolean(),
	hasFooterLikeSection: v.boolean(),
});

type StyleProfile = {
	colors: string[];
	fontFamilies: string[];
	maxWidth?: string;
	radiusValues: string[];
	spacingValues: string[];
	buttonBackgrounds: string[];
	buttonTextColors: string[];
	hasHeaderLikeSection: boolean;
	hasFooterLikeSection: boolean;
};

const uniqueNormalized = (values: string[]) => {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const normalized = value.trim().toLowerCase();
		if (!normalized || seen.has(normalized)) {
			continue;
		}
		seen.add(normalized);
		result.push(normalized);
	}
	return result;
};

const extractStyleProfile = (htmlCode: string): StyleProfile => {
	const colorMatches =
		htmlCode.match(
			/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g,
		) ?? [];
	const fontMatches = htmlCode.match(/font-family\s*:\s*([^;"']+)/gi) ?? [];
	const maxWidthMatch = htmlCode.match(/max-width\s*:\s*([^;"']+)/i);
	const radiusMatches = htmlCode.match(/border-radius\s*:\s*([^;"']+)/gi) ?? [];
	const spacingMatches =
		htmlCode.match(/(?:padding|margin)\s*:\s*([^;"']+)/gi) ?? [];
	const buttonStyleBlocks =
		htmlCode.match(/<(?:a|button)[^>]*style="[^"]*"/gi) ?? [];

	const buttonBackgrounds = uniqueNormalized(
		buttonStyleBlocks
			.map(
				(block) =>
					block.match(/background(?:-color)?\s*:\s*([^;"']+)/i)?.[1] ?? "",
			)
			.filter(Boolean),
	).slice(0, 8);

	const buttonTextColors = uniqueNormalized(
		buttonStyleBlocks
			.map((block) => block.match(/color\s*:\s*([^;"']+)/i)?.[1] ?? "")
			.filter(Boolean),
	).slice(0, 8);

	const fontFamilies = uniqueNormalized(
		fontMatches
			.map((match) => match.split(":")[1] ?? "")
			.map((value) => value.replace(/["']/g, "").trim())
			.filter(Boolean),
	).slice(0, 8);

	const colors = uniqueNormalized(colorMatches).slice(0, 12);
	const radiusValues = uniqueNormalized(
		radiusMatches
			.map((match) => match.split(":")[1] ?? "")
			.map((value) => value.trim())
			.filter(Boolean),
	).slice(0, 8);

	const spacingValues = uniqueNormalized(
		spacingMatches
			.map((match) => match.split(":")[1] ?? "")
			.map((value) => value.trim())
			.filter(Boolean),
	).slice(0, 10);

	const lowered = htmlCode.toLowerCase();
	const hasHeaderLikeSection = /header|logo|hero/.test(lowered);
	const hasFooterLikeSection = /footer|unsubscribe|copyright/.test(lowered);

	return {
		colors,
		fontFamilies,
		maxWidth: maxWidthMatch?.[1]?.trim(),
		radiusValues,
		spacingValues,
		buttonBackgrounds,
		buttonTextColors,
		hasHeaderLikeSection,
		hasFooterLikeSection,
	};
};

export const createLinked = mutation({
	args: {
		chatId: v.string(),
		assistantMessageId: v.id("messages"),
		name: v.string(),
		description: v.string(),
		tsxCode: v.string(),
		htmlCode: v.string(),
	},
	handler: async (ctx, args) => {
		const ownerUserId = await getOrCreateCurrentUserId(ctx);
		const now = Date.now();

		return await ctx.db.insert("emails", {
			ownerUserId,
			chatId: args.chatId,
			assistantMessageId: args.assistantMessageId,
			name: args.name,
			description: args.description,
			tsxCode: args.tsxCode,
			htmlCode: args.htmlCode,
			createdAt: now,
			updatedAt: now,
		});
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

		const emails = await ctx.db
			.query("emails")
			.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
			.collect();

		return emails
			.filter((email) => email.ownerUserId === ownerUserId)
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map((email) => ({
				id: email._id,
				assistantMessageId: email.assistantMessageId,
				name: email.name,
				description: email.description,
				tsxCode: email.tsxCode,
				htmlCode: email.htmlCode,
				createdAt: email.createdAt,
				updatedAt: email.updatedAt,
			}));
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			return [];
		}

		return await ctx.db
			.query("emails")
			.withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
			.order("desc")
			.collect();
	},
});

export const getLatestForChat = query({
	args: {
		chatId: v.string(),
	},
	handler: async (ctx, args) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			return null;
		}

		const emails = await ctx.db
			.query("emails")
			.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
			.collect();

		const owned = emails.filter((email) => email.ownerUserId === ownerUserId);
		owned.sort((a, b) => b.updatedAt - a.updatedAt);
		return owned[0] ?? null;
	},
});

export const remove = mutation({
	args: { id: v.id("emails") },
	handler: async (ctx, args) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db.get(args.id);
		if (!existing || existing.ownerUserId !== ownerUserId) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.id);
	},
});

export const saveTemplate = mutation({
	args: {
		name: v.string(),
		description: v.string(),
		htmlCode: v.string(),
		tsxCode: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const ownerUserId = await getOrCreateCurrentUserId(ctx);
		const now = Date.now();
		const sourceKind = args.tsxCode ? "both" : "html";
		const styleProfile = extractStyleProfile(args.htmlCode);

		return await ctx.db.insert("emailTemplates", {
			ownerUserId,
			name: args.name,
			description: args.description,
			sourceKind,
			htmlCode: args.htmlCode,
			tsxCode: args.tsxCode,
			styleProfile,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const listTemplates = query({
	args: {},
	handler: async (ctx) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			return [];
		}

		return await ctx.db
			.query("emailTemplates")
			.withIndex("by_owner_updatedAt", (q) => q.eq("ownerUserId", ownerUserId))
			.order("desc")
			.collect();
	},
});

export const removeTemplate = mutation({
	args: { id: v.id("emailTemplates") },
	handler: async (ctx, args) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db.get(args.id);
		if (!existing || existing.ownerUserId !== ownerUserId) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.id);
	},
});

export const getTemplateStyleReferences = query({
	args: {
		ids: v.array(v.id("emailTemplates")),
	},
	returns: v.array(
		v.object({
			id: v.id("emailTemplates"),
			name: v.string(),
			description: v.string(),
			htmlCode: v.string(),
			styleProfile: styleProfileValidator,
		}),
	),
	handler: async (ctx, args) => {
		const ownerUserId = await findCurrentUserId(ctx);
		if (!ownerUserId || args.ids.length === 0) {
			return [];
		}

		const templates = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
		const ownedTemplates = templates.filter(
			(template): template is NonNullable<typeof template> =>
				template !== null && template.ownerUserId === ownerUserId,
		);

		return ownedTemplates.map((template) => ({
			id: template._id,
			name: template.name,
			description: template.description,
			htmlCode: template.htmlCode,
			styleProfile: template.styleProfile,
		}));
	},
});
