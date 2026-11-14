
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

// All product routes require login
router.use(authMiddleware);

// All three roles can VIEW products
router.get(
    "/",
    authorizeRoles("admin", "manager", "staff"),
    getProducts
);

router.get(
    "/:id",
    authorizeRoles("admin", "manager", "staff"),
    getProductById
);

// Only Admin and Manager can CREATE and UPDATE
router.post(
    "/",
    authorizeRoles("admin", "manager"),
    createProduct
);

router.put(
    "/:id",
    authorizeRoles("admin", "manager"),
    updateProduct
);

// Only Admin can DELETE
router.delete(
    "/:id",
    authorizeRoles("admin"),
    deleteProduct
);

module.exports = router;
