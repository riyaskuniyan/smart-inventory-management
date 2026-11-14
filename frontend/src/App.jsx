
import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Login from "./Login";
import Products from "./Products";
import StockManagement from "./StockManagement";
import Customers from "./Customers";
import Orders from "./Orders";
import Reports from "./Reports";


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
  Wallet,
  ChevronDown,
  MoreHorizontal,
  LogOut
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

const salesData = [
  { day: "Mon", sales: 400 },
  { day: "Tue", sales: 650 },
  { day: "Wed", sales: 500 },
  { day: "Thu", sales: 900 },
  { day: "Fri", sales: 700 },
  { day: "Sat", sales: 1100 },
  { day: "Sun", sales: 950 }
];

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Products", icon: Package },
  { name: "Stock Management", icon: ArrowLeftRight },
  { name: "Customers", icon: Users },
  { name: "Orders", icon: ShoppingCart },
  { name: "Reports", icon: ChartNoAxesCombined },
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

  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    setDashboardStats(null);
    setActivePage("Dashboard");
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!currentUser) {
      setLoadingStats(false);
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        setLoadingStats(true);
        setDashboardError("");

        const token = sessionStorage.getItem("token");

        const response = await axios.get(`${API}/api/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setDashboardStats(response.data.stats);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
          setCurrentUser(null);
          return;
        }

        console.error(
          "Dashboard API Error:",
          error.response?.data || error.message
        );

        setDashboardError(
          error.response?.data?.message ||
            "Unable to load dashboard statistics."
        );
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [currentUser]);

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

            <button className="select-button">
              Last 7 days
              <ChevronDown size={15} />
            </button>
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
                    <stop
                      offset="0%"
                      stopColor="#22d3c5"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="#22d3c5"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#ffffff12"
                  vertical={false}
                />

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
              onClick={() => setActivePage("Orders")}
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

          <div className="order-row">
            <span>#179446</span>
            <span>Arun Kumar</span>
            <strong>₹1,198</strong>
            <span className="status pending">Pending</span>
          </div>

          <div className="order-row">
            <span>#179442</span>
            <span>Arun Kumar</span>
            <strong>₹1,198</strong>
            <span className="status pending">Pending</span>
          </div>
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
            <div className="alert-content">
              <div className="product-symbol">
                <Package />
              </div>

              <div>
                <strong>Low stock products</strong>
                <small>Check your inventory</small>
              </div>

              <b className="stock-number">
                {dashboardStats.lowStockProducts}
              </b>
            </div>
          ) : (
            <div className="alert-content">
              <div className="product-symbol">
                <Package />
              </div>

              <div>
                <strong>No low-stock alerts</strong>
                <small>
                  Your inventory is above its thresholds.
                </small>
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

  const comingSoonContent = (
    <div className="panel glass-card" style={{ padding: 32 }}>
      <h2>{activePage}</h2>
      <p>This page is coming soon.</p>
    </div>
  );

  // PAGE SELECTION
  let pageContent;

  if (activePage === "Dashboard") {
    pageContent = dashboardContent;
  } else if (activePage === "Products") {
    pageContent = <Products />;
  } else if (activePage === "Stock Management") {
    pageContent = <StockManagement />;
  }else if (activePage === "Customers") {
  pageContent = <Customers />;
  } else if (activePage === "Orders") {
  pageContent = <Orders />;
  }else if (activePage === "Reports") {
  pageContent = <Reports />;
  }else {
    pageContent = comingSoonContent;
  }

  return (
    <div className="app-layout">
      <motion.aside
        className={`sidebar ${
          sidebarOpen ? "" : "sidebar-closed"
        }`}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="brand">
          <div className="brand-icon">
            <Boxes />
          </div>

          {sidebarOpen && (
            <h2>
              Stock<span>Flow</span>
            </h2>
          )}
        </div>

        <p className="nav-label">MAIN MENU</p>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => setActivePage(item.name)}
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
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu />
          </button>

          <div className="search-box">
            <Search size={18} />
            <input placeholder="Search products, orders..." />
            <span>⌘ K</span>
          </div>

          <div className="topbar-right">
            <button className="icon-button notification">
              <Bell size={20} />
              <i />
            </button>

            <div className="profile">
              <div className="avatar">
                {currentUser.name?.charAt(0).toUpperCase() || "U"}
              </div>

              <div>
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role}</small>
              </div>

              <ChevronDown size={16} />
            </div>

            <button
              className="icon-button"
              onClick={handleLogout}
              title="Log out"
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
