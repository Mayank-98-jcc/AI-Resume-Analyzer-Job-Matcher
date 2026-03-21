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
    enum: ["user", "admin"],
    default: "user"
  },

  plan: {
    type: String,
    enum: ["free", "pro", "premium"],
    default: "free"
  },

  resumeUsageCount: {
    type: Number,
    default: 0
  },

  subscriptionExpiry: {
    type: Date,
    default: null
  },

  paymentHistory: [
    {
      plan: {
        type: String,
        enum: ["free", "pro", "premium"]
      },
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: "INR"
      },
      date: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        default: "paid"
      },
      invoiceId: {
        type: String
      },
      orderId: {
        type: String
      },
      paymentId: {
        type: String
      }
    }
  ],

  resetOTP: {
    type: String,
    default: null
  },

  otpExpiry: {
    type: Date,
    default: null
  },

  resetOTPVerified: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
