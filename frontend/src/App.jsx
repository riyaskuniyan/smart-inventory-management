
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";

import Login from "./Login";
import Products from "./Products";
import StockManagement from "./StockManagement";
import Customers from "./Customers";
import Orders from "./Orders";
import Reports from "./Reports";
import SettingsPage from "./Settings";
import AuditLogs from "./AuditLogs";

import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Users,
  ShoppingCart,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Menu,
  TrendingUp,
  Boxes,
  CircleAlert,
  AlertTriangle,
  Wallet,
  ChevronDown,
  MoreHorizontal,
  LogOut,
  Activity,
  X,
  UserRound,
  CheckCircle,
  Clock
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";


const rolePermissions = {
  admin: [
    "Dashboard",
    "Products",
    "Stock Management",
    "Customers",
    "Orders",
    "Reports",
    "Audit Logs",
    "Settings"
  ],
  manager: [
    "Dashboard",
    "Products",
    "Stock Management",
    "Customers",
    "Orders",
    "Reports"
  ],
  staff: [
    "Dashboard",
    "Products",
    "Stock Management",
    "Customers",
    "Orders"
  ]
};

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Products", icon: Package },
  { name: "Stock Management", icon: ArrowLeftRight },
  { name: "Customers", icon: Users },
  { name: "Orders", icon: ShoppingCart },
  { name: "Reports", icon: ChartNoAxesCombined },
  { name: "Audit Logs", icon: Activity },
  { name: "Settings", icon: Settings }
];

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState(() => {
    return sessionStorage.getItem("activePage") || "Dashboard";
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Topbar controls
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState({
    products: [],
    orders: []
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const userRole = String(currentUser?.role || "staff").toLowerCase();
  const allowedPages = rolePermissions[userRole] || rolePermissions.staff;

  const visibleNavItems = navItems.filter((item) =>
    allowedPages.includes(item.name)
  );

  const api = axios.create({
    baseURL: `${API}/api`,
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("token")}`
    }
  });

  // Apply saved theme globally.
  useEffect(() => {
    let savedSettings = {};

    try {
      savedSettings = JSON.parse(
        localStorage.getItem("stockflowSettings") || "{}"
      );
    } catch (error) {
      console.error("Unable to load saved theme:", error);
    }

    const selectedTheme = savedSettings.theme || "dark";

    const applyTheme = () => {
      const actualTheme =
        selectedTheme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : selectedTheme;

      document.documentElement.setAttribute("data-theme", actualTheme);

      document.documentElement.style.setProperty(
        "--accent",
        savedSettings.accent || "#14b8a6"
      );
    };

    applyTheme();

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const handleSystemChange = () => {
      if (selectedTheme === "system") applyTheme();
    };

    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, []);

  // Keep active page within the user's permissions.
  useEffect(() => {
    if (!allowedPages.includes(activePage)) {
      setActivePage("Dashboard");
      sessionStorage.setItem("activePage", "Dashboard");
    } else {
      sessionStorage.setItem("activePage", activePage);
    }
  }, [activePage, userRole]);

 const [dashboardStats, setDashboardStats] = useState(null);
const [dashboardOrders, setDashboardOrders] = useState([]);
const [loadingStats, setLoadingStats] = useState(true);
const [dashboardError, setDashboardError] = useState("");

  const navigateTo = (page) => {
    if (!allowedPages.includes(page)) return;

    setActivePage(page);
    setSearch("");
    setSearchOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("activePage");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");

    setDashboardStats(null);
    setNotifications([]);
    setSearch("");
    setActivePage("Dashboard");
    setCurrentUser(null);

    setSearchOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

  // Dashboard data.
useEffect(() => {
  if (!currentUser) {
    setLoadingStats(false);
    return;
  }

  let cancelled = false;

  const fetchDashboardData = async (showLoader = false) => {
    try {
      if (showLoader) setLoadingStats(true);

      setDashboardError("");

      const [dashboardResult, ordersResult] = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/orders")
      ]);

      if (cancelled) return;

      if (dashboardResult.status === "fulfilled") {
        if (dashboardResult.value.data.success) {
          setDashboardStats(dashboardResult.value.data.stats);
        }
      } else {
        const error = dashboardResult.reason;

        if (error.response?.status === 401) {
          handleLogout();
          return;
        }

        setDashboardError(
          error.response?.data?.message ||
          "Unable to load dashboard statistics."
        );
      }

      if (ordersResult.status === "fulfilled") {
        setDashboardOrders(ordersResult.value.data.orders || []);
      } else {
        const error = ordersResult.reason;

        if (error.response?.status === 401) {
          handleLogout();
          return;
        }

        console.error("Orders loading error:", error);
      }
    } catch (error) {
      console.error("Dashboard loading error:", error);

      if (!cancelled) {
        setDashboardError("Unable to load dashboard data.");
      }
    } finally {
      if (!cancelled && showLoader) {
        setLoadingStats(false);
      }
    }
  };

  fetchDashboardData(true);

  // Refresh dashboard data every 30 seconds.
  const refreshInterval = setInterval(() => {
    fetchDashboardData(false);
  }, 30000);

  return () => {
    cancelled = true;
    clearInterval(refreshInterval);
  };
}, [currentUser]);

  // Load actual low-stock notifications.
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);

      const response = await api.get("/stock/low-stock");

      const data = response.data;

      setNotifications(
        data.products ||
        data.lowStockProducts ||
        data.movements ||
        []
      );
    } catch (error) {
      console.error("Notification loading error:", error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Search products and orders.
  useEffect(() => {
    if (!currentUser || search.trim().length < 2) {
      setSearchResults({ products: [], orders: [] });
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const [productResult, orderResult] = await Promise.allSettled([
          api.get("/products", {
            params: { search: search.trim() }
          }),
          api.get("/orders")
        ]);

        if (cancelled) return;

        const foundProducts =
          productResult.status === "fulfilled"
            ? productResult.value.data.products || []
            : [];

        const allOrders =
          orderResult.status === "fulfilled"
            ? orderResult.value.data.orders || []
            : [];

        const query = search.trim().toLowerCase();

        const foundOrders = allOrders.filter((order) =>
          `${order.orderNumber || ""} ${
            order.customer?.name || ""
          } ${order.status || ""}`
            .toLowerCase()
            .includes(query)
        );

        setSearchResults({
          products: foundProducts.slice(0, 5),
          orders: foundOrders.slice(0, 5)
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, currentUser]);

  // Ctrl + K / Cmd + K opens search.
  useEffect(() => {
    const handleKeyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
        searchRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSearchResult = (page) => {
    navigateTo(page);
  };

  const stats = [
    {
      title: "Total Products",
      value: dashboardStats?.totalProducts ?? 0,
      icon: Package
    },
    {
      title: "Total Customers",
      value: dashboardStats?.totalCustomers ?? 0,
      icon: Users
    },
    {
      title: "Total Orders",
      value: dashboardStats?.totalOrders ?? 0,
      icon: ShoppingCart
    },
    {
      title: "Total Sales",
      value: `₹${Number(
        dashboardStats?.totalSales ?? 0
      ).toLocaleString("en-IN")}`,
      icon: Wallet
    }
  ];
const salesData = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (6 - index));

  const sales = dashboardOrders
    .filter((order) => {
      if (!order.createdAt) return false;

      const orderDate = new Date(order.createdAt);

      return (
        orderDate.getFullYear() === date.getFullYear() &&
        orderDate.getMonth() === date.getMonth() &&
        orderDate.getDate() === date.getDate()
      );
    })
    .reduce(
      (total, order) =>
        total + (Number(order.totalAmount) || 0),
      0
    );

  return {
    day: date.toLocaleDateString("en-IN", {
      weekday: "short"
    }),
    sales
  };
});

const recentOrders = [...dashboardOrders]
  .sort(
    (a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
  )
  .slice(0, 5);

const formatDashboardDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN")
    : "—";

const formatDashboardPrice = (amount) =>
  `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;

  const healthyProducts = dashboardStats
    ? Math.max(
        0,
        dashboardStats.totalProducts - dashboardStats.lowStockProducts
      )
    : null;

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const dashboardContent = (
    <>
      <motion.section
        className="welcome-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div>
          <span className="eyebrow">
            OVERVIEW / {activePage.toUpperCase()}
          </span>

          <h1>
            Welcome back, {currentUser.name}
            <span> ✦</span>
          </h1>

          <p>Here's what's happening with your inventory today.</p>
        </div>

        <div className="banner-art">▦</div>
      </motion.section>

      {dashboardError && (
        <div className="login-error">{dashboardError}</div>
      )}

      <section className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              className="stat-card glass-card"
              key={stat.title}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.12,
                duration: 0.5
              }}
              whileHover={{ y: -6, scale: 1.015 }}
            >
              <div className="stat-top">
                <div className="stat-icon">
                  <Icon size={21} />
                </div>

                <MoreHorizontal size={20} className="muted-icon" />
              </div>

              <p>{stat.title}</p>
              <h2>{loadingStats ? "..." : stat.value}</h2>

              <small className="positive">
                <TrendingUp size={13} />
                {loadingStats ? "Loading..." : "Live data"}
              </small>
            </motion.div>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <motion.div
          className="panel glass-card sales-panel"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PERFORMANCE</span>
              <h3>Sales Overview</h3>
            </div>

            <span className="select-button">Last 7 days</span>
          </div>

          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#22d3c5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3c5" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#ffffff12" vertical={false} />

                <XAxis
                  dataKey="day"
                  stroke="#8195a5"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#8195a5"
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#102b37",
                    border: "1px solid #24515b",
                    borderRadius: "12px",
                    color: "#fff"
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#22d3c5"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="panel glass-card inventory-panel"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <span className="eyebrow">INVENTORY HEALTH</span>
          <h3>Stock Summary</h3>

          <div className="inventory-visual">
            <div className="inventory-ring">
              <div>
                <strong>{healthyProducts ?? "..."}</strong>
                <small>Products above threshold</small>
              </div>
            </div>
          </div>

          <div className="legend">
            <span>
              <i className="dot cyan" />
              Products above threshold
              <b>{healthyProducts ?? "..."}</b>
            </span>

            <span>
              <i className="dot orange" />
              Low stock products
              <b>{dashboardStats?.lowStockProducts ?? "..."}</b>
            </span>
          </div>
        </motion.div>

        <motion.div
          className="panel glass-card orders-panel"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LATEST ACTIVITY</span>
              <h3>Recent Orders</h3>
            </div>

            <button
              className="text-button"
              onClick={() => navigateTo("Orders")}
            >
              View all ↗
            </button>
          </div>

          <div className="order-row order-header">
            <span>ORDER ID</span>
            <span>CUSTOMER</span>
            <span>AMOUNT</span>
            <span>STATUS</span>
          </div>

        {recentOrders.length === 0 ? (
  <p className="report-empty">
    {loadingStats ? "Loading recent orders..." : "No orders found yet."}
  </p>
) : (
  recentOrders.map((order) => (
    <div className="order-row" key={order._id}>
      <span className="order-id">
        {order.orderNumber || "—"}
      </span>

      <span className="order-customer">
        {order.customer?.name || "Unknown customer"}
      </span>

      <span className="order-amount">
        {formatDashboardPrice(order.totalAmount)}
      </span>

      <span>
        <span
          className={`order-status ${String(
            order.status || "pending"
          ).toLowerCase()}`}
        >
          {order.status || "Pending"}
        </span>
      </span>
    </div>
  ))
)}
        </motion.div>

        <motion.div
          className="panel glass-card alert-panel"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ATTENTION REQUIRED</span>
              <h3>Stock Alerts</h3>
            </div>

            <CircleAlert color="#f5a94c" />
          </div>

          {dashboardStats?.lowStockProducts > 0 ? (
            <div
              className="alert-content clickable-alert"
              onClick={() => navigateTo("Stock Management")}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  navigateTo("Stock Management");
                }
              }}
            >
              <div className="product-symbol"><Package /></div>

              <div>
                <strong>Low stock products</strong>
                <small>Click to check your inventory</small>
              </div>

              <b className="stock-number">
                {dashboardStats.lowStockProducts}
              </b>
            </div>
          ) : (
            <div className="alert-content">
              <div className="product-symbol"><CheckCircle /></div>

              <div>
                <strong>No low-stock alerts</strong>
                <small>Your inventory is above its thresholds.</small>
              </div>
            </div>
          )}

          <p className="alert-note">
            Stock alerts are based on your product low-stock thresholds.
          </p>
        </motion.div>
      </section>

      <footer>
        StockFlow <span>•</span> Smart Inventory Management System
      </footer>
    </>
  );

  let pageContent;

  if (activePage === "Dashboard") {
    pageContent = dashboardContent;
  } else if (activePage === "Products") {
    pageContent = <Products />;
  } else if (activePage === "Stock Management") {
    pageContent = <StockManagement />;
  } else if (activePage === "Customers") {
    pageContent = <Customers />;
  } else if (activePage === "Orders") {
    pageContent = <Orders />;
  } else if (activePage === "Reports") {
    pageContent = <Reports />;
  } else if (activePage === "Audit Logs" && userRole === "admin") {
    pageContent = <AuditLogs />;
  } else if (activePage === "Settings" && userRole === "admin") {
    pageContent = <SettingsPage currentUser={currentUser} />;
  } else {
    pageContent = dashboardContent;
  }

  const noSearchResults =
    search.trim().length >= 2 &&
    !searchLoading &&
    searchResults.products.length === 0 &&
    searchResults.orders.length === 0;

  return (
    <div className="app-layout">
      <motion.aside
        className={`sidebar ${sidebarOpen ? "" : "sidebar-closed"}`}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="brand">
          <div className="brand-icon"><Boxes /></div>

          {sidebarOpen && (
            <h2>Stock<span>Flow</span></h2>
          )}
        </div>

        {sidebarOpen && <p className="nav-label">MAIN MENU</p>}

        <nav>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => navigateTo(item.name)}
                title={item.name}
              >
                <Icon size={19} />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-bottom">
            <div className="upgrade-icon">✦</div>
            <h3>Manage smarter.</h3>
            <p>Your inventory, all in one place.</p>
          </div>
        )}
      </motion.aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen((previous) => !previous)}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <Menu />
          </button>

          {/* Search */}
          <div
            className="search-box topbar-search"
            ref={searchContainerRef}
          >
            <Search size={18} />

            <input
              ref={searchRef}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (searchResults.products.length) {
                    navigateTo("Products");
                  } else if (searchResults.orders.length) {
                    navigateTo("Orders");
                  }
                }
              }}
              placeholder="Search products, orders..."
              aria-label="Search products and orders"
            />

            {search ? (
              <button
                className="search-clear"
                onClick={() => {
                  setSearch("");
                  setSearchOpen(true);
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : (
              <span className="search-shortcut">Ctrl K</span>
            )}

            {searchOpen && search.trim().length >= 2 && (
              <div className="topbar-dropdown search-dropdown">
                {searchLoading && (
                  <p className="dropdown-message">Searching...</p>
                )}

                {!searchLoading && searchResults.products.length > 0 && (
                  <>
                    <p className="dropdown-section-title">PRODUCTS</p>

                    {searchResults.products.map((product) => (
                      <button
                        className="search-result"
                        key={product._id}
                        onClick={() => handleSearchResult("Products")}
                      >
                        <Package size={17} />
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            SKU: {product.sku || "—"} · Stock: {product.quantity ?? 0}
                          </small>
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {!searchLoading && searchResults.orders.length > 0 && (
                  <>
                    <p className="dropdown-section-title">ORDERS</p>

                    {searchResults.orders.map((order) => (
                      <button
                        className="search-result"
                        key={order._id}
                        onClick={() => handleSearchResult("Orders")}
                      >
                        <ShoppingCart size={17} />
                        <span>
                          <strong>{order.orderNumber}</strong>
                          <small>
                            {order.customer?.name || "Customer"} · ₹
                            {Number(order.totalAmount || 0).toLocaleString("en-IN")}
                          </small>
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {noSearchResults && (
                  <p className="dropdown-message">No matching products or orders found.</p>
                )}
              </div>
            )}
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <div className="topbar-control" ref={notificationRef}>
              <button
                className="icon-button notification"
                onClick={() => {
                  setNotificationOpen((previous) => !previous);
                  setProfileOpen(false);
                  if (!notificationOpen) fetchNotifications();
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {notifications.length > 0 && <i />}
              </button>

              {notificationOpen && (
                <div className="topbar-dropdown notification-dropdown">
                  <div className="dropdown-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>{notifications.length} low-stock alerts</small>
                    </div>

                    <button
                      className="dropdown-icon-button"
                      onClick={fetchNotifications}
                      title="Refresh notifications"
                    >
                      <Clock size={17} />
                    </button>
                  </div>

                  {notificationsLoading ? (
                    <p className="dropdown-message">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <CheckCircle size={25} />
                      <strong>You're all caught up!</strong>
                      <small>No low-stock alerts found.</small>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((product) => (
                        <button
                          className="notification-item"
                          key={product._id}
                          onClick={() => navigateTo("Stock Management")}
                        >
                          <span className="notification-symbol">
                            <AlertTriangle size={18} />
                          </span>
                          <span>
                            <strong>{product.name || "Low stock product"}</strong>
                            <small>
                              Available: {product.quantity ?? 0} · Threshold:{" "}
                              {product.lowStockThreshold ?? "—"}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    className="dropdown-footer-button"
                    onClick={() => navigateTo("Stock Management")}
                  >
                    Open Stock Management
                  </button>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="topbar-control" ref={profileRef}>
              <button
                className="profile profile-button"
                onClick={() => {
                  setProfileOpen((previous) => !previous);
                  setNotificationOpen(false);
                  setSearchOpen(false);
                }}
                aria-label="Open account menu"
                aria-expanded={profileOpen}
              >
                <div className="avatar">
                  {currentUser.name?.charAt(0).toUpperCase() || "U"}
                </div>

                <span className="profile-text">
                  <strong>{currentUser.name}</strong>
                  <small>{currentUser.role}</small>
                </span>

                <ChevronDown size={16} />
              </button>

              {profileOpen && (
                <div className="topbar-dropdown profile-dropdown">
                  <div className="profile-dropdown-user">
                    <div className="avatar">
                      {currentUser.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <strong>{currentUser.name}</strong>
                      <small>{currentUser.email || currentUser.role}</small>
                    </div>
                  </div>

                  <div className="profile-role">
                    <UserRound size={15} />
                    Account role: {currentUser.role}
                  </div>

                  {allowedPages.includes("Settings") && (
                    <button
                      className="profile-menu-item"
                      onClick={() => navigateTo("Settings")}
                    >
                      <Settings size={17} />
                      Settings
                    </button>
                  )}

                  <button
                    className="profile-menu-item logout-item"
                    onClick={handleLogout}
                  >
                    <LogOut size={17} />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              className="icon-button logout-button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {pageContent}
      </main>
    </div>
  );
}

export default App;
