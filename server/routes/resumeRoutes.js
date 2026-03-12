const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
  getResumeHistory,
  getResumeSuggestions,
  analyzeResumeSections,
  getResumeStrengthMeter,
  getResumeRanking,
  generateSummary,
  getCareerSuggestions
} = require("../controllers/resumeController");

const {
  matchJob,
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
  handleResumeUpload,
  uploadResume
);


// ==========================
// Resume History
// ==========================
router.get(
  "/history/:userId",
  getResumeHistory
);


// ==========================
// Job Description Match
// ==========================
router.post(
  "/match-job",
  matchJob
);


// ==========================
// Highlight Missing Skills
// ==========================
router.post(
  "/highlight",
  highlightKeywords
);

// ==========================
// Resume Suggestions
// ==========================
router.post(
  "/suggestions",
  getResumeSuggestions
);

// ==========================
// Resume Section Analyzer
// ==========================
router.post(
  "/analyze-sections",
  analyzeResumeSections
);

// ==========================
// Resume Strength Meter
// ==========================
router.post(
  "/strength-meter",
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
  generateSummary
);

// ==========================
// AI Career Suggestions
// ==========================
router.post(
  "/career-suggestions",
  getCareerSuggestions
);

module.exports = router;
