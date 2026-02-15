import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  chats: defineTable({
    chatId: v.string(),
    ownerUserId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_chatId", ["chatId"])
    .index("by_owner", ["ownerUserId"])
    .index("by_owner_updatedAt", ["ownerUserId", "updatedAt"]),

  messages: defineTable({
    chatId: v.string(),
    ownerUserId: v.id("users"),
    messageId: v.string(),
    role: v.any(),
    parts: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_messageId", ["chatId", "messageId"])
    .index("by_owner_chat_createdAt", ["ownerUserId", "chatId", "createdAt"]),

  emails: defineTable({
    chatId: v.string(),
    assistantMessageId: v.id("messages"),
    ownerUserId: v.id("users"),
    name: v.string(),
    description: v.string(),
    tsxCode: v.string(),
    htmlCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_chat", ["chatId"])
    .index("by_assistant_message", ["assistantMessageId"]),

  emailTemplates: defineTable({
    ownerUserId: v.id("users"),
    name: v.string(),
    description: v.string(),
    sourceKind: v.union(v.literal("html"), v.literal("tsx"), v.literal("both")),
    htmlCode: v.string(),
    tsxCode: v.optional(v.string()),
    styleProfile: v.object({
      colors: v.array(v.string()),
      fontFamilies: v.array(v.string()),
      maxWidth: v.optional(v.string()),
      radiusValues: v.array(v.string()),
      spacingValues: v.array(v.string()),
      buttonBackgrounds: v.array(v.string()),
      buttonTextColors: v.array(v.string()),
      hasHeaderLikeSection: v.boolean(),
      hasFooterLikeSection: v.boolean(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_owner_updatedAt", ["ownerUserId", "updatedAt"]),

  uploadedImages: defineTable({
    chatId: v.string(),
    ownerUserId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    uploadedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_owner_chat_uploadedAt", ["ownerUserId", "chatId", "uploadedAt"]),

  dailyPromptUsage: defineTable({
    ownerUserId: v.id("users"),
    dayKey: v.string(),
    count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_dayKey", ["ownerUserId", "dayKey"]),
});
