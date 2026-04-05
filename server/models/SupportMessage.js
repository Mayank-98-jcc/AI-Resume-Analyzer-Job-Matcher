const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Support",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["Bug", "Feature Request", "General Feedback"],
      required: true,
      trim: true
    },
    sender: {
      type: String,
      enum: ["user", "system", "admin"],
      required: true,
      default: "user"
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

supportMessageSchema.index({ sessionId: 1, createdAt: 1 });
supportMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SupportMessage", supportMessageSchema);
