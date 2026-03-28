import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext = {
	auth: {
		getUserIdentity: () => Promise<{ tokenIdentifier: string } | null>;
	};
};

export const requireIdentity = async (ctx: AuthContext): Promise<string> => {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Unauthorized");
	}
	return identity.tokenIdentifier;
};

export const findCurrentUserId = async (
	ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> => {
	const tokenIdentifier = await requireIdentity(ctx);
	const existing = await ctx.db
		.query("users")
		.withIndex("by_tokenIdentifier", (q) =>
			q.eq("tokenIdentifier", tokenIdentifier),
		)
		.unique();

	return existing?._id ?? null;
};

export const getOrCreateCurrentUserId = async (
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
