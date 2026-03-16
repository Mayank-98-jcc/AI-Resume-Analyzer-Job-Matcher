const Activity = require("../models/Activity");

async function logActivity({ type, userId, description }) {
  try {
    if (!type || !description) return;

    const activity = new Activity({
      type,
      user: userId || undefined,
      description
    });

    await activity.save();
  } catch (error) {
    // Avoid breaking primary flows on analytics logging failures.
    console.error("Activity log failed:", error.message);
  }
}

module.exports = {
  logActivity
};

