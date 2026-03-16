function isSubscriptionExpired(subscriptionExpiry) {
  if (!subscriptionExpiry) return false;
  return new Date(subscriptionExpiry).getTime() <= Date.now();
}

async function refreshUserSubscriptionStatus(user) {
  if (!user) return null;

  if (user.plan !== "free" && isSubscriptionExpired(user.subscriptionExpiry)) {
    user.plan = "free";
    user.subscriptionExpiry = null;
    user.resumeUsageCount = 0;
    await user.save();
  }

  return user;
}

function getUserPlanDetails(user) {
  const plan = user?.plan || "free";
  const resumeUsageCount = Number(user?.resumeUsageCount || 0);
  const hasProAccess = plan === "pro" || plan === "premium";
  const hasPremiumAccess = plan === "premium";

  return {
    plan,
    resumeUsageCount,
    subscriptionExpiry: user?.subscriptionExpiry || null,
    hasProAccess,
    hasPremiumAccess,
    limits: {
      resumeAnalyses: plan === "free" ? 3 : null
    }
  };
}

module.exports = {
  refreshUserSubscriptionStatus,
  getUserPlanDetails
};
