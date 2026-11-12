
const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        type: {
            type: String,
            enum: ["IN", "OUT"],
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        previousStock: {
            type: Number,
            required: true
        },

        newStock: {
            type: Number,
            required: true
        },

        note: {
            type: String,
            default: ""
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const StockMovement = mongoose.model(
    "StockMovement",
    stockMovementSchema
);

module.exports = StockMovement;
