const express = require("express");

const {
    getCart,
    saveCart,
    clearCart,
} = require("../controllers/cartController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getCart);

router.put("/", protect, saveCart);

router.delete("/", protect, clearCart);

module.exports = router;