
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
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText
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
    `₹${(Number(amount) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "—";

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

  const csvEscape = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCSV = () => {
    const rows = [
      ["SMART INVENTORY - BUSINESS REPORT"],
      ["Generated Date", new Date().toLocaleString("en-IN")],
      [],
      ["BUSINESS SUMMARY"],
      ["Total Sales", stats.totalSales || 0],
      ["Total Orders", stats.totalOrders || 0],
      ["Total Products", stats.totalProducts || 0],
      ["Low Stock Products", stats.lowStockProducts || 0],
      [],
      ["ORDERS REPORT"],
      ["Order Number", "Customer", "Date", "Status", "Total Amount"],
      ...orders.map((order) => [
        order.orderNumber || "",
        order.customer?.name || "Walk-in Customer",
        formatDate(order.createdAt),
        order.status || "",
        Number(order.totalAmount) || 0
      ]),
      [],
      ["PRODUCT INVENTORY REPORT"],
      ["Product", "SKU", "Barcode", "Category", "Price", "Quantity", "Threshold"],
      ...products.map((product) => [
        product.name,
        product.sku,
        product.barcode || "",
        product.category || "",
        Number(product.price) || 0,
        Number(product.quantity) || 0,
        Number(product.lowStockThreshold) || 0
      ]),
      [],
      ["LOW STOCK REPORT"],
      ["Product", "SKU", "Available Stock", "Threshold"],
      ...lowStockProducts.map((product) => [
        product.name,
        product.sku,
        product.quantity,
        product.lowStockThreshold
      ])
    ];

    const csvContent = "\uFEFF" + rows
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Smart-Inventory-Report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow popups to download the PDF report.");
      return;
    }

    const orderRows = orders.map((order) => `
      <tr>
        <td>${escapeHTML(order.orderNumber || "—")}</td>
        <td>${escapeHTML(order.customer?.name || "Walk-in Customer")}</td>
        <td>${escapeHTML(formatDate(order.createdAt))}</td>
        <td>${escapeHTML(order.status || "—")}</td>
        <td>${escapeHTML(formatPrice(order.totalAmount))}</td>
      </tr>
    `).join("");

    const productRows = products.map((product) => `
      <tr>
        <td>${escapeHTML(product.name)}</td>
        <td>${escapeHTML(product.sku)}</td>
        <td>${escapeHTML(product.category || "—")}</td>
        <td>${escapeHTML(product.quantity)}</td>
        <td>${escapeHTML(product.lowStockThreshold)}</td>
      </tr>
    `).join("");

    const lowStockRows = lowStockProducts.map((product) => `
      <tr>
        <td>${escapeHTML(product.name)}</td>
        <td>${escapeHTML(product.sku)}</td>
        <td>${escapeHTML(product.quantity)}</td>
        <td>${escapeHTML(product.lowStockThreshold)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Smart Inventory Business Report</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: #1e293b;
            padding: 25px;
            font-size: 12px;
          }
          h1 { color: #087e62; margin-bottom: 5px; }
          h2 {
            margin-top: 28px;
            padding-bottom: 8px;
            border-bottom: 2px solid #14b88a;
          }
          .date { color: #64748b; margin-bottom: 25px; }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }
          .summary div {
            padding: 15px;
            border: 1px solid #dbe3ed;
            border-radius: 8px;
          }
          .summary span { color: #64748b; }
          .summary strong {
            display: block;
            font-size: 18px;
            margin-top: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #dbe3ed;
            padding: 9px;
            text-align: left;
          }
          th { background: #eaf7f2; }
          .footer {
            margin-top: 35px;
            text-align: center;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
            h2 { break-after: avoid; }
            tr { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Smart Inventory</h1>
        <p>Business Performance & Inventory Report</p>
        <p class="date">Generated: ${escapeHTML(new Date().toLocaleString("en-IN"))}</p>

        <h2>Business Summary</h2>
        <div class="summary">
          <div><span>Total Sales</span><strong>${escapeHTML(formatPrice(stats.totalSales))}</strong></div>
          <div><span>Total Orders</span><strong>${escapeHTML(stats.totalOrders || 0)}</strong></div>
          <div><span>Total Products</span><strong>${escapeHTML(stats.totalProducts || 0)}</strong></div>
          <div><span>Low Stock</span><strong>${escapeHTML(stats.lowStockProducts || 0)}</strong></div>
        </div>

        <h2>Orders Report</h2>
        <table>
          <thead>
            <tr><th>Order Number</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr>
          </thead>
          <tbody>${orderRows || "<tr><td colspan='5'>No orders available</td></tr>"}</tbody>
        </table>

        <h2>Product Inventory</h2>
        <table>
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Category</th><th>Quantity</th><th>Threshold</th></tr>
          </thead>
          <tbody>${productRows || "<tr><td colspan='5'>No products available</td></tr>"}</tbody>
        </table>

        <h2>Low Stock Report</h2>
        <table>
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Available Stock</th><th>Threshold</th></tr>
          </thead>
          <tbody>${lowStockRows || "<tr><td colspan='4'>All products have sufficient stock</td></tr>"}</tbody>
        </table>

        <p class="footer">Generated by Smart Inventory Management System</p>

        <script>
          window.onload = () => {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

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

        <div className="reports-actions">
          <button className="reports-refresh" onClick={fetchReports}>
            <RefreshCw size={17} /> Refresh Reports
          </button>

          <button className="reports-export csv" onClick={downloadCSV}>
            <FileSpreadsheet size={17} /> Export CSV
          </button>

          <button className="reports-export pdf" onClick={downloadPDF}>
            <FileText size={17} /> Export PDF
          </button>
        </div>
      </div>

      <div className="reports-stats">
        <div className="report-stat-card">
          <div className="report-stat-icon sales"><TrendingUp /></div>
          <div>
            <span>Total Sales</span>
            <h2>{formatPrice(stats.totalSales)}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon orders"><ShoppingCart /></div>
          <div>
            <span>Total Orders</span>
            <h2>{stats.totalOrders || 0}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon products"><Package /></div>
          <div>
            <span>Total Products</span>
            <h2>{stats.totalProducts || 0}</h2>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon alerts"><AlertTriangle /></div>
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
