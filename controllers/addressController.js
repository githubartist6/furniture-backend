const User = require("../models/User");

const clean = (value) =>
    typeof value === "string" ? value.trim() : "";

const formatAddress = (item) => {
    if (!item) return null;
    const a = typeof item.toObject === "function" ? item.toObject() : item;
    return {
        ...a,
        // Legacy aliases keep older frontend components compatible.
        name: a.fullName || a.name || "",
        address: a.addressLine1 || a.address || "",
    };
};

const getAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Please login first." });

        const user = await User.findById(userId).select("address");
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        return res.status(200).json({ success: true, address: (user.address || []).map(formatAddress) });
    } catch (error) {
        console.error("Get address error:", error);
        return res.status(500).json({ success: false, message: "Unable to fetch address." });
    }
};

const saveAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Please login first." });

        const body = req.body || {};
        const fullName = clean(body.fullName ?? body.name);
        const phone = clean(body.phone);
        const pincode = clean(body.pincode);
        const location = clean(body.location);
        const addressLine1 = clean(body.addressLine1 ?? body.address);
        const addressLine2 = clean(body.addressLine2);
        const city = clean(body.city);
        const state = clean(body.state);
        const country = clean(body.country) || "India";
        const landmark = clean(body.landmark);
        const alternatePhone = clean(body.alternatePhone);
        const addressType = clean(body.addressType) || "Home";

        if (!fullName || !phone || !pincode || !location || !addressLine1 || !city || !state) {
            return res.status(400).json({ success: false, message: "Please fill all required address fields." });
        }
        if (!/^[6-9]\d{9}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number." });
        }
        if (alternatePhone && !/^[6-9]\d{9}$/.test(alternatePhone)) {
            return res.status(400).json({ success: false, message: "Enter a valid alternate mobile number." });
        }
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ success: false, message: "Enter a valid 6-digit pincode." });
        }
        if (!["Home", "Work", "Other"].includes(addressType)) {
            return res.status(400).json({ success: false, message: "Invalid address type." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const newAddress = {
            fullName, phone, alternatePhone, pincode, location,
            addressLine1, addressLine2, landmark, city, state,
            country, addressType, isDefault: true,
        };

        user.address = [newAddress];
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Address saved successfully.",
            address: user.address.map(formatAddress),
        });
    } catch (error) {
        console.error("Save address error:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: "Unable to save address." });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Please login first." });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        user.address = [];
        await user.save();
        return res.status(200).json({ success: true, message: "Address deleted successfully.", address: [] });
    } catch (error) {
        console.error("Delete address error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete address." });
    }
};

module.exports = { getAddress, saveAddress, deleteAddress };
