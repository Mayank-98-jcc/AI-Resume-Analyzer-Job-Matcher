const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const { requireAuth } = require("../middleware/authMiddleware");
const { checkPremiumAccess, checkProAccess, checkResumeLimit } = require("../middleware/planCheck");

const {
  uploadResume,
  getResumeHistory,
  getResumeSuggestions,
  analyzeResumeSections,
  getResumeStrengthMeter,
  getResumeRanking,
  generateSummary,
  getCareerSuggestions,
  rewriteResume
} = require("../controllers/resumeController");

const {
  highlightKeywords
} = require("../utils/jobMatcher");

const handleResumeUpload = (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        error: error.message || "Invalid file upload"
      });
    }

    return next();
  });
};

// ==========================
// Upload Resume
// ==========================
router.post(
  "/upload",
  requireAuth,
  checkResumeLimit,
  handleResumeUpload,
  uploadResume
);


// ==========================
// Resume History
// ==========================
router.get(
  "/history/:userId",
  requireAuth,
  getResumeHistory
);


// ==========================
// Highlight Missing Skills
// ==========================
router.post(
  "/highlight",
  requireAuth,
  checkPremiumAccess,
  highlightKeywords
);

// ==========================
// Resume Suggestions
// ==========================
router.post(
  "/suggestions",
  requireAuth,
  getResumeSuggestions
);

// ==========================
// Resume Section Analyzer
// ==========================
router.post(
  "/analyze-sections",
  requireAuth,
  analyzeResumeSections
);

// ==========================
// Resume Strength Meter
// ==========================
router.post(
  "/strength-meter",
  requireAuth,
  getResumeStrengthMeter
);

// ==========================
// Resume Ranking
// ==========================
router.post(
  "/ranking",
  getResumeRanking
);

// ==========================
// AI Resume Summary
// ==========================
router.post(
  "/generate-summary",
  requireAuth,
  checkProAccess,
  generateSummary
);

// ==========================
// AI Career Suggestions
// ==========================
router.post(
  "/career-suggestions",
  requireAuth,
  checkProAccess,
  getCareerSuggestions
);

// ==========================
// AI Resume Rewrite
// ==========================
router.post(
  "/rewrite",
  requireAuth,
  checkPremiumAccess,
  rewriteResume
);

module.exports = router;
