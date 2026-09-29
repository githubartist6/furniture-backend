const mongoose = require("mongoose");

// ======================================================
// ADDRESS SCHEMA
// ======================================================

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    alternatePhone: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, required: true },
    location: { type: String, trim: true, required: true },
    addressLine1: { type: String, trim: true, required: true },
    addressLine2: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    country: { type: String, trim: true, default: "India" },
    addressType: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
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

    resetPasswordOtpHash: {
      type: String,
      default: undefined,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: undefined,
    },
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
    },
    resetPasswordLastOtpSentAt: {
      type: Date,
      default: undefined,
    },
    resetPasswordOtpDailyCount: {
      type: Number,
      default: 0,
    },
    resetPasswordOtpDailyResetAt: {
      type: Date,
      default: undefined,
    },

    // ==================================================
    // FORGOT PASSWORD - RESET TOKEN
    // ==================================================
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