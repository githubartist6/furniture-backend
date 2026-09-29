const crypto = require("crypto");

const Order = require("../models/Order");
const Cart = require("../models/Cart");

// =====================================
// CREATE ORDER
// =====================================

const createOrder = async (req, res) => {
    try {
        // =====================================
        // GET USER
        // =====================================

        const userId = req.user?._id;
        const email = req.user?.email || "";

        if (!userId) {
            console.error(
                "[CREATE ORDER AUTH ERROR] User ID is missing from req.user."
            );

            return res.status(401).json({
                message: "Please login to place an order.",
            });
        }

        // =====================================
        // FIND CART
        // Cart schema uses "userId"
        // =====================================

        let cart;

        try {
            cart = await Cart.findOne({
                userId,
            });
        } catch (error) {
            console.error(
                "[CREATE ORDER CART ERROR] Failed to fetch cart.",
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

        // =====================================
        // CHECK CART
        // =====================================

        if (
            !cart ||
            !Array.isArray(cart.items) ||
            cart.items.length === 0
        ) {
            return res.status(400).json({
                message: "Your cart is empty.",
            });
        }

        // =====================================
        // PREPARE ORDER ITEMS
        // =====================================

        const orderItems = cart.items
            .map((item) => {
                const price = Number(item.price);

                const quantity = Number(
                    item.quantity
                );

                // Invalid item -> ignore
                if (
                    !Number.isFinite(price) ||
                    price < 0 ||
                    !Number.isFinite(quantity) ||
                    quantity <= 0
                ) {
                    console.warn(
                        "[CREATE ORDER] Invalid cart item skipped.",
                        {
                            itemId: item.id,
                            price: item.price,
                            quantity: item.quantity,
                        }
                    );

                    return null;
                }

                const safeQuantity =
                    Math.floor(quantity);

                const itemTotal =
                    price * safeQuantity;

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

                return {
                    id: item.id,

                    name: item.name || "",

                    category:
                        item.category || "",

                    image:
                        Array.isArray(item.image) &&
                            item.image.length > 0
                            ? item.image[0]
                            : typeof item.image ===
                                "string"
                                ? item.image
                                : "",

                    price,

                    oldPrice,

                    selectedSize:
                        item.selectedSize || "",

                    quantity: safeQuantity,

                    itemTotal,
                };
            })
            .filter(Boolean);

        // =====================================
        // VALIDATE ORDER ITEMS
        // =====================================

        if (orderItems.length === 0) {
            console.warn(
                "[CREATE ORDER] Cart contains no valid order items.",
                {
                    userId: userId.toString(),
                }
            );

            return res.status(400).json({
                message:
                    "Your cart does not contain any valid items.",
            });
        }

        // =====================================
        // GENERATE ORDER ID
        // =====================================

        const orderId =
            `ORD-${Date.now()}-${crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;

        // =====================================
        // TOTAL ITEMS
        // =====================================

        const totalItems =
            orderItems.reduce(
                (total, item) =>
                    total + item.quantity,
                0
            );

        // =====================================
        // SUBTOTAL
        // =====================================

        const subtotal =
            orderItems.reduce(
                (total, item) =>
                    total + item.itemTotal,
                0
            );

        // =====================================
        // DELIVERY
        // =====================================

        const delivery = 0;

        // =====================================
        // FINAL TOTAL
        // =====================================

        const total =
            subtotal + delivery;

        // =====================================
        // CREATE ORDER
        // =====================================

        let order;

        try {
            order = await Order.create({
                orderId,
                userId,
                email,
                orderDate: new Date(),
                status: "Order Placed",
                items: orderItems,
                totalItems,
                subtotal,
                delivery,
                total,
            });
        } catch (error) {
            console.error(
                "[CREATE ORDER DATABASE ERROR] Failed to create order.",
                {
                    userId: userId.toString(),
                    orderId,
                    error: error.message,
                }
            );

            return res.status(500).json({
                message:
                    "Unable to place your order right now. Please try again.",
            });
        }

        // =====================================
        // CLEAR CART
        // Cart schema uses "userId"
        // =====================================

        try {
            await Cart.findOneAndUpdate(
                {
                    userId,
                },
                {
                    $set: {
                        items: [],
                        email,
                    },
                }
            );
        } catch (error) {
            // Order is already created.
            // Do NOT tell the user that order creation failed.

            console.error(
                "[CREATE ORDER CART CLEAR ERROR] Order was created but cart could not be cleared.",
                {
                    userId: userId.toString(),
                    orderId,
                    error: error.message,
                }
            );
        }

        // =====================================
        // SUCCESS RESPONSE
        // =====================================

        return res.status(201).json({
            message: "Order placed successfully.",
            order,
        });
    } catch (error) {
        // =====================================
        // UNEXPECTED ERROR
        // =====================================

        console.error(
            "[CREATE ORDER UNEXPECTED ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to place your order. Please try again.",
        });
    }
};

// =====================================
// GET ORDERS
// =====================================

const getOrders = async (req, res) => {
    try {
        // =====================================
        // GET USER
        // =====================================

        const userId = req.user?._id;

        if (!userId) {
            console.error(
                "[GET ORDERS AUTH ERROR] User ID is missing from req.user."
            );

            return res.status(401).json({
                message:
                    "Please login to view your orders.",
            });
        }

        // =====================================
        // GET USER ORDERS
        // =====================================

        let orders;

        try {
            orders = await Order.find({
                userId,
            }).sort({
                orderDate: -1,
                createdAt: -1,
            });
        } catch (error) {
            console.error(
                "[GET ORDERS DATABASE ERROR] Failed to fetch orders.",
                {
                    userId: userId.toString(),
                    error: error.message,
                }
            );

            return res.status(500).json({
                message:
                    "Unable to fetch your orders. Please try again.",
            });
        }

        // =====================================
        // RESPONSE
        // =====================================

        return res.status(200).json({
            orders,
        });
    } catch (error) {
        console.error(
            "[GET ORDERS UNEXPECTED ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to fetch your orders. Please try again.",
        });
    }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
    createOrder,
    getOrders,
};