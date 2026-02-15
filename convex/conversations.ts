import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

type AuthContext = {
  auth: {
    getUserIdentity: () => Promise<{ tokenIdentifier: string } | null>;
  };
};

const requireIdentity = async (ctx: AuthContext): Promise<string> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity.tokenIdentifier;
};

const findCurrentUserId = async (
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> => {
  const tokenIdentifier = await requireIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();

  return existing ? (existing._id as Id<"users">) : null;
};

const getOrCreateCurrentUserId = async (
  ctx: MutationCtx,
): Promise<Id<"users">> => {
  const existingUserId = await findCurrentUserId(ctx);
  if (existingUserId) {
    return existingUserId;
  }

  const tokenIdentifier = await requireIdentity(ctx);
  const now = Date.now();
  return await ctx.db.insert("users", {
    tokenIdentifier,
    createdAt: now,
    updatedAt: now,
  });
};

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
    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      ownerUserId,
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
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      return [];
    }
    return await ctx.db
      .query("conversations")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      return null;
    }
    const conversation = await ctx.db.get(args.id);
    if (!conversation || conversation.ownerUserId !== ownerUserId) {
      return null;
    }
    return conversation;
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
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      throw new Error("Unauthorized");
    }
    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }
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
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      throw new Error("Unauthorized");
    }
    const conversation = await ctx.db.get(args.id);
    const email = await ctx.db.get(args.emailId);
    if (!conversation || !email) {
      throw new Error("Conversation or email not found");
    }
    if (
      conversation.ownerUserId !== ownerUserId ||
      email.ownerUserId !== ownerUserId
    ) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.id, {
      emailId: args.emailId,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      throw new Error("Unauthorized");
    }
    const conversation = await ctx.db.get(args.id);
    if (!conversation || conversation.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});
