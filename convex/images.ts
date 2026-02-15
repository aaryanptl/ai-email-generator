import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUserId, getOrCreateCurrentUserId } from "./auth_helpers";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const assertImagePayload = (contentType: string, sizeBytes: number) => {
  if (!contentType.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB");
  }
};

export const generateUploadUrl = mutation({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (existingChat && existingChat.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: {
    chatId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    assertImagePayload(args.contentType, args.sizeBytes);

    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const now = Date.now();

    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (!existingChat) {
      await ctx.db.insert("chats", {
        chatId: args.chatId,
        ownerUserId,
        title: "New chat",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      });
    } else if (existingChat.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Uploaded image not found");
    }

    const id = await ctx.db.insert("uploadedImages", {
      chatId: args.chatId,
      ownerUserId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      fileName: args.fileName,
      url,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
    };
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

    const images = await ctx.db
      .query("uploadedImages")
      .withIndex("by_owner_chat_uploadedAt", (q) =>
        q.eq("ownerUserId", ownerUserId).eq("chatId", args.chatId),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      images.map(async (image) => ({
        id: image._id,
        fileName: image.fileName,
        contentType: image.contentType,
        sizeBytes: image.sizeBytes,
        uploadedAt: image.uploadedAt,
        url: await ctx.storage.getUrl(image.storageId),
      })),
    );
  },
});
