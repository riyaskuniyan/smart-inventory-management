
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import "./Reports.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COLORS = ["#14b88a", "#36a9d6", "#f0b44c", "#a78bfa", "#f07878"];

const Reports = () => {
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: `${API}/api`,
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchReports = async () => {
    try {
      setLoading(true);

      const [dashboardRes, productsRes, ordersRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/products"),
        api.get("/orders")
      ]);

      setStats(dashboardRes.data.stats || {});
      setProducts(productsRes.data.products || []);
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error("Reports loading error:", error);
      alert(error.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatPrice = (amount) =>
    `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;

  const salesByDate = orders.reduce((result, order) => {
    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short"
        })
      : "Unknown";

    const existing = result.find((item) => item.date === date);

    if (existing) {
      existing.sales += Number(order.totalAmount) || 0;
    } else {
      result.push({
        date,
        sales: Number(order.totalAmount) || 0
      });
    }

    return result;
  }, []).slice(-7);

  const categoryData = products.reduce((result, product) => {
    const category = product.category || "Uncategorized";
    const existing = result.find((item) => item.name === category);

    if (existing) {
      existing.value += Number(product.quantity) || 0;
    } else {
      result.push({
        name: category,
        value: Number(product.quantity) || 0
      });
    }

    return result;
  }, []);

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity) <= Number(product.lowStockThreshold)
  );

  if (loading) {
    return <div className="reports-loading">Loading reports...</div>;
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Track your business performance and inventory</p>
        </div>

        <button className="reports-refresh" onClick={fetchReports}>
          <RefreshCw size={17} /> Refresh Reports
        </button>
      </div>

      <div className="reports-stats">
        <div className="report-stat-card">
          <div className="report-stat-icon sales">
            <TrendingUp />
          </div>
          <div>
            <span>Total Sales</span>
            <h2>{formatPrice(stats.totalSales)}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon orders">
            <ShoppingCart />
          </div>
          <div>
            <span>Total Orders</span>
            <h2>{stats.totalOrders || 0}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon products">
            <Package />
          </div>
          <div>
            <span>Total Products</span>
            <h2>{stats.totalProducts || 0}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon alerts">
            <AlertTriangle />
          </div>
          <div>
            <span>Low Stock Products</span>
            <h2>{stats.lowStockProducts || 0}</h2>
          </div>
        </div>
      </div>

      <div className="reports-chart-grid">
        <div className="report-chart-card">
          <div className="report-chart-heading">
            <h3>Sales Overview</h3>
            <p>Sales from recent orders</p>
          </div>

          {salesByDate.length === 0 ? (
            <p className="report-empty">No sales data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#25443d" />
                <XAxis dataKey="date" stroke="#8da69e" />
                <YAxis stroke="#8da69e" />
                <Tooltip
                  formatter={(value) => formatPrice(value)}
                  contentStyle={{
                    background: "#102622",
                    border: "1px solid #28544a",
                    borderRadius: "8px",
                    color: "#e8f5f2"
                  }}
                />
                <Bar dataKey="sales" fill="#14b88a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="report-chart-card">
          <div className="report-chart-heading">
            <h3>Inventory by Category</h3>
            <p>Available stock units by category</p>
          </div>

          {categoryData.length === 0 ? (
            <p className="report-empty">No inventory data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#102622",
                    border: "1px solid #28544a",
                    borderRadius: "8px",
                    color: "#e8f5f2"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="report-bottom-card">
        <div className="report-chart-heading">
          <h3>Low Stock Report</h3>
          <p>Products that need restocking</p>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="report-empty">All products have sufficient stock.</p>
        ) : (
          <div className="report-low-stock-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available Stock</th>
                  <th>Low Stock Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td className="report-warning">{product.quantity}</td>
                    <td>{product.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
