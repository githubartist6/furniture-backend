const express = require("express");

const {
  signupUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgotPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// AUTH
// ======================================================

router.post(
  "/signup",
  signupUser
);

router.post(
  "/login",
  loginUser
);

router.post(
  "/logout",
  logoutUser
);

// ======================================================
// PROFILE
// ======================================================

// GET CURRENT LOGGED-IN USER PROFILE
router.get(
  "/profile",
  protect,
  getProfile
);

// UPDATE CURRENT LOGGED-IN USER PROFILE
router.put(
  "/profile",
  protect,
  updateProfile
);

// ======================================================
// FORGOT PASSWORD
// ======================================================

// Step 1
// Email -> OTP
router.post(
  "/forgot-password/request-otp",
  requestForgotPasswordOTP
);

// Step 2
// Email + OTP -> Reset Token
router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOTP
);

// Step 3
// Email + Reset Token + New Password
router.post(
  "/forgot-password/reset",
  resetForgotPassword
);

module.exports = router;