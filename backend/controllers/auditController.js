
const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      module,
      action,
      search,
      startDate,
      endDate
    } = req.query;

    const filter = {};

    if (module && module !== "all") {
      filter.module = module;
    }

    if (action) {
      filter.action = action;
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { targetName: { $regex: search, $options: "i" } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit)
        .lean(),

      AuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / pageLimit),
      logs
    });
  } catch (error) {
    console.error("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve audit logs."
    });
  }
};

const getAuditSummary = async (req, res) => {
  try {
    const [total, recent, modules] = await Promise.all([
      AuditLog.countDocuments(),

      AuditLog.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }),

      AuditLog.aggregate([
        {
          $group: {
            _id: "$module",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        total,
        last24Hours: recent,
        modules
      }
    });
  } catch (error) {
    console.error("Audit summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve audit summary."
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditSummary
};
