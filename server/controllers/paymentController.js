const crypto = require("crypto");
const User = require("../models/User");
const getRazorpayClient = require("../utils/razorpay");
const { getUserPlanDetails } = require("../utils/subscription");
const { logActivity } = require("../utils/activityLogger");

const PLAN_CONFIG = {
  pro: {
    amount: 19900,
    label: "Pro Plan"
  },
  premium: {
    amount: 39900,
    label: "Premium Plan"
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const config = PLAN_CONFIG[plan];

    if (!config) {
      return res.status(400).json({
        error: "Invalid subscription plan"
      });
    }

    const razorpay = getRazorpayClient();
    const shortUserId = String(req.user._id).slice(-8);
    const shortTimestamp = Date.now().toString().slice(-10);
    const order = await razorpay.orders.create({
      amount: config.amount,
      currency: "INR",
      receipt: `riq_${plan}_${shortUserId}_${shortTimestamp}`,
      notes: {
        userId: String(req.user._id),
        plan
      }
    });

    return res.json({
      order,
      plan,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay create-order failed:", error);
    return res.status(500).json({
      error: error.message || "Order creation failed"
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      plan
    } = req.body;

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({
        error: "Invalid subscription plan"
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: "Payment verification payload is incomplete"
      });
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

    const expectedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        error: "Invalid payment signature"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const nextExpiry = new Date();
    nextExpiry.setDate(nextExpiry.getDate() + 30);

    user.plan = plan;
    user.subscriptionExpiry = nextExpiry;
    user.resumeUsageCount = 0;

    await user.save();

    await logActivity({
      type: "subscription_upgraded",
      userId: user._id,
      description: `${user.name || user.email || "A user"} upgraded to ${String(plan).toUpperCase()}`
    });

    return res.json({
      message: "Subscription activated successfully",
      subscription: getUserPlanDetails(user)
    });
  } catch (error) {
    console.error("Razorpay verify-payment failed:", error);
    return res.status(500).json({
      error: error.message || "Payment verification failed"
    });
  }
};
