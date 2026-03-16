const express = require("express");
const router = express.Router();
const { matchJob } = require("../controllers/jobController");
const { requireAuth } = require("../middleware/authMiddleware");
const { checkPremiumAccess } = require("../middleware/planCheck");

router.post("/match", requireAuth, checkPremiumAccess, matchJob);

module.exports = router;
