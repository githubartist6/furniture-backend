const mongoose = require("mongoose");

// ======================================================
// ADDRESS SCHEMA
// ======================================================

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    addressLine1: {
      type: String,
      trim: true,
      default: "",
    },

    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

// ======================================================
// USER SCHEMA
// ======================================================

const userSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // BASIC USER INFORMATION
    // --------------------------------------------------

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      match: /^[A-Za-z0-9_@-]+$/,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // --------------------------------------------------
    // ADDRESSES
    // --------------------------------------------------

    address: {
      type: [addressSchema],
      default: [],
    },

    // --------------------------------------------------
    // ADMIN
    // --------------------------------------------------

    isAdmin: {
      type: Boolean,
      default: false,
    },

    // ==================================================
    // FORGOT PASSWORD - OTP
    // ==================================================

    // SHA-256 hash of the latest OTP
    resetPasswordOtpHash: {
      type: String,
      default: undefined,
    },

    // OTP expiry time
    resetPasswordOtpExpires: {
      type: Date,
      default: undefined,
    },

    // Number of wrong OTP attempts
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
    },

    // Last time an OTP was sent
    resetPasswordLastOtpSentAt: {
      type: Date,
      default: undefined,
    },

    // Number of OTP requests in current 24-hour window
    resetPasswordOtpDailyCount: {
      type: Number,
      default: 0,
    },

    // End of current 24-hour OTP request window
    resetPasswordOtpDailyResetAt: {
      type: Date,
      default: undefined,
    },

    // ==================================================
    // FORGOT PASSWORD - RESET TOKEN
    // ==================================================

    // SHA-256 hash of temporary reset token
    resetPasswordTokenHash: {
      type: String,
      default: undefined,
    },

    // Reset token expiry
    resetPasswordTokenExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);