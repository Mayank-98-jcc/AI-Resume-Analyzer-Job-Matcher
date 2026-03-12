const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeEmail = (email = "") => email.trim().toLowerCase();

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      provider: "local"
    });

    await user.save();

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No email id found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.provider = "local";

    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No email id found" });
    }

    return res.json({ message: "Email found" });
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

    const user = await User.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
