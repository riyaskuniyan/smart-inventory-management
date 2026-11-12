
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Any logged-in user
router.get("/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: "You accessed a protected route successfully!",
        user: req.user
    });
});

// Admin only
router.get(
    "/admin",
    authMiddleware,
    authorizeRoles("admin"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome Admin! You have full access."
        });
    }
);

// Admin and Manager
router.get(
    "/manager",
    authMiddleware,
    authorizeRoles("admin", "manager"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome! You can manage inventory."
        });
    }
);

module.exports = router;
