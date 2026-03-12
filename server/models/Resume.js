const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  fileName: {
    type: String
  },
  extractedText: {
    type: String
  },
  skills: [String],
  atsScore: {
    type: Number
  },
  missingSkills: [String],
  strengthMeter: {
    formatting: Number,
    content: Number,
    skills: Number,
    atsCompatibility: Number
  },
  suggestions: [String],
  suggestionProgress: {
    comparedResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume"
    },
    reviewedAt: Date,
    totalSuggestions: {
      type: Number,
      default: 0
    },
    addressedCount: {
      type: Number,
      default: 0
    },
    pendingCount: {
      type: Number,
      default: 0
    },
    items: [
      {
        suggestion: String,
        status: {
          type: String,
          enum: ["addressed", "pending"]
        }
      }
    ]
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Resume", resumeSchema);
