const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EmailVerification = require("../models/EmailVerification");
const { getUserPlanDetails, refreshUserSubscriptionStatus } = require("../utils/subscription");
const { logActivity } = require("../utils/activityLogger");
const sendEmail = require("../utils/sendEmail");

const createToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const isValidEmailFormat = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());

function getEmailSendErrorMessage(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");

  if (code === "EMAIL_MODULE_MISSING" || (code === "MODULE_NOT_FOUND" && message.includes("nodemailer"))) {
    return "Email service dependency is missing. Run `cd server && npm i nodemailer` or set EMAIL_MODE=console/disabled in server/.env.";
  }

  if (message.includes("SMTP is not configured")) {
    return "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in server/.env.";
  }

  if (message.startsWith("Missing SMTP_")) {
    return "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in server/.env.";
  }

  if (code === "EAUTH" || message.includes("535-5.7.8") || message.includes("BadCredentials")) {
    return "Email service login failed. If you're using Gmail, set SMTP_PASS to an App Password (not your Gmail password), or use another SMTP provider.";
  }

  return "Unable to send email right now. Please try again later.";
}

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const verification = await EmailVerification.findOne({ email: normalizedEmail });
    if (!verification?.verifiedAt) {
      return res.status(400).json({ message: "Please verify your email before creating account" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      provider: "local"
    });

    await user.save();
    await EmailVerification.deleteOne({ email: normalizedEmail });

    await logActivity({
      type: "user_registered",
      userId: user._id,
      description: `${user.name || "A user"} registered`
    });

    const token = createToken(user._id);

    return res.status(201).json({
      message: "User registered successfully",
      token
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = createToken(user._id);

    return res.json({
      message: "Login successful",
      token
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id provider");
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered. Please login instead." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const now = Date.now();
    const otpExpiresAt = new Date(now + 5 * 60 * 1000);
    const recordExpiresAt = new Date(now + 30 * 60 * 1000);

    await EmailVerification.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otpHash,
        otpExpiresAt,
        verifiedAt: null,
        recordExpiresAt
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendEmail(
        normalizedEmail,
        "ResumeIQ Email Verification",
        `Your ResumeIQ verification OTP is: ${otp}\nValid for 5 minutes.\n\nIf you did not request this, you can ignore this email.`
      );
    } catch (emailError) {
      return res.status(500).json({ message: getEmailSendErrorMessage(emailError) });
    }

    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to send OTP" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No email id found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    user.resetOTP = otpHash;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOTPVerified = false;
    await user.save();

    try {
      await sendEmail(
        user.email,
        "ResumeIQ Password Reset",
        `Your OTP is: ${otp}\nValid for 10 minutes.\n\nIf you did not request this, you can ignore this email.`
      );
    } catch (emailError) {
      console.error("Forgot-password OTP email failed:", emailError);
      user.resetOTP = null;
      user.otpExpiry = null;
      user.resetOTPVerified = false;
      await user.save();
      return res.status(500).json({ message: getEmailSendErrorMessage(emailError) });
    }

    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to send OTP" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !String(otp || "").trim()) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (!user.resetOTP || !user.otpExpiry) {
        return res.status(400).json({ message: "OTP not requested" });
      }

      if (Date.now() > new Date(user.otpExpiry).getTime()) {
        return res.status(400).json({ message: "OTP expired" });
      }

      const isValid = await bcrypt.compare(String(otp).trim(), String(user.resetOTP));
      if (!isValid) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      user.resetOTPVerified = true;
      await user.save();

      return res.json({ message: "OTP verified" });
    }

    const verification = await EmailVerification.findOne({ email: normalizedEmail });
    if (!verification) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (!verification.otpHash || !verification.otpExpiresAt) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (Date.now() > new Date(verification.otpExpiresAt).getTime()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), String(verification.otpHash));
    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await EmailVerification.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          verifiedAt: new Date(),
          otpHash: null,
          otpExpiresAt: null,
          recordExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
        }
      }
    );

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to verify OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !String(newPassword || "").trim()) {
      return res.status(400).json({ message: "Email and newPassword are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No email id found" });
    }

    if (!user.resetOTPVerified || !user.otpExpiry || Date.now() > new Date(user.otpExpiry).getTime()) {
      return res.status(400).json({ message: "OTP verification required" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    user.password = hashedPassword;
    user.provider = "local";
    user.resetOTP = null;
    user.otpExpiry = null;
    user.resetOTPVerified = false;
    await user.save();

    await logActivity({
      type: "password_reset",
      userId: user._id,
      description: `${user.name || user.email || "A user"} reset their password`
    });

    try {
      const timestamp = new Date();
      await sendEmail(
        user.email,
        "Security Alert - ResumeIQ",
        `ResumeIQ Security Notification\n\nYour password was changed successfully.\nTime: ${timestamp.toLocaleString()}\n\nIf this was not you please contact support immediately.\nIf you did not perform this action please reset your password immediately.`
      );
    } catch (emailError) {
      console.error("Password reset security email failed:", emailError);
    }

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to reset password" });
  }
};

exports.checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "No email id found",
        exists: false,
        provider: null,
        isGoogle: false
      });
    }

    const provider = user.provider || "local";
    return res.json({
      message: "Email found",
      exists: true,
      provider,
      isGoogle: provider === "google"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!tokenInfoResponse.ok) {
      return res.status(400).json({ message: "Invalid Google credential" });
    }

    const tokenInfo = await tokenInfoResponse.json();

    if (!tokenInfo.email || tokenInfo.email_verified !== "true") {
      return res.status(400).json({ message: "Google email could not be verified" });
    }

    if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: "Google client mismatch" });
    }

    const normalizedEmail = normalizeEmail(tokenInfo.email);

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        name: tokenInfo.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        provider: "google"
      });
      await user.save();

      await logActivity({
        type: "user_registered",
        userId: user._id,
        description: `${user.name || "A user"} registered`
      });
    }

    const token = createToken(user._id);

    return res.json({
      message: "Google authentication successful",
      token
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (String(req.user?._id) !== String(userId)) {
      return res.status(403).json({
        error: "You are not allowed to access this profile"
      });
    }

    const user = await User.findById(userId).select("name email role plan resumeUsageCount subscriptionExpiry paymentHistory");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await refreshUserSubscriptionStatus(user);

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...getUserPlanDetails(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
