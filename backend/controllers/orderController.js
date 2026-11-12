const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");

// 1. Create Order
const createOrder = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { customer, items } = req.body;

        if (!customer || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Customer and order items are required"
            });
        }

        if (items.some(item =>
            !mongoose.isValidObjectId(item.product) ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        )) {
            return res.status(400).json({
                success: false,
                message: "Each item must have a valid product ID and positive quantity"
            });
        }

        // Prevent duplicate products in one order
        const productIds = items.map(item => item.product);

        if (new Set(productIds.map(String)).size !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: "Duplicate products are not allowed in one order"
            });
        }

        let createdOrder;

        await session.withTransaction(async () => {

            const existingCustomer = await Customer.findById(customer)
                .session(session);

            if (!existingCustomer) {
                throw new Error("Customer not found");
            }

            const orderItems = [];
            let totalAmount = 0;

            for (const item of items) {

                const product = await Product.findById(item.product)
                    .session(session);

                if (!product) {
                    throw new Error(`Product not found: ${item.product}`);
                }

                const previousStock = product.quantity;

                if (previousStock < item.quantity) {
                    throw new Error(
                        `Insufficient stock for ${product.name}. Available: ${previousStock}`
                    );
                }

                // Reduce stock only if sufficient stock remains
                const updatedProduct = await Product.findOneAndUpdate(
                    {
                        _id: product._id,
                        quantity: { $gte: item.quantity }
                    },
                    {
                        $inc: { quantity: -item.quantity }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!updatedProduct) {
                    throw new Error(
                        `Stock changed. Please try again for ${product.name}`
                    );
                }

                const subtotal = product.price * item.quantity;
                totalAmount += subtotal;

                orderItems.push({
                    product: product._id,
                    quantity: item.quantity,
                    price: product.price,
                    subtotal
                });

                // Record stock movement
                await StockMovement.create([{
                    product: product._id,
                    type: "OUT",
                    quantity: item.quantity,
                    previousStock,
                    newStock: updatedProduct.quantity,
                    note: "Stock deducted for order",
                    performedBy: req.user.id
                }], { session });
            }

            // Create order
            const orders = await Order.create([{
                orderNumber: `ORD-${Date.now()}`,
                customer: existingCustomer._id,
                items: orderItems,
                totalAmount,
                createdBy: req.user.id
            }], { session });

            createdOrder = orders[0];
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: createdOrder
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        await session.endSession();
    }
};

// 2. Get all orders
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("customer", "name email phone")
            .populate("items.product", "name sku")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 3. Get order by ID
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customer", "name email phone")
            .populate("items.product", "name sku")
            .populate("createdBy", "name email");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById
};