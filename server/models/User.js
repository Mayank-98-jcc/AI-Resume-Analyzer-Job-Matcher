const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: function requiredPassword() {
      return this.provider !== "google";
    }
  },

  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local"
  },

  role: {
    type: String,
    default: "user"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
