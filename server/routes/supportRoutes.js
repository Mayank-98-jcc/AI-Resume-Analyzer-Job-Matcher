const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { createSupportMessage, getUserFeedbackHistory } = require("../controllers/supportController");

router.get("/history", requireAuth, getUserFeedbackHistory);
router.post("/", requireAuth, createSupportMessage);

module.exports = router;
