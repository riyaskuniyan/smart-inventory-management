
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");
const logActivity = require("../utils/auditLogger");

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

        if (!mongoose.isValidObjectId(customer)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
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

        // Prevent duplicate products
        const productIds = items.map(item => item.product);

        if (new Set(productIds.map(String)).size !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: "Duplicate products are not allowed in one order"
            });
        }

        let createdOrder;
        let customerName = "";
        let productDetails = [];

        await session.withTransaction(async () => {

            const existingCustomer = await Customer.findById(customer)
                .session(session);

            if (!existingCustomer) {
                throw new Error("Customer not found");
            }

            customerName = existingCustomer.name;

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

                productDetails.push({
                    product: product.name,
                    quantity: item.quantity,
                    previousStock,
                    newStock: updatedProduct.quantity
                });

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

            const orders = await Order.create([{
                orderNumber: `ORD-${Date.now()}`,
                customer: existingCustomer._id,
                items: orderItems,
                totalAmount,
                createdBy: req.user.id
            }], { session });

            createdOrder = orders[0];
        });

        // Log only after transaction succeeds
        await logActivity({
            req,
            action: "CREATE",
            module: "Orders",
            description: `Created order ${createdOrder.orderNumber} for ${customerName}`,
            targetId: createdOrder._id,
            targetName: createdOrder.orderNumber,
            details: {
                customer: customerName,
                totalAmount: createdOrder.totalAmount,
                products: productDetails
            }
        });

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: createdOrder
        });

    } catch (error) {
        return res.status(400).json({
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

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        return res.status(500).json({
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

        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        return res.status(500).json({
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
