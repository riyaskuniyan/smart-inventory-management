
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCw,
  Search,
  Clock,
  Users,
  Package,
  ShoppingCart,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  AlertCircle
} from "lucide-react";
import "./AuditLogs.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const modules = [
  "All",
  "Authentication",
  "Products",
  "Stock",
  "Customers",
  "Orders",
  "Users",
  "Settings"
];

const actions = [
  "All",
  "CREATE",
  "UPDATE",
  "DELETE",
  "STOCK_IN",
  "STOCK_OUT",
  "UPDATE_ROLE",
  "ACTIVATE",
  "DEACTIVATE"
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [module, setModule] = useState("All");
  const [action, setAction] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const token = sessionStorage.getItem("token");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 10
      };

      if (search.trim()) params.search = search.trim();
      if (module !== "All") params.module = module;
      if (action !== "All") params.action = action;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [logsResponse, summaryResponse] = await Promise.all([
        axios.get(`${API}/api/audit`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
        axios.get(`${API}/api/audit/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (logsResponse.data.success) {
        setLogs(logsResponse.data.logs || []);
        setTotalPages(logsResponse.data.totalPages || 1);
        setTotalLogs(logsResponse.data.total || 0);
      }

      if (summaryResponse.data.success) {
        setSummary(
          summaryResponse.data.summary ||
          summaryResponse.data.stats ||
          summaryResponse.data
        );
      }
    } catch (err) {
      console.error("Audit Logs Error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to load audit logs. Please check your connection and permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, module, action, startDate, endDate, token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionClass = (value = "") => {
    const normalized = value.toUpperCase();

    if (normalized.includes("CREATE") || normalized === "STOCK_IN" || normalized === "ACTIVATE") {
      return "audit-success";
    }

    if (normalized.includes("DELETE") || normalized === "STOCK_OUT" || normalized === "DEACTIVATE") {
      return "audit-danger";
    }

    return "audit-info";
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const clearFilters = () => {
    setSearch("");
    setModule("All");
    setAction("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const totalActivities = summary.total ?? summary.totalLogs ?? totalLogs;
  const recentActivities = summary.last24Hours ?? summary.last24HoursCount ?? 0;

  return (
    <div className="audit-page">
      <motion.div
        className="audit-header"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="audit-eyebrow">SYSTEM MONITORING</span>
          <h1>Audit Logs</h1>
          <p>Track user activities and changes across StockFlow.</p>
        </div>

        <button className="audit-refresh" onClick={fetchLogs}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </motion.div>

      <div className="audit-stats">
        <div className="audit-stat-card">
          <div className="audit-stat-icon purple">
            <Activity />
          </div>
          <div>
            <span>Total Activities</span>
            <h2>{totalActivities}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon cyan">
            <Clock />
          </div>
          <div>
            <span>Last 24 Hours</span>
            <h2>{recentActivities}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon orange">
            <Filter />
          </div>
          <div>
            <span>Activities Shown</span>
            <h2>{logs.length}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon green">
            <Users />
          </div>
          <div>
            <span>Current Page</span>
            <h2>{page} / {totalPages}</h2>
          </div>
        </div>
      </div>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <h3>Activity History</h3>
            <p>Review and filter recorded system activities.</p>
          </div>
          <Activity size={22} />
        </div>

        <div className="audit-filters">
          <div className="audit-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search user or activity..."
            />
          </div>

          <select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
          >
            {modules.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Modules" : item}
              </option>
            ))}
          </select>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            {actions.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Actions" : item.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <button className="audit-clear" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className="audit-date-filters">
          <label>
            <CalendarDays size={15} />
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            <CalendarDays size={15} />
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {error && (
          <div className="audit-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>ACTIVITY</th>
                <th>MODULE</th>
                <th>TARGET</th>
                <th>DATE & TIME</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    Loading activity history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    No audit activities found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="audit-user">
                        <div className="audit-avatar">
                          {(log.user?.name || log.userName || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {log.user?.name || log.userName || "Unknown User"}
                          </strong>
                          <small>
                            {log.user?.role || log.userRole || "Unknown"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`audit-action ${getActionClass(log.action)}`}>
                        {String(log.action || "ACTIVITY").replaceAll("_", " ")}
                      </span>
                      <p className="audit-description">
                        {log.description}
                      </p>
                    </td>

                    <td>
                      <span className="audit-module">
                        {log.module}
                      </span>
                    </td>

                    <td>
                      <strong className="audit-target">
                        {log.targetName || "—"}
                      </strong>
                    </td>

                    <td className="audit-date">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-pagination">
          <span>
            Showing {logs.length} of {totalLogs} activities
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={17} />
            </button>

            <strong>{page}</strong>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditLogs;
