const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        id: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            default: "",
        },

        image: {
            type: String,
            default: "",
        },

        price: {
            type: Number,
            required: true,
        },

        oldPrice: {
            type: Number,
            default: null,
        },

        selectedSize: {
            type: String,
            default: "",
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
            max: 13,
        },

        itemTotal: {
            type: Number,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        orderDate: {
            type: Date,
            default: Date.now,
        },

        // Expected delivery date
        // Automatically 10 days after order date
        deliveryDate: {
            type: Date,
        },

        status: {
            type: String,
            default: "Order Placed",
        },

        items: {
            type: [orderItemSchema],
            required: true,
        },

        totalItems: {
            type: Number,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
        },

        delivery: {
            type: Number,
            default: 0,
        },

        total: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);


// Automatically set delivery date 10 days after order date
orderSchema.pre("save", async function () {
    if (this.isNew && !this.deliveryDate) {
        const orderDate =
            this.orderDate || new Date();

        const deliveryDate =
            new Date(orderDate);

        deliveryDate.setDate(
            deliveryDate.getDate() + 10
        );

        this.deliveryDate = deliveryDate;
    }
});


module.exports = mongoose.model(
    "Order",
    orderSchema
);