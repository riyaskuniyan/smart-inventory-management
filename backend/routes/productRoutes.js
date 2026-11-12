
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

// Admin and Manager can view products
router.get("/", authorizeRoles("admin", "manager"), getProducts);
router.get("/:id", authorizeRoles("admin", "manager"), getProductById);

// Only Admin and Manager can create, update or delete
router.post("/", authorizeRoles("admin", "manager"), createProduct);
router.put("/:id", authorizeRoles("admin", "manager"), updateProduct);
router.delete("/:id", authorizeRoles("admin"), deleteProduct);

module.exports = router;

