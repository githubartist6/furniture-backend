const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        otpHash: {
            type: String,
            required: true,
        },

        resetTokenHash: {
            type: String,
            default: null,
        },

        otpExpiresAt: {
            type: Date,
            required: true,
        },

        resetTokenExpiresAt: {
            type: Date,
            default: null,
        },

        otpVerified: {
            type: Boolean,
            default: false,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        resendCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "PasswordReset",
    passwordResetSchema
);