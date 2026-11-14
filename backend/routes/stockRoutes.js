
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

router.use(authMiddleware);

// Stock IN — all roles
router.post(
    "/:id/in",
    authorizeRoles("admin", "manager", "staff"),
    stockIn
);

// Stock OUT — all roles
router.post(
    "/:id/out",
    authorizeRoles("admin", "manager", "staff"),
    stockOut
);

// Stock history — all roles
router.get(
    "/history",
    authorizeRoles("admin", "manager", "staff"),
    getStockHistory
);

// Low-stock products — all roles
router.get(
    "/low-stock",
    authorizeRoles("admin", "manager", "staff"),
    getLowStockProducts
);

module.exports = router;
