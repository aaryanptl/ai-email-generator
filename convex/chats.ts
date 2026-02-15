import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUserId, getOrCreateCurrentUserId } from "./auth_helpers";

export const ensure = mutation({
  args: {
    chatId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existing) {
      if (existing.ownerUserId !== ownerUserId) {
        throw new Error("Unauthorized");
      }

      const nextTitle =
        args.title && existing.title === "New chat" ? args.title : existing.title;
      await ctx.db.patch(existing._id, {
        title: nextTitle,
        updatedAt: now,
      });
      return existing;
    }

    const id = await ctx.db.insert("chats", {
      chatId: args.chatId,
      ownerUserId,
      title: args.title ?? "New chat",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });

    return await ctx.db.get(id);
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
      .query("chats")
      .withIndex("by_owner_updatedAt", (q) => q.eq("ownerUserId", ownerUserId))
      .order("desc")
      .collect();
  },
});

export const getByChatId = query({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      return null;
    }

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (!chat || chat.ownerUserId !== ownerUserId) {
      return null;
    }

    return chat;
  },
});

export const remove = mutation({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      throw new Error("Unauthorized");
    }

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();
    if (!chat || chat.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    const emails = await ctx.db
      .query("emails")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const email of emails) {
      await ctx.db.delete(email._id);
    }

    const uploadedImages = await ctx.db
      .query("uploadedImages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const uploadedImage of uploadedImages) {
      if (uploadedImage.ownerUserId !== ownerUserId) {
        continue;
      }
      await ctx.storage.delete(uploadedImage.storageId);
      await ctx.db.delete(uploadedImage._id);
    }

    await ctx.db.delete(chat._id);
  },
});
