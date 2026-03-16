const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { refreshUserSubscriptionStatus } = require("../utils/subscription");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        error: "Invalid user"
      });
    }

    await refreshUserSubscriptionStatus(user);
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

module.exports = {
  requireAuth
};
