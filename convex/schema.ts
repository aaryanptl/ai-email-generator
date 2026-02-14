import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  emails: defineTable({
    name: v.string(),
    description: v.string(),
    tsxCode: v.string(),
    htmlCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  conversations: defineTable({
    emailId: v.optional(v.id("emails")),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});
