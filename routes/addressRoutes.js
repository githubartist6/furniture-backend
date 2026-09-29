const express = require("express");

const {
    getAddress,
    saveAddress,
    deleteAddress,
} = require("../controllers/addressController");

const {
    protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// GET SAVED ADDRESS
// =====================================

router.get(
    "/",
    protect,
    getAddress
);

// =====================================
// ADD / UPDATE ADDRESS
// =====================================

router.put(
    "/",
    protect,
    saveAddress
);

// =====================================
// DELETE ADDRESS
// =====================================

router.delete(
    "/",
    protect,
    deleteAddress
);

module.exports = router;