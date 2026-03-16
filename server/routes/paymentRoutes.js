const express = require("express");
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);
router.post("/verify", requireAuth, verifyPayment);

module.exports = router;
