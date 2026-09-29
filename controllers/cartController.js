const Cart = require("../models/Cart");

// ===============================
// GET CART
// ===============================

const getCart = async (req, res) => {
    try {
        // ===============================
        // GET USER
        // ===============================

        const userId = req.user?._id;

        if (!userId) {
            console.error(
                "[GET CART AUTH ERROR] User ID is missing from req.user."
            );

            return res.status(401).json({
                message: "Please login to view your cart.",
            });
        }

        // ===============================
        // FIND CART
        // Cart schema uses "userId"
        // ===============================

        let cart;

        try {
            cart = await Cart.findOne({
                userId,
            });
        } catch (error) {
            console.error(
                "[GET CART DATABASE ERROR] Failed to fetch cart.",
                {
                    userId: userId.toString(),
                    error: error.message,
                }
            );

            return res.status(500).json({
                message:
                    "Unable to load your cart. Please try again.",
            });
        }

        // ===============================
        // CART NOT FOUND
        // ===============================

        if (!cart) {
            return res.status(200).json({
                items: [],
            });
        }

        // ===============================
        // RESPONSE
        // ===============================

        return res.status(200).json({
            items: Array.isArray(cart.items)
                ? cart.items
                : [],
        });
    } catch (error) {
        console.error(
            "[GET CART UNEXPECTED ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to fetch your cart. Please try again.",
        });
    }
};

// ===============================
// SAVE CART
// ===============================

const saveCart = async (req, res) => {
    try {
        // ===============================
        // GET USER
        // ===============================

        const userId = req.user?._id;
        const email = req.user?.email || "";

        if (!userId) {
            console.error(
                "[SAVE CART AUTH ERROR] User ID is missing from req.user."
            );

            return res.status(401).json({
                message: "Please login to save your cart.",
            });
        }

        // ===============================
        // GET ITEMS
        // ===============================

        const { items } = req.body;

        // ===============================
        // VALIDATE ITEMS
        // ===============================

        if (!Array.isArray(items)) {
            console.warn(
                "[SAVE CART VALIDATION] Cart items are not an array."
            );

            return res.status(400).json({
                message:
                    "Invalid cart data. Please refresh and try again.",
            });
        }

        // ===============================
        // CLEAN CART ITEMS
        // ===============================

        const cleanedItems = items
            .map((item, index) => {
                // ---------------------------------
                // Validate item object
                // ---------------------------------

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    console.warn(
                        "[SAVE CART] Invalid cart item skipped.",
                        {
                            index,
                        }
                    );

                    return null;
                }

                // ---------------------------------
                // ITEM ID
                // ---------------------------------

                const itemId =
                    item.id !== undefined &&
                        item.id !== null
                        ? String(item.id).trim()
                        : "";

                if (!itemId) {
                    console.warn(
                        "[SAVE CART] Cart item skipped because ID is missing.",
                        {
                            index,
                        }
                    );

                    return null;
                }

                // ---------------------------------
                // IMAGE
                // ---------------------------------

                let image = [];

                if (Array.isArray(item.image)) {
                    image = item.image
                        .filter(
                            (img) =>
                                typeof img ===
                                "string" &&
                                img.trim()
                        )
                        .map((img) =>
                            img.trim()
                        );
                } else if (
                    typeof item.image ===
                    "string" &&
                    item.image.trim()
                ) {
                    image = [
                        item.image.trim(),
                    ];
                }

                // ---------------------------------
                // QUANTITY
                // ---------------------------------

                let quantity = Number(
                    item.quantity
                );

                if (
                    !Number.isFinite(quantity) ||
                    quantity < 1
                ) {
                    quantity = 1;
                }

                quantity = Math.floor(quantity);

                if (quantity > 13) {
                    quantity = 13;
                }

                // ---------------------------------
                // PRICE
                // ---------------------------------

                let price = Number(
                    item.price
                );

                if (
                    !Number.isFinite(price) ||
                    price < 0
                ) {
                    price = 0;
                }

                // ---------------------------------
                // OLD PRICE
                // ---------------------------------

                let oldPrice = null;

                if (
                    item.oldPrice !== null &&
                    item.oldPrice !== undefined &&
                    item.oldPrice !== ""
                ) {
                    const parsedOldPrice =
                        Number(item.oldPrice);

                    if (
                        Number.isFinite(
                            parsedOldPrice
                        ) &&
                        parsedOldPrice >= 0
                    ) {
                        oldPrice =
                            parsedOldPrice;
                    }
                }

                // ---------------------------------
                // RETURN CLEAN ITEM
                // ---------------------------------

                return {
                    id: itemId,

                    name: String(
                        item.name || ""
                    ).trim(),

                    category: String(
                        item.category || ""
                    ).trim(),

                    image,

                    price,

                    oldPrice,

                    selectedSize: String(
                        item.selectedSize || ""
                    ).trim(),

                    quantity,
                };
            })
            .filter(Boolean);

        // ===============================
        // SAVE / UPDATE CART
        // IMPORTANT:
        // Cart schema uses "userId"
        // ===============================

        let cart;

        try {
            cart = await Cart.findOneAndUpdate(
                {
                    userId,
                },
                {
                    $set: {
                        userId,
                        email,
                        items: cleanedItems,
                    },
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,

                }
            );
        } catch (error) {
            console.error(
                "[SAVE CART DATABASE ERROR] Failed to save cart.",
                {
                    userId: userId.toString(),
                    error: error.message,
                }
            );

            return res.status(500).json({
                message:
                    "Unable to save your cart. Please try again.",
            });
        }

        // ===============================
        // SUCCESS
        // ===============================

        return res.status(200).json({
            message: "Cart saved successfully.",
            items: Array.isArray(cart.items)
                ? cart.items
                : [],
        });
    } catch (error) {
        console.error(
            "[SAVE CART UNEXPECTED ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to save cart. Please try again.",
        });
    }
};

// ===============================
// CLEAR CART
// ===============================

const clearCart = async (req, res) => {
    try {
        // ===============================
        // GET USER
        // ===============================

        const userId = req.user?._id;
        const email = req.user?.email || "";

        if (!userId) {
            console.error(
                "[CLEAR CART AUTH ERROR] User ID is missing from req.user."
            );

            return res.status(401).json({
                message: "Please login to clear your cart.",
            });
        }

        // ===============================
        // CLEAR CART
        // Cart schema uses "userId"
        // ===============================

        let cart;

        try {
            cart = await Cart.findOneAndUpdate(
                {
                    userId,
                },
                {
                    $set: {
                        items: [],
                        email,
                    },
                },
                {
                    new: true,
                }
            );
        } catch (error) {
            console.error(
                "[CLEAR CART DATABASE ERROR] Failed to clear cart.",
                {
                    userId: userId.toString(),
                    error: error.message,
                }
            );

            return res.status(500).json({
                message:
                    "Unable to clear your cart. Please try again.",
            });
        }

        // ===============================
        // CART DOES NOT EXIST
        // ===============================

        if (!cart) {
            return res.status(200).json({
                message: "Cart is already empty.",
                items: [],
            });
        }

        // ===============================
        // SUCCESS
        // ===============================

        return res.status(200).json({
            message: "Cart cleared successfully.",
            items: [],
        });
    } catch (error) {
        console.error(
            "[CLEAR CART UNEXPECTED ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to clear cart. Please try again.",
        });
    }
};

// ===============================
// EXPORTS
// ===============================

module.exports = {
    getCart,
    saveCart,
    clearCart,
};