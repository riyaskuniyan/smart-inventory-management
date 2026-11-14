
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  X,
  Eye,
  Printer
} from "lucide-react";
import "./Orders.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ product: "", quantity: 1 }]);

  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: `${API}/api`,
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const [orderRes, customerRes, productRes] = await Promise.all([
        api.get("/orders"),
        api.get("/customers"),
        api.get("/products")
      ]);

      setOrders(orderRes.data.orders || []);
      setCustomers(customerRes.data.customers || []);
      setProducts(productRes.data.products || []);
    } catch (error) {
      console.error("Orders loading error:", error);
      alert(error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { product: "", quantity: 1 }]);
  };

  const updateItem = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const createOrder = async (e) => {
    e.preventDefault();

    const validItems = items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity)
    }));

    if (
      !customerId ||
      validItems.some(
        (item) =>
          !item.product ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
      )
    ) {
      alert("Please select a customer and valid products and quantities.");
      return;
    }

    try {
      await api.post("/orders", {
        customer: customerId,
        items: validItems
      });

      alert("Order created successfully!");
      setShowModal(false);
      setCustomerId("");
      setItems([{ product: "", quantity: 1 }]);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create order");
    }
  };

  const filteredOrders = orders.filter((order) =>
    `${order.orderNumber || ""} ${order.customer?.name || ""} ${order.status || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalSales = orders.reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0
  );

  const formatPrice = (amount) =>
    `₹${(Number(amount) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : "—";

  // Escape values before inserting database data into the invoice HTML.
  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  // Generate and print a professional invoice.
  const printInvoice = (order) => {
    if (!order) return;

    const customer = order.customer || {};
    const orderItems = order.items || [];

    const itemRows = orderItems.map((item, index) => {
      const productName =
        typeof item.product === "object"
          ? item.product?.name || "Product"
          : "Product";

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.price) || 0;

      const subtotal =
        item.subtotal !== undefined && item.subtotal !== null
          ? Number(item.subtotal)
          : unitPrice * quantity;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(productName)}</td>
          <td class="center">${quantity}</td>
          <td class="right">${formatPrice(unitPrice)}</td>
          <td class="right">${formatPrice(subtotal)}</td>
        </tr>
      `;
    }).join("");

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${escapeHTML(order.orderNumber)}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #17212b;
            margin: 0;
            padding: 35px;
            background: #fff;
          }

          .invoice {
            max-width: 850px;
            margin: auto;
          }

          .top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0d9488;
            padding-bottom: 22px;
          }

          .brand {
            font-size: 29px;
            font-weight: 800;
            color: #0d9488;
            margin-bottom: 6px;
          }

          .subtitle {
            color: #64748b;
            font-size: 12px;
          }

          .invoice-title {
            text-align: right;
          }

          .invoice-title h1 {
            font-size: 27px;
            margin: 0 0 8px;
            letter-spacing: 2px;
          }

          .invoice-title p {
            font-size: 12px;
            color: #64748b;
            margin: 4px 0;
          }

          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 32px 0;
          }

          .details h3 {
            font-size: 11px;
            color: #0d9488;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }

          .details p {
            font-size: 13px;
            margin: 6px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
          }

          th {
            background: #0f766e;
            color: white;
            text-align: left;
            padding: 13px 10px;
            font-size: 11px;
          }

          td {
            padding: 13px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
          }

          .center {
            text-align: center;
          }

          .right {
            text-align: right;
          }

          .total-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 25px;
          }

          .total-box {
            width: 260px;
            border-top: 2px solid #0d9488;
            padding-top: 14px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 12px;
          }

          .grand-total {
            font-size: 19px;
            font-weight: 800;
            color: #0f766e;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
          }

          .status {
            display: inline-block;
            background: #ecfdf5;
            color: #047857;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            text-transform: capitalize;
          }

          .footer {
            border-top: 1px solid #e2e8f0;
            text-align: center;
            padding-top: 20px;
            margin-top: 55px;
            color: #64748b;
            font-size: 12px;
          }

          .print-button {
            display: block;
            margin: 25px auto;
            padding: 12px 25px;
            border: none;
            border-radius: 7px;
            background: #0d9488;
            color: white;
            font-weight: bold;
            cursor: pointer;
          }

          @media print {
            body {
              padding: 0;
            }

            .print-button {
              display: none;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            th {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>

      <body>
        <div class="invoice">

          <div class="top">
            <div>
              <div class="brand">StockFlow</div>
              <div class="subtitle">
                Smart Inventory & Order Management
              </div>
            </div>

            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p><strong>Invoice:</strong> ${escapeHTML(order.orderNumber || order._id)}</p>
              <p><strong>Date:</strong> ${escapeHTML(formatDate(order.createdAt))}</p>
              <p><strong>Status:</strong> <span class="status">${escapeHTML(order.status || "Pending")}</span></p>
            </div>
          </div>

          <div class="details">
            <div>
              <h3>BILL TO</h3>
              <p><strong>${escapeHTML(customer.name || "Customer")}</strong></p>
              ${customer.email ? `<p>${escapeHTML(customer.email)}</p>` : ""}
              ${customer.phone ? `<p>${escapeHTML(customer.phone)}</p>` : ""}
              ${customer.address ? `<p>${escapeHTML(customer.address)}</p>` : ""}
            </div>

            <div>
              <h3>ORDER INFORMATION</h3>
              <p><strong>Order Number:</strong> ${escapeHTML(order.orderNumber || order._id)}</p>
              <p><strong>Order Date:</strong> ${escapeHTML(formatDate(order.createdAt))}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th class="center">Qty</th>
                <th class="right">Unit Price</th>
                <th class="right">Amount</th>
              </tr>
            </thead>

            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Subtotal</span>
                <strong>${formatPrice(order.totalAmount)}</strong>
              </div>

              <div class="total-row grand-total">
                <span>Grand Total</span>
                <span>${formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>Generated by StockFlow Inventory Management System</p>
          </div>

          <button class="print-button" onclick="window.print()">
            Print / Save as PDF
          </button>

        </div>
      </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=950,height=750"
    );

    if (!printWindow) {
      alert("Please allow pop-ups in your browser to print the invoice.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  return (
    <div className="orders-page">

      <div className="orders-header">
        <div>
          <h1>Orders</h1>
          <p>Create and manage customer orders</p>
        </div>

        <div className="orders-actions">
          <button className="orders-refresh" onClick={fetchData}>
            <RefreshCw size={17} /> Refresh
          </button>

          <button className="orders-add" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Order
          </button>
        </div>
      </div>

      <div className="orders-stats">
        <div className="orders-stat-card">
          <div className="orders-stat-icon">
            <ShoppingCart />
          </div>
          <div>
            <span>Total Orders</span>
            <h2>{orders.length}</h2>
          </div>
        </div>

        <div className="orders-stat-card">
          <div className="orders-stat-icon sales-icon">₹</div>
          <div>
            <span>Total Order Value</span>
            <h2>{formatPrice(totalSales)}</h2>
          </div>
        </div>
      </div>

      <div className="orders-table-card">
        <div className="orders-table-header">
          <div>
            <h3>Order History</h3>
            <p>All customer orders</p>
          </div>

          <div className="orders-search">
            <Search size={18} />
            <input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="orders-message">Loading orders...</p>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Bill</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <strong>{order.orderNumber || order._id}</strong>
                    </td>

                    <td>{order.customer?.name || "Customer"}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.items?.length || 0}</td>
                    <td>{formatPrice(order.totalAmount)}</td>

                    <td>
                      <span
                        className={`order-status ${(order.status || "pending").toLowerCase()}`}
                      >
                        {order.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="order-view"
                        onClick={() => setSelectedOrder(order)}
                        title="View order"
                      >
                        <Eye size={17} />
                      </button>
                    </td>

                    <td>
                      <button
                        className="order-view"
                        onClick={() => printInvoice(order)}
                        title="Print bill / Save as PDF"
                      >
                        <Printer size={17} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="orders-message">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {showModal && (
        <div className="order-modal-overlay">
          <motion.div
            className="order-modal"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="order-modal-header">
              <div>
                <h2>Create Order</h2>
                <p>Select a customer and add products</p>
              </div>

              <button type="button" onClick={() => setShowModal(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={createOrder}>
              <label>Customer *</label>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>

              <div className="order-items-heading">
                <label>Products *</label>

                <button type="button" onClick={addItem}>
                  <Plus size={15} /> Add Item
                </button>
              </div>

              {items.map((item, index) => (
                <div className="order-item-row" key={index}>
                  <select
                    value={item.product}
                    onChange={(e) =>
                      updateItem(index, "product", e.target.value)
                    }
                    required
                  >
                    <option value="">Select product</option>

                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} — Stock: {product.quantity}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="order-remove-item"
                    onClick={() => removeItem(index)}
                    title="Remove item"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}

              <div className="order-modal-actions">
                <button
                  type="button"
                  className="order-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="order-save">
                  Create Order
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div
          className="order-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-modal-header">
              <div>
                <h2>Order Details</h2>
                <p>{selectedOrder.orderNumber}</p>
              </div>

              <button onClick={() => setSelectedOrder(null)}>
                <X />
              </button>
            </div>

            <p>
              <strong>Customer:</strong>{" "}
              {selectedOrder.customer?.name || "Customer"}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {formatDate(selectedOrder.createdAt)}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {selectedOrder.status || "Pending"}
            </p>

            <div className="order-detail-items">
              {selectedOrder.items?.map((item, index) => (
                <div key={index}>
                  <span>
                    {item.product?.name || "Product"} × {item.quantity}
                  </span>

                  <strong>
                    {formatPrice(
                      item.subtotal ?? item.price * item.quantity
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <h3 className="order-detail-total">
              Total: {formatPrice(selectedOrder.totalAmount)}
            </h3>

            <button
              type="button"
              className="orders-add"
              style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
              onClick={() => printInvoice(selectedOrder)}
            >
              <Printer size={17} /> Print Bill / Save as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
