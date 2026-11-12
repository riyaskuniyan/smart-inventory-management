const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    stockIn,
    stockOut,
    getStockHistory,
    getLowStockProducts
} = require("../controllers/stockController");

// All stock routes require login
router.use(authMiddleware);

// Stock IN
router.post(
    "/:id/in",
    authorizeRoles("admin", "manager", "staff"),
    stockIn
);

// Stock OUT
router.post(
    "/:id/out",
    authorizeRoles("admin", "manager", "staff"),
    stockOut
);

// Stock movement history (Admin and Manager)
router.get(
    "/history",
    authorizeRoles("admin", "manager"),
    getStockHistory
);

// Low-stock products (Admin and Manager)
router.get(
    "/low-stock",
    authorizeRoles("admin", "manager"),
    getLowStockProducts
);

module.exports = router;