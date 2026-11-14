
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    getUsers,
    createUser,
    updateUserRole,
    updateUserStatus
} = require("../controllers/userController");

// All user management routes require admin access
router.use(authMiddleware);
router.use(authorizeRoles("admin"));

router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", updateUserStatus);

module.exports = router;
