const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  getAllResumes,
  getAdminResumeFile,
  getAdminStats,
  filterResumesByRole,
  getAdminAnalytics,
  getAdminActivity,
  getShortlistedCandidates,
  addShortlistedCandidate,
  removeShortlistedCandidate
} = require("../controllers/adminController");

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getAllUsers);
router.get("/resumes", requireAuth, requireAdmin, getAllResumes);
router.get("/resumes/:id/file", requireAuth, requireAdmin, getAdminResumeFile);
router.get("/stats", requireAuth, requireAdmin, getAdminStats);
router.get("/filter", requireAuth, requireAdmin, filterResumesByRole);
router.get("/analytics", requireAuth, requireAdmin, getAdminAnalytics);
router.get("/activity", requireAuth, requireAdmin, getAdminActivity);
router.get("/shortlist", requireAuth, requireAdmin, getShortlistedCandidates);
router.post("/shortlist", requireAuth, requireAdmin, addShortlistedCandidate);
router.delete("/shortlist/:resumeId", requireAuth, requireAdmin, removeShortlistedCandidate);

module.exports = router;
