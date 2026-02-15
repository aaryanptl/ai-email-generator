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
    name: v.string(),
    description: v.string(),
    tsxCode: v.string(),
    htmlCode: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("emails", {
      ownerUserId,
      ...args,
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
      .query("emails")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("emails") },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      return null;
    }
    const email = await ctx.db.get(args.id);
    if (!email || email.ownerUserId !== ownerUserId) {
      return null;
    }
    return email;
  },
});

export const update = mutation({
  args: {
    id: v.id("emails"),
    tsxCode: v.optional(v.string()),
    htmlCode: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerUserId = await findCurrentUserId(ctx);
    if (!ownerUserId) {
      throw new Error("Unauthorized");
    }
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing || existing.ownerUserId !== ownerUserId) {
      throw new Error("Unauthorized");
    }
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
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
