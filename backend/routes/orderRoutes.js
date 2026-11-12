const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    createOrder,
    getOrders,
    getOrderById
} = require("../controllers/orderController");

// All order routes require authentication
router.use(authMiddleware);

// Get all orders
router.get(
    "/",
    authorizeRoles("admin", "manager", "staff"),
    getOrders
);

// Get order by ID
router.get(
    "/:id",
    authorizeRoles("admin", "manager", "staff"),
    getOrderById
);

// Create order
router.post(
    "/",
    authorizeRoles("admin", "manager", "staff"),
    createOrder
);

module.exports = router;