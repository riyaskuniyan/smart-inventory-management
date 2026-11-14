
import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertTriangle,
  Package,
  History,
  X
} from "lucide-react";
import "./StockManagement.css";

const API = "http://localhost:5000/api";

function StockManagement() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [movementType, setMovementType] = useState("IN");

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    note: ""
  });

  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [productRes, historyRes, lowStockRes] =
        await Promise.all([
          api.get("/products"),
          api.get("/stock/history"),
          api.get("/stock/low-stock")
        ]);

      setProducts(productRes.data.products || []);
      setHistory(
        historyRes.data.history ||
        historyRes.data.movements ||
        historyRes.data.stockHistory ||
        []
      );
      setLowStock(
        lowStockRes.data.products ||
        lowStockRes.data.lowStockProducts ||
        []
      );
    } catch (err) {
      console.error("Stock data error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load stock information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (type) => {
    setMovementType(type);
    setForm({ productId: "", quantity: "", note: "" });
    setMessage("");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.productId || !form.quantity) {
      setError("Please select a product and enter quantity.");
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    try {
      const endpoint =
        movementType === "IN"
          ? `/stock/${form.productId}/in`
          : `/stock/${form.productId}/out`;

      const response = await api.post(endpoint, {
        quantity,
        note: form.note
      });

      setMessage(
        response.data.message || "Stock updated successfully."
      );

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Stock update failed. Please try again."
      );
    }
  };

  const totalUnits = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0
  );

  if (loading) {
    return (
      <div className="stock-loading">
        <RefreshCw className="spin" size={28} />
        <p>Loading stock management...</p>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="stock-heading">
        <div>
          <span className="stock-eyebrow">INVENTORY / STOCK</span>
          <h1>Stock Management</h1>
          <p>Track stock movements and manage inventory levels.</p>
        </div>

        <button
          className="stock-refresh"
          onClick={loadData}
          title="Refresh stock"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {message && <div className="stock-success">{message}</div>}
      {error && <div className="stock-error">{error}</div>}

      <div className="stock-stats">
        <motion.div className="stock-stat" whileHover={{ y: -4 }}>
          <Package size={25} />
          <div>
            <span>Total Products</span>
            <h2>{products.length}</h2>
          </div>
        </motion.div>

        <motion.div className="stock-stat" whileHover={{ y: -4 }}>
          <ArrowDownToLine size={25} />
          <div>
            <span>Total Stock Units</span>
            <h2>{totalUnits}</h2>
          </div>
        </motion.div>

        <motion.div className="stock-stat warning" whileHover={{ y: -4 }}>
          <AlertTriangle size={25} />
          <div>
            <span>Low Stock Products</span>
            <h2>{lowStock.length}</h2>
          </div>
        </motion.div>
      </div>

      <div className="stock-actions">
        <button
          className="stock-in-button"
          onClick={() => openModal("IN")}
        >
          <ArrowDownToLine size={19} />
          Stock In
        </button>

        <button
          className="stock-out-button"
          onClick={() => openModal("OUT")}
        >
          <ArrowUpFromLine size={19} />
          Stock Out
        </button>
      </div>

      <section className="stock-section">
        <div className="stock-section-title">
          <div>
            <h2>Low Stock Alerts</h2>
            <p>Products that need restocking</p>
          </div>
          <AlertTriangle size={22} />
        </div>

        {lowStock.length === 0 ? (
          <p className="stock-empty">No low-stock products. All good!</p>
        ) : (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.quantity}</td>
                    <td>{product.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stock-section">
        <div className="stock-section-title">
          <div>
            <h2>Stock Movement History</h2>
            <p>Recent stock in and stock out transactions</p>
          </div>
          <History size={22} />
        </div>

        {history.length === 0 ? (
          <p className="stock-empty">No stock movements found.</p>
        ) : (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Previous Stock</th>
                  <th>New Stock</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td>{item.product?.name || "Unknown Product"}</td>
                    <td>
                      <span className={
                        item.type === "IN" ? "movement-in" : "movement-out"
                      }>
                        {item.type}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.previousStock}</td>
                    <td>{item.newStock}</td>
                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="stock-modal-overlay">
          <div className="stock-modal">
            <button
              className="stock-modal-close"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              <X size={21} />
            </button>

            <h2>
              {movementType === "IN" ? "Add Stock" : "Remove Stock"}
            </h2>
            <p>
              {movementType === "IN"
                ? "Increase available product quantity."
                : "Decrease available product quantity."}
            </p>

            <form onSubmit={handleSubmit}>
              <label>Select Product</label>
              <select
                value={form.productId}
                onChange={(e) =>
                  setForm({ ...form, productId: e.target.value })
                }
                required
              >
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} (Available: {product.quantity})
                  </option>
                ))}
              </select>

              <label>Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Enter quantity"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                required
              />

              <label>Note</label>
              <textarea
                placeholder="Optional note..."
                value={form.note}
                onChange={(e) =>
                  setForm({ ...form, note: e.target.value })
                }
              />

              {error && <div className="stock-error">{error}</div>}

              <button className="stock-submit" type="submit">
                {movementType === "IN" ? "Confirm Stock In" : "Confirm Stock Out"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockManagement;
