
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const User = require("../models/user");

const getDashboardStats = async (req, res) => {
    try {
        const [
            totalProducts,
            totalCustomers,
            totalOrders,
            totalUsers,
            lowStockProducts,
            salesResult
        ] = await Promise.all([
            Product.countDocuments(),
            Customer.countDocuments(),
            Order.countDocuments(),
            User.countDocuments(),
            Product.countDocuments({
                $expr: { $lte: ["$quantity", "$lowStockThreshold"] }
            }),
            Order.aggregate([
                { $match: { status: { $ne: "cancelled" } } },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: "$totalAmount" }
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                totalCustomers,
                totalOrders,
                totalUsers,
                lowStockProducts,
                totalSales: salesResult[0]?.totalSales || 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { getDashboardStats };
