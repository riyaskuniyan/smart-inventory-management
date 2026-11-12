const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customerController");

// All customer routes require authentication
router.use(authMiddleware);

// Admin, Manager and Staff
router.get(
    "/",
    authorizeRoles("admin", "manager", "staff"),
    getCustomers
);

router.get(
    "/:id",
    authorizeRoles("admin", "manager", "staff"),
    getCustomerById
);

router.post(
    "/",
    authorizeRoles("admin", "manager", "staff"),
    createCustomer
);

router.put(
    "/:id",
    authorizeRoles("admin", "manager"),
    updateCustomer
);

router.delete(
    "/:id",
    authorizeRoles("admin"),
    deleteCustomer
);

module.exports = router;