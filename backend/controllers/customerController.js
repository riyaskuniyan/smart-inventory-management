
const Customer = require("../models/Customer");
const logActivity = require("../utils/auditLogger");

// 1. Create customer
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and phone are required"
            });
        }

        const customer = await Customer.create({
            name,
            email,
            phone,
            address
        });

        await logActivity({
            req,
            action: "CREATE",
            module: "Customers",
            description: `Created customer ${customer.name}`,
            targetId: customer._id,
            targetName: customer.name,
            details: {
                email: customer.email,
                phone: customer.phone
            }
        });

        return res.status(201).json({
            success: true,
            message: "Customer created successfully",
            customer
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Get all customers
const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find().sort({
            createdAt: -1
        });

        return res.status(200).json({
            success: true,
            count: customers.length,
            customers
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 3. Get customer by ID
const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            success: true,
            customer
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 4. Update customer
const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const previousValues = {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address
        };

        customer.set(req.body);
        await customer.save();

        await logActivity({
            req,
            action: "UPDATE",
            module: "Customers",
            description: `Updated customer ${customer.name}`,
            targetId: customer._id,
            targetName: customer.name,
            details: {
                previousValues,
                updatedFields: Object.keys(req.body)
            }
        });

        return res.status(200).json({
            success: true,
            message: "Customer updated successfully",
            customer
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 5. Delete customer
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        await Customer.findByIdAndDelete(req.params.id);

        await logActivity({
            req,
            action: "DELETE",
            module: "Customers",
            description: `Deleted customer ${customer.name}`,
            targetId: customer._id,
            targetName: customer.name,
            details: {
                email: customer.email
            }
        });

        return res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};
