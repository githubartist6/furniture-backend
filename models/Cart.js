const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
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
            type: [String],
            default: [],
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
    },
    {
        _id: false,
    }
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Cart", cartSchema);