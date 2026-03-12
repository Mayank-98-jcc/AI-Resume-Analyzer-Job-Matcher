const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  checkEmailExists,
  forgotPassword,
  googleAuth,
  getUserProfile
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/check-email", checkEmailExists);
router.post("/forgot-password", forgotPassword);
router.post("/google", googleAuth);
router.get("/profile/:userId", getUserProfile);

module.exports = router;
