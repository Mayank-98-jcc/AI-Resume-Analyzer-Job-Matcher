const Support = require("../models/Support");
const SupportMessage = require("../models/SupportMessage");
const sendEmail = require("../utils/sendEmail");
const { logActivity } = require("../utils/activityLogger");

const SESSION_INACTIVITY_MS = 12 * 60 * 60 * 1000;

function generateReply(message, userName) {
  const text = String(message || "").toLowerCase();
  const displayName = userName || "there";

  if (text.includes("hi") || text.includes("hello")) {
    return `Hello ${displayName}! 👋 How can we help you today?`;
  }

  if (text.includes("thanks") || text.includes("thank you")) {
    return "You're welcome 😊 If anything else comes up, we're here to help.";
  }

  if (text.includes("payment") || text.includes("plan") || text.includes("upgrade")) {
    return "For billing-related queries, our support team will assist you within 24 hours. 💳";
  }

  if (text.includes("slow")) {
    return "We’re working on improving performance ⚡ Thanks for flagging it.";
  }

  if (text.includes("error")) {
    return "Please try again, or our team will help you shortly 🛠️";
  }

  if (text.includes("problem") || text.includes("issue") || text.includes("bug")) {
    return "Thanks for reporting this 🙏 Our team will look into it and get back to you within 24 hours.";
  }

  if (text.includes("feature") || text.includes("add") || text.includes("improve")) {
    return "Great suggestion 🚀 We’ve shared this with our team for review.";
  }

  return "Thanks for your feedback! 🙌 Our team will review it and respond within 24 hours.";
}

async function findOrCreateSession({ user, category, message }) {
  const inactivityCutoff = new Date(Date.now() - SESSION_INACTIVITY_MS);

  let session = await Support.findOne({
    userId: user._id,
    category,
    status: "open",
    lastMessageAt: { $gte: inactivityCutoff }
  }).sort({ lastMessageAt: -1 });

  let isNewSession = false;

  if (!session) {
    isNewSession = true;
    session = await Support.create({
      userId: user._id,
      email: user.email,
      category,
      status: "open",
      lastMessage: message,
      lastMessageSender: "user",
      lastMessageAt: new Date(),
      isRead: false
    });
  }

  return { session, isNewSession };
}

async function notifySupportInbox({ user, category, message, session }) {
  try {
    await sendEmail(
      process.env.SMTP_USER,
      "ResumeIQ support session opened",
      `User: ${user.email}\nCategory: ${category}\nSession: ${session._id}\nMessage: ${message}`,
      `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <h2 style="margin:0 0 16px;">ResumeIQ support session opened</h2>
          <p><strong>User:</strong> ${user.email}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Session ID:</strong> ${session._id}</p>
          <p><strong>First message:</strong></p>
          <blockquote style="background:#f4f4f5;padding:12px 14px;border-radius:8px;margin:0;">${message}</blockquote>
        </div>
      `
    );

    session.notifiedAt = new Date();
    await session.save();
  } catch (err) {
    console.error("Support session email error:", err.message || err);
  }
}

exports.createSupportMessage = async (req, res) => {
  try {
    const category = String(req.body?.category || "").trim();
    const message = String(req.body?.message || "").trim();
    const reply = generateReply(message, req.user.name);

    if (!["Bug", "Feature Request", "General Feedback"].includes(category)) {
      return res.status(400).json({
        message: "Please choose a valid feedback category."
      });
    }

    if (!message) {
      return res.status(400).json({
        message: "Please enter your message before sending."
      });
    }

    const { session, isNewSession } = await findOrCreateSession({
      user: req.user,
      category,
      message
    });

    const [userMessage, systemMessage] = await SupportMessage.create([
      {
        sessionId: session._id,
        userId: req.user._id,
        category,
        sender: "user",
        message
      },
      {
        sessionId: session._id,
        userId: req.user._id,
        category,
        sender: "system",
        message: reply
      }
    ]);

    session.lastMessage = reply;
    session.lastMessageSender = "system";
    session.lastMessageAt = systemMessage.createdAt || new Date();
    session.isRead = false;
    await session.save();

    await logActivity({
      type: "support_feedback_submitted",
      userId: req.user._id,
      description: `${req.user.name || "A user"} submitted ${category.toLowerCase()} feedback`
    });

    if (isNewSession) {
      await notifySupportInbox({
        user: req.user,
        category,
        message,
        session
      });
    }

    return res.status(201).json({
      success: true,
      sessionId: session._id,
      message: {
        _id: userMessage._id,
        sessionId: session._id,
        category: userMessage.category,
        message: userMessage.message,
        sender: userMessage.sender,
        createdAt: userMessage.createdAt
      },
      reply
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to send feedback right now.",
      error: error.message
    });
  }
};

exports.getUserFeedbackHistory = async (req, res) => {
  try {
    const sessions = await Support.find({ userId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .select("_id category status createdAt updatedAt lastMessageAt");

    const sessionIds = sessions.map((session) => session._id);
    const messages = await SupportMessage.find({
      userId: req.user._id,
      sessionId: { $in: sessionIds }
    })
      .sort({ createdAt: 1 })
      .select("_id sessionId sender category message createdAt");

    const sessionMap = new Map(
      sessions.map((session) => [
        String(session._id),
        {
          _id: session._id,
          category: session.category,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          lastMessageAt: session.lastMessageAt,
          messages: []
        }
      ])
    );

    messages.forEach((item) => {
      const key = String(item.sessionId);
      const session = sessionMap.get(key);
      if (!session) return;

      session.messages.push({
        _id: item._id,
        sessionId: item.sessionId,
        role: item.sender === "admin" ? "system" : item.sender,
        category: item.category,
        message: item.message,
        createdAt: item.createdAt
      });
    });

    return res.json({
      success: true,
      data: Array.from(sessionMap.values())
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load feedback history right now.",
      error: error.message
    });
  }
};
