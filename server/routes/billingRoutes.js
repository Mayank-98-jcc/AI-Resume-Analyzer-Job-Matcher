const express = require("express");
const {
  createOrder,
  verifyPayment,
  getUserBilling,
  upgradePlan
} = require("../controllers/billingController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);
router.get("/history", requireAuth, getUserBilling);
router.post("/upgrade", requireAuth, upgradePlan);

module.exports = router;
