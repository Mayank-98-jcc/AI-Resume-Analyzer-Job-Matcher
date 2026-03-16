const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { forgotPasswordLimiter, signupOtpLimiter } = require("../middleware/rateLimiter");

const {
  registerUser,
  loginUser,
  checkEmailExists,
  sendOtp,
  forgotPassword,
  verifyOtp,
  resetPassword,
  googleAuth,
  getUserProfile
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/check-email", checkEmailExists);
router.post("/send-otp", signupOtpLimiter, sendOtp);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/google", googleAuth);
router.get("/profile/:userId", requireAuth, getUserProfile);

module.exports = router;
