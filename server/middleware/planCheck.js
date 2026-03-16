function getUpgradeMessage(targetPlan) {
  if (targetPlan === "premium") {
    return "Upgrade to Premium to access this feature";
  }

  return "Upgrade to Pro to access this feature";
}

function checkResumeLimit(req, res, next) {
  const plan = req.user?.plan || "free";

  if (plan !== "free") {
    return next();
  }

  if (Number(req.user?.resumeUsageCount || 0) >= 3) {
    return res.status(403).json({
      code: "PLAN_UPGRADE_REQUIRED",
      message: "Upgrade to Pro to analyze more resumes",
      requiredPlan: "pro"
    });
  }

  return next();
}

function checkProAccess(req, res, next) {
  const plan = req.user?.plan || "free";

  if (plan === "pro" || plan === "premium") {
    return next();
  }

  return res.status(403).json({
    code: "PLAN_UPGRADE_REQUIRED",
    message: getUpgradeMessage("pro"),
    requiredPlan: "pro"
  });
}

function checkPremiumAccess(req, res, next) {
  const plan = req.user?.plan || "free";

  if (plan === "premium") {
    return next();
  }

  return res.status(403).json({
    code: "PLAN_UPGRADE_REQUIRED",
    message: getUpgradeMessage("premium"),
    requiredPlan: "premium"
  });
}

module.exports = {
  checkResumeLimit,
  checkProAccess,
  checkPremiumAccess
};
