const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =====================================
// PROTECT
// =====================================

const protect = async (req, res, next) => {
  try {
    // =================================
    // CHECK JWT SECRET
    // =================================

    if (!process.env.JWT_SECRET) {
      console.error(
        "[AUTH CONFIG ERROR] JWT_SECRET is not configured."
      );

      return res.status(500).json({
        message:
          "Authentication service is temporarily unavailable. Please try again later.",
      });
    }

    // =================================
    // GET TOKEN
    // =================================

    const token = req.cookies?.furniture_token;

    if (!token) {
      // Console: technical/developer information
      console.warn(
        "[AUTH] Access denied: furniture_token cookie is missing."
      );

      // Toastify: user-friendly message
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    // =================================
    // VERIFY TOKEN
    // =================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      // Console: actual technical JWT error
      console.error(
        "[JWT VERIFICATION ERROR]",
        {
          name: error.name,
          message: error.message,
        }
      );

      // Toastify: clean user message
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message:
            "Your session has expired. Please login again.",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          message:
            "Your login session is invalid. Please login again.",
        });
      }

      return res.status(401).json({
        message:
          "Authentication failed. Please login again.",
      });
    }

    // =================================
    // CHECK USER ID
    // =================================

    if (!decoded?.userId) {
      console.error(
        "[AUTH TOKEN ERROR] userId is missing from JWT payload.",
        decoded
      );

      return res.status(401).json({
        message:
          "Invalid login session. Please login again.",
      });
    }

    // =================================
    // FIND USER
    // =================================

    let user;

    try {
      user = await User.findById(
        decoded.userId
      ).select("-password");
    } catch (error) {
      // Console: MongoDB/database error
      console.error(
        "[AUTH DATABASE ERROR] Failed to find user.",
        {
          userId: decoded.userId,
          error: error.message,
        }
      );

      // Toastify
      return res.status(500).json({
        message:
          "Unable to verify your account. Please try again.",
      });
    }

    // =================================
    // USER NOT FOUND
    // =================================

    if (!user) {
      console.warn(
        "[AUTH] User not found for JWT userId:",
        decoded.userId
      );

      return res.status(401).json({
        message:
          "Your account could not be found. Please login again.",
      });
    }

    // =================================
    // ATTACH USER
    // =================================

    req.user = user;

    // =================================
    // CONTINUE
    // =================================

    next();
  } catch (error) {
    // =================================
    // UNEXPECTED SERVER ERROR
    // =================================

    console.error(
      "[PROTECT MIDDLEWARE ERROR]",
      error
    );

    return res.status(500).json({
      message:
        "Authentication failed. Please try again.",
    });
  }
};

// =====================================
// ADMIN ONLY
// =====================================

const adminOnly = (req, res, next) => {
  // =================================
  // USER CHECK
  // =================================

  if (!req.user) {
    console.warn(
      "[ADMIN AUTH] Admin route accessed without authenticated user."
    );

    return res.status(401).json({
      message:
        "Please login first.",
    });
  }

  // =================================
  // ADMIN CHECK
  // =================================

  if (!req.user.isAdmin) {
    console.warn(
      "[ADMIN AUTH] Non-admin user attempted to access admin route.",
      {
        userId: req.user._id,
      }
    );

    return res.status(403).json({
      message:
        "Access denied. Admin access is required.",
    });
  }

  // =================================
  // ADMIN VERIFIED
  // =================================

  next();
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  protect,
  adminOnly,
};