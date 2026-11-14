
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/auditLogger");

// GET ALL USERS (ADMIN ONLY)
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get Users Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve users"
        });
    }
};

// CREATE MANAGER OR STAFF
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and role are required"
            });
        }

        if (!["manager", "staff"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Only manager and staff accounts can be created here"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            isActive: true
        });

        await logActivity({
            req,
            action: "CREATE",
            module: "Users",
            description: `Created ${role} account for ${user.name}`,
            targetId: user._id,
            targetName: user.name,
            details: {
                email: user.email,
                role: user.role
            }
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error("Create User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};

// UPDATE USER ROLE
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!["manager", "staff"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be manager or staff"
            });
        }

        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator roles cannot be changed here"
            });
        }

        const previousRole = user.role;

        user.role = role;
        await user.save();

        await logActivity({
            req,
            action: "UPDATE_ROLE",
            module: "Users",
            description: `Changed ${user.name}'s role from ${previousRole} to ${role}`,
            targetId: user._id,
            targetName: user.name,
            details: {
                previousRole,
                newRole: role
            }
        });

        return res.status(200).json({
            success: true,
            message: "User role updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error("Update Role Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update user role"
        });
    }
};

// ACTIVATE OR DEACTIVATE USER
const updateUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive must be true or false"
            });
        }

        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator accounts cannot be changed here"
            });
        }

        const previousStatus = user.isActive;

        user.isActive = isActive;
        await user.save();

        await logActivity({
            req,
            action: isActive ? "ACTIVATE" : "DEACTIVATE",
            module: "Users",
            description: `${isActive ? "Activated" : "Deactivated"} account for ${user.name}`,
            targetId: user._id,
            targetName: user.name,
            details: {
                previousStatus,
                newStatus: isActive
            }
        });

        return res.status(200).json({
            success: true,
            message: isActive
                ? "User activated successfully"
                : "User deactivated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error("Update Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update user status"
        });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUserRole,
    updateUserStatus
};
