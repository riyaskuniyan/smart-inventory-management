
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    getDashboardStats
} = require("../controllers/dashboardController");

router.get(
    "/",
    authMiddleware,
    authorizeRoles("admin", "manager", "staff"),
    getDashboardStats
);

module.exports = router;
    