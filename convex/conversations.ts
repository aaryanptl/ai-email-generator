import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    messages: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
          timestamp: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      messages: args.messages ?? [],
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("conversations").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const addMessage = mutation({
  args: {
    id: v.id("conversations"),
    message: v.object({
      role: v.string(),
      content: v.string(),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");
    await ctx.db.patch(args.id, {
      messages: [...conversation.messages, args.message],
      updatedAt: Date.now(),
    });
  },
});

export const linkEmail = mutation({
  args: {
    id: v.id("conversations"),
    emailId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      emailId: args.emailId,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
