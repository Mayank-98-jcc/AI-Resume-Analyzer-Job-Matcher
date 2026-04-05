const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["Bug", "Feature Request", "General Feedback"],
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true
    },
    lastMessage: {
      type: String,
      trim: true,
      default: ""
    },
    lastMessageSender: {
      type: String,
      enum: ["user", "system", "admin"],
      default: "user"
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    notifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

supportSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });
supportSchema.index({ category: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Support", supportSchema);
