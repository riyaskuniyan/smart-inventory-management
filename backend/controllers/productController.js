
const Product = require("../models/Product");
const { randomBytes } = require("crypto");
const logActivity = require("../utils/auditLogger");

// Generate unique barcode
const generateBarcode = () => {
    return `INV-${randomBytes(8).toString("hex").toUpperCase()}`;
};

// Duplicate error messages
const getDuplicateMessage = (error) => {
    if (error.code === 11000) {
        if (error.keyPattern?.barcode) {
            return "Barcode already exists. Please try again.";
        }

        if (error.keyPattern?.sku) {
            return "SKU already exists";
        }

        return "A unique product field already exists.";
    }

    return error.message;
};

// 1. Create product
const createProduct = async (req, res) => {
    try {
        const {
            name,
            sku,
            description,
            category,
            price,
            quantity,
            lowStockThreshold
        } = req.body;

        const barcode = generateBarcode();

        const product = await Product.create({
            name,
            sku,
            barcode,
            description,
            category,
            price,
            quantity,
            lowStockThreshold
        });

        await logActivity({
            req,
            action: "CREATE",
            module: "Products",
            description: `Created product ${product.name}`,
            targetId: product._id,
            targetName: product.name,
            details: {
                sku: product.sku,
                barcode: product.barcode,
                category: product.category,
                price: product.price,
                quantity: product.quantity
            }
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: getDuplicateMessage(error)
        });
    }
};

// 2. Get all products
const getProducts = async (req, res) => {
    try {
        const { search, category, barcode } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
                { barcode: { $regex: search, $options: "i" } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (barcode) {
            filter.barcode = barcode.trim();
        }

        const products = await Product.find(filter)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 3. Get one product
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};

// 4. Update product
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const previousValues = {
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            lowStockThreshold: product.lowStockThreshold
        };

        product.set(req.body);
        await product.save();

        await logActivity({
            req,
            action: "UPDATE",
            module: "Products",
            description: `Updated product ${product.name}`,
            targetId: product._id,
            targetName: product.name,
            details: {
                previousValues,
                updatedFields: Object.keys(req.body)
            }
        });

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: getDuplicateMessage(error)
        });
    }
};

// 5. Delete product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        await logActivity({
            req,
            action: "DELETE",
            module: "Products",
            description: `Deleted product ${product.name}`,
            targetId: product._id,
            targetName: product.name,
            details: {
                sku: product.sku,
                barcode: product.barcode
            }
        });

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
};
