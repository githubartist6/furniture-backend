const User = require("../models/User");

// =====================================
// CONSTANTS
// =====================================

const ALLOWED_ADDRESS_TYPES = [
    "Home",
    "Work",
    "Other",
];

// =====================================
// GET ADDRESS
// =====================================

const getAddress = async (req, res) => {
    try {
        // =====================================
        // AUTH CHECK
        // =====================================

        const userId =
            req.user?._id || req.user?.id;

        if (!userId) {
            console.warn(
                "[GET ADDRESS AUTH] User ID is missing"
            );

            return res.status(401).json({
                message:
                    "Please login to view your address.",
            });
        }

        // =====================================
        // FIND USER
        // =====================================

        const user =
            await User.findById(userId)
                .select("address");

        if (!user) {
            console.warn(
                "[GET ADDRESS] User account not found",
                {
                    userId: String(userId),
                }
            );

            return res.status(404).json({
                message:
                    "Your user account was not found.",
            });
        }

        // =====================================
        // RESPONSE
        // =====================================

        return res.status(200).json({
            address:
                Array.isArray(user.address)
                    ? user.address
                    : [],
        });
    } catch (error) {
        // =====================================
        // TECHNICAL ERROR → CONSOLE ONLY
        // =====================================

        console.error(
            "[GET ADDRESS DATABASE/SERVER ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // =====================================
        // USER MESSAGE → TOASTIFY
        // =====================================

        return res.status(500).json({
            message:
                "Unable to load your address. Please try again.",
        });
    }
};

// =====================================
// ADD / UPDATE ADDRESS
// =====================================

const saveAddress = async (req, res) => {
    try {
        // =====================================
        // AUTH CHECK
        // =====================================

        const userId =
            req.user?._id || req.user?.id;

        if (!userId) {
            console.warn(
                "[SAVE ADDRESS AUTH] User ID is missing"
            );

            return res.status(401).json({
                message:
                    "Please login to save your address.",
            });
        }

        // =====================================
        // REQUEST BODY
        // =====================================

        const body = req.body || {};

        const {
            name,
            phone,
            pincode,
            location,
            address,
            city,
            state,
            landmark,
            alternatePhone,
            addressType,
        } = body;

        // =====================================
        // REQUIRED FIELD VALIDATION
        // =====================================

        if (
            typeof name !== "string" ||
            !name.trim() ||

            typeof phone !== "string" ||
            !phone.trim() ||

            typeof pincode !== "string" ||
            !pincode.trim() ||

            typeof location !== "string" ||
            !location.trim() ||

            typeof address !== "string" ||
            !address.trim() ||

            typeof city !== "string" ||
            !city.trim() ||

            typeof state !== "string" ||
            !state.trim() ||

            typeof addressType !== "string" ||
            !addressType.trim()
        ) {
            return res.status(400).json({
                message:
                    "Please fill all required address fields.",
            });
        }

        // =====================================
        // CLEAN VALUES
        // =====================================

        const cleanName =
            name.trim();

        const cleanPhone =
            phone.trim();

        const cleanPincode =
            pincode.trim();

        const cleanLocation =
            location.trim();

        const cleanAddress =
            address.trim();

        const cleanCity =
            city.trim();

        const cleanState =
            state.trim();

        const cleanLandmark =
            typeof landmark === "string"
                ? landmark.trim()
                : "";

        const cleanAlternatePhone =
            typeof alternatePhone === "string"
                ? alternatePhone.trim()
                : "";

        const cleanAddressType =
            addressType.trim();

        // =====================================
        // PHONE VALIDATION
        // =====================================

        if (
            !/^[6-9]\d{9}$/.test(
                cleanPhone
            )
        ) {
            return res.status(400).json({
                message:
                    "Please enter a valid 10-digit phone number.",
            });
        }

        // =====================================
        // PINCODE VALIDATION
        // =====================================

        if (
            !/^\d{6}$/.test(
                cleanPincode
            )
        ) {
            return res.status(400).json({
                message:
                    "Please enter a valid 6-digit pincode.",
            });
        }

        // =====================================
        // ALTERNATE PHONE VALIDATION
        // =====================================

        if (
            cleanAlternatePhone &&
            !/^[6-9]\d{9}$/.test(
                cleanAlternatePhone
            )
        ) {
            return res.status(400).json({
                message:
                    "Please enter a valid alternate phone number.",
            });
        }

        // =====================================
        // ADDRESS TYPE VALIDATION
        // =====================================

        if (
            !ALLOWED_ADDRESS_TYPES.includes(
                cleanAddressType
            )
        ) {
            return res.status(400).json({
                message:
                    "Please select a valid address type.",
            });
        }

        // =====================================
        // FIND USER
        // =====================================

        const user =
            await User.findById(userId);

        if (!user) {
            console.warn(
                "[SAVE ADDRESS] User account not found",
                {
                    userId: String(userId),
                }
            );

            return res.status(404).json({
                message:
                    "Your user account was not found.",
            });
        }

        // =====================================
        // CREATE ADDRESS
        // =====================================

        const newAddress = {
            name: cleanName,
            phone: cleanPhone,
            pincode: cleanPincode,
            location: cleanLocation,
            address: cleanAddress,
            city: cleanCity,
            state: cleanState,
            landmark: cleanLandmark,
            alternatePhone:
                cleanAlternatePhone,
            addressType:
                cleanAddressType,
        };

        // =====================================
        // SAVE ADDRESS
        // =====================================
        // Current behavior:
        // New address replaces existing address.

        user.address = [
            newAddress,
        ];

        await user.save();

        // =====================================
        // SUCCESS RESPONSE
        // =====================================

        return res.status(200).json({
            message:
                "Address saved successfully.",
            address:
                Array.isArray(user.address)
                    ? user.address
                    : [],
        });
    } catch (error) {
        // =====================================
        // TECHNICAL ERROR → CONSOLE ONLY
        // =====================================

        console.error(
            "[SAVE ADDRESS DATABASE/SERVER ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // =====================================
        // USER MESSAGE → TOASTIFY
        // =====================================

        return res.status(500).json({
            message:
                "Unable to save your address. Please try again.",
        });
    }
};

// =====================================
// DELETE ADDRESS
// =====================================

const deleteAddress = async (req, res) => {
    try {
        // =====================================
        // AUTH CHECK
        // =====================================

        const userId =
            req.user?._id || req.user?.id;

        if (!userId) {
            console.warn(
                "[DELETE ADDRESS AUTH] User ID is missing"
            );

            return res.status(401).json({
                message:
                    "Please login to delete your address.",
            });
        }

        // =====================================
        // FIND USER
        // =====================================

        const user =
            await User.findById(userId);

        if (!user) {
            console.warn(
                "[DELETE ADDRESS] User account not found",
                {
                    userId: String(userId),
                }
            );

            return res.status(404).json({
                message:
                    "Your user account was not found.",
            });
        }

        // =====================================
        // DELETE ADDRESS
        // =====================================

        user.address = [];

        await user.save();

        // =====================================
        // SUCCESS RESPONSE
        // =====================================

        return res.status(200).json({
            message:
                "Address deleted successfully.",
            address: [],
        });
    } catch (error) {
        // =====================================
        // TECHNICAL ERROR → CONSOLE ONLY
        // =====================================

        console.error(
            "[DELETE ADDRESS DATABASE/SERVER ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // =====================================
        // USER MESSAGE → TOASTIFY
        // =====================================

        return res.status(500).json({
            message:
                "Unable to delete your address. Please try again.",
        });
    }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
    getAddress,
    saveAddress,
    deleteAddress,
};