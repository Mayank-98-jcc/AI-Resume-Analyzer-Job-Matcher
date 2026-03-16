const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");
const { matchCandidatesWithJob } = require("../controllers/matchingController");

const router = express.Router();

router.post("/match-candidates", requireAuth, requireAdmin, matchCandidatesWithJob);

module.exports = router;

