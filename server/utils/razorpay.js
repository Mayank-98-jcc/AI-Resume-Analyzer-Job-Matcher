const Razorpay = require("razorpay");

function getRazorpayClient() {
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

  if (!process.env.RAZORPAY_KEY_ID || !razorpaySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: razorpaySecret
  });
}

module.exports = getRazorpayClient;
