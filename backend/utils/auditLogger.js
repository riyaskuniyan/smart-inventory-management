
const AuditLog = require("../models/AuditLog");

const logActivity = async ({
  req,
  action,
  module,
  description,
  targetId = null,
  targetName = "",
  details = {}
}) => {
  try {
    const user = req?.user;

    await AuditLog.create({
      user: user?.id || user?._id || null,
      userName: user?.name || "Unknown User",
      userRole: user?.role || "unknown",
      action,
      module,
      description,
      targetId: targetId ? String(targetId) : null,
      targetName,
      details,
      ipAddress:
        req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req?.socket?.remoteAddress ||
        ""
    });
  } catch (error) {
    // Logging errors should not interrupt the main application operation.
    console.error("Audit logging failed:", error.message);
  }
};

module.exports = logActivity;
