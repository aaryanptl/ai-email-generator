import { mutation, query } from "./_generated/server";
import { findCurrentUserId, getOrCreateCurrentUserId } from "./auth_helpers";

const DAILY_PROMPT_LIMIT = 20;

const getUtcDayKey = (timestamp: number) => {
  return new Date(timestamp).toISOString().slice(0, 10);
};

export const consumeDailyPrompt = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerUserId = await getOrCreateCurrentUserId(ctx);
    const now = Date.now();
    const dayKey = getUtcDayKey(now);

    const usageRow = await ctx.db
      .query("dailyPromptUsage")
      .withIndex("by_owner_dayKey", (q) =>
        q.eq("ownerUserId", ownerUserId).eq("dayKey", dayKey),
      )
      .unique();

    if (usageRow) {
      if (usageRow.count >= DAILY_PROMPT_LIMIT) {
        return {
          allowed: false,
          limit: DAILY_PROMPT_LIMIT,
          used: usageRow.count,
          remaining: 0,
          dayKey,
        };
      }

      const nextCount = usageRow.count + 1;
      await ctx.db.patch(usageRow._id, {
        count: nextCount,
        updatedAt: now,
      });

      return {
        allowed: true,
        limit: DAILY_PROMPT_LIMIT,
        used: nextCount,
        remaining: Math.max(DAILY_PROMPT_LIMIT - nextCount, 0),
        dayKey,
      };
    }

    await ctx.db.insert("dailyPromptUsage", {
      ownerUserId,
      dayKey,
      count: 1,
      createdAt: now,
      updatedAt: now,
    });

    return {
      allowed: true,
      limit: DAILY_PROMPT_LIMIT,
      used: 1,
      remaining: DAILY_PROMPT_LIMIT - 1,
      dayKey,
    };
  },
});

export const getDailyPromptStatus = query({
  args: {},
  handler: async (ctx) => {
    const ownerUserId = await findCurrentUserId(ctx);
    const now = Date.now();
    const dayKey = getUtcDayKey(now);

    if (!ownerUserId) {
      return {
        limit: DAILY_PROMPT_LIMIT,
        used: 0,
        remaining: DAILY_PROMPT_LIMIT,
        reached: false,
        dayKey,
      };
    }

    const usageRow = await ctx.db
      .query("dailyPromptUsage")
      .withIndex("by_owner_dayKey", (q) =>
        q.eq("ownerUserId", ownerUserId).eq("dayKey", dayKey),
      )
      .unique();

    const used = usageRow?.count ?? 0;
    const remaining = Math.max(DAILY_PROMPT_LIMIT - used, 0);

    return {
      limit: DAILY_PROMPT_LIMIT,
      used,
      remaining,
      reached: remaining === 0,
      dayKey,
    };
  },
});
