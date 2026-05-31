import mongoose from "mongoose";

const SupportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel",
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "Admin"],
    },
    senderName: String,
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "product"],
      default: "text",
    },
    attachments: [
      {
        url: String,
        type: String,
      },
    ],
    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

const SupportConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    lastMessage: String,
    lastMessageSender: {
      type: String,
      enum: ["User", "Admin"],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCountCustomer: {
      type: Number,
      default: 0,
    },
    unreadCountAdmin: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

SupportMessageSchema.index({ conversationId: 1, createdAt: -1 });
SupportConversationSchema.index({ status: 1, lastMessageAt: -1 });

export const SupportMessage = mongoose.model(
  "SupportMessage",
  SupportMessageSchema
);
export const SupportConversation = mongoose.model(
  "SupportConversation",
  SupportConversationSchema
);
