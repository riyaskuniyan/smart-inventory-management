
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    userName: {
      type: String,
      default: "System"
    },

    userRole: {
      type: String,
      default: "system"
    },

    action: {
      type: String,
      required: true,
      trim: true
    },

    module: {
      type: String,
      required: true,
      enum: [
        "Authentication",
        "Products",
        "Stock",
        "Customers",
        "Orders",
        "Users",
        "Settings"
      ]
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    targetId: {
      type: String,
      default: null
    },

    targetName: {
      type: String,
      default: ""
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    ipAddress: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
