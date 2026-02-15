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
});
