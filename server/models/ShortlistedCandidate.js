const mongoose = require("mongoose");

const shortlistedCandidateSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true
    }
  },
  { timestamps: true }
);

shortlistedCandidateSchema.index({ adminId: 1, resumeId: 1 }, { unique: true });

module.exports = mongoose.model("ShortlistedCandidate", shortlistedCandidateSchema);
