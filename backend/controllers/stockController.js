
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const logActivity = require("../utils/auditLogger");

// 1. Stock IN
const stockIn = async (req, res) => {
    try {
        const { quantity, note } = req.body;

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer"
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const previousStock = product.quantity;
        product.quantity += quantity;

        await product.save();

        const movement = await StockMovement.create({
            product: product._id,
            type: "IN",
            quantity,
            previousStock,
            newStock: product.quantity,
            note,
            performedBy: req.user.id
        });

        await logActivity({
            req,
            action: "STOCK_IN",
            module: "Stock",
            description: `Added ${quantity} units to ${product.name}`,
            targetId: product._id,
            targetName: product.name,
            details: {
                quantity,
                previousStock,
                newStock: product.quantity,
                note: note || ""
            }
        });

        return res.status(200).json({
            success: true,
            message: "Stock added successfully",
            product,
            movement
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Stock OUT
const stockOut = async (req, res) => {
    try {
        const { quantity, note } = req.body;

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer"
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (product.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock available"
            });
        }

        const previousStock = product.quantity;
        product.quantity -= quantity;

        await product.save();

        const movement = await StockMovement.create({
            product: product._id,
            type: "OUT",
            quantity,
            previousStock,
            newStock: product.quantity,
            note,
            performedBy: req.user.id
        });

        await logActivity({
            req,
            action: "STOCK_OUT",
            module: "Stock",
            description: `Removed ${quantity} units from ${product.name}`,
            targetId: product._id,
            targetName: product.name,
            details: {
                quantity,
                previousStock,
                newStock: product.quantity,
                note: note || ""
            }
        });

        return res.status(200).json({
            success: true,
            message: "Stock removed successfully",
            product,
            movement
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 3. Get stock movement history
const getStockHistory = async (req, res) => {
    try {
        const movements = await StockMovement.find()
            .populate("product", "name sku")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: movements.length,
            movements
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 4. Get low-stock products
const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$lowStockThreshold"]
            }
        });

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    stockIn,
    stockOut,
    getStockHistory,
    getLowStockProducts
};
