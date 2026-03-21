const crypto = require("crypto");
const User = require("../models/User");
const getRazorpayClient = require("../utils/razorpay");
const { getUserPlanDetails, refreshUserSubscriptionStatus } = require("../utils/subscription");
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

function buildInvoiceId() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getNextExpiryDate() {
  const nextExpiry = new Date();
  nextExpiry.setDate(nextExpiry.getDate() + 30);
  return nextExpiry;
}

function formatPaymentHistory(entries = []) {
  return [...(entries || [])]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .map((entry) => ({
      invoiceId: entry.invoiceId || buildInvoiceId(),
      plan: entry.plan || "free",
      amount: Number(entry.amount || 0),
      currency: entry.currency || "INR",
      date: entry.date || null,
      status: entry.status || "paid",
      orderId: entry.orderId || "",
      paymentId: entry.paymentId || ""
    }));
}

function buildBillingPayload(user) {
  const subscription = getUserPlanDetails(user);
  const paymentHistory = formatPaymentHistory(user?.paymentHistory || []);

  return {
    subscription,
    currentPlan: subscription.plan,
    planBadge: String(subscription.plan || "free").toUpperCase(),
    subscriptionExpiry: subscription.subscriptionExpiry,
    nextBillingDate: subscription.subscriptionExpiry,
    paymentHistory,
    invoices: paymentHistory
  };
}

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

    user.plan = plan;
    user.subscriptionExpiry = getNextExpiryDate();
    user.resumeUsageCount = 0;
    user.paymentHistory = user.paymentHistory || [];
    user.paymentHistory.unshift({
      plan,
      amount: PLAN_CONFIG[plan].amount / 100,
      currency: "INR",
      date: new Date(),
      status: "paid",
      invoiceId: buildInvoiceId(),
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId
    });

    await user.save();

    await logActivity({
      type: "subscription_upgraded",
      userId: user._id,
      description: `${user.name || user.email || "A user"} upgraded to ${String(plan).toUpperCase()}`
    });

    return res.json({
      message: "Subscription activated successfully",
      ...buildBillingPayload(user)
    });
  } catch (error) {
    console.error("Razorpay verify-payment failed:", error);
    return res.status(500).json({
      error: error.message || "Payment verification failed"
    });
  }
};

exports.getUserBilling = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email plan resumeUsageCount subscriptionExpiry paymentHistory"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    await refreshUserSubscriptionStatus(user);

    return res.json({
      name: user.name,
      email: user.email,
      ...buildBillingPayload(user)
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load billing details"
    });
  }
};

exports.upgradePlan = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["free", "pro", "premium"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    if (plan === "free") {
      user.plan = "free";
      user.subscriptionExpiry = null;
      user.resumeUsageCount = 0;
      user.paymentHistory = user.paymentHistory || [];
      user.paymentHistory.unshift({
        plan: "free",
        amount: 0,
        currency: "INR",
        date: new Date(),
        status: "downgraded",
        invoiceId: buildInvoiceId(),
        orderId: "",
        paymentId: ""
      });

      await user.save();

      await logActivity({
        type: "subscription_downgraded",
        userId: user._id,
        description: `${user.name || user.email || "A user"} downgraded to FREE`
      });

      return res.json({
        message: "Plan updated successfully",
        ...buildBillingPayload(user)
      });
    }

    return res.status(400).json({
      error: "Use create-order and verify-payment for paid plan upgrades"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to update plan"
    });
  }
};
