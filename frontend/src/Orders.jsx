
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ShoppingCart, Plus, Search, RefreshCw, X, Eye
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

    if (!customerId || validItems.some(
      (item) => !item.product || !Number.isInteger(item.quantity) || item.quantity <= 0
    )) {
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
    `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "—";

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
          <div className="orders-stat-icon"><ShoppingCart /></div>
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
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td><strong>{order.orderNumber || order._id}</strong></td>
                    <td>{order.customer?.name || "Customer"}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.items?.length || 0}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>
                      <span className={`order-status ${(order.status || "pending").toLowerCase()}`}>
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
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="orders-message">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    onChange={(e) => updateItem(index, "product", e.target.value)}
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
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
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

      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <h2>Order Details</h2>
                <p>{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}>
                <X />
              </button>
            </div>

            <p><strong>Customer:</strong> {selectedOrder.customer?.name || "Customer"}</p>
            <p><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</p>
            <p><strong>Status:</strong> {selectedOrder.status || "Pending"}</p>

            <div className="order-detail-items">
              {selectedOrder.items?.map((item, index) => (
                <div key={index}>
                  <span>{item.product?.name || "Product"} × {item.quantity}</span>
                  <strong>{formatPrice(item.subtotal ?? item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <h3 className="order-detail-total">
              Total: {formatPrice(selectedOrder.totalAmount)}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
