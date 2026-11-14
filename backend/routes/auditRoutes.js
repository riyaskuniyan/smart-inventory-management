
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAuditLogs,
  getAuditSummary
} = require("../controllers/auditController");

// Admin-only audit access
router.use(authMiddleware);
router.use(authorizeRoles("admin"));

router.get("/", getAuditLogs);
router.get("/summary", getAuditSummary);

module.exports = router;
