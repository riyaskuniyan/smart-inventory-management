
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Barcode from "react-barcode";
import {
  Plus, Search, Package, Pencil, Trash2,
  X, AlertTriangle, RefreshCw, Printer
} from "lucide-react";
import "./Products.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`;

const emptyForm = {
  name: "",
  sku: "",
  description: "",
  category: "",
  price: "",
  quantity: "",
  lowStockThreshold: 5
};

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

function Products() {
  let userRole = "staff";

  try {
    userRole = String(
      JSON.parse(sessionStorage.getItem("user") || "{}").role || "staff"
    ).toLowerCase();
  } catch {
    userRole = "staff";
  }

  const canManageProducts = userRole === "admin" || userRole === "manager";
  const canDeleteProducts = userRole === "admin";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const barcodeRefs = useRef({});
  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/", {
        params: search ? { search } : {}
      });

      setProducts(response.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openAddModal = () => {
    if (!canManageProducts) return;
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    if (!canManageProducts) return;

    setEditingId(product._id);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      category: product.category || "",
      price: product.price,
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold
    });

    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageProducts) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold)
      };

      if (editingId) {
        await api.put(`/${editingId}`, payload);
      } else {
        await api.post("/", payload);
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteProducts) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete product.");
    }
  };

  // PRINT ONE PRODUCT BARCODE
  const printBarcode = (product) => {
    if (!product.barcode) {
      setError("This product does not have a barcode yet.");
      return;
    }

    const barcodeContainer = barcodeRefs.current[product._id];
    const svg = barcodeContainer?.querySelector("svg");

    if (!svg) {
      setError("Barcode image is not ready. Please try again.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=500,height=400");

    if (!printWindow) {
      setError("Please allow pop-ups to print barcode labels.");
      return;
    }

    const barcodeSVG = svg.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${escapeHTML(product.name)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .label {
              width: 300px;
              margin: 20px auto;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            h3 { margin: 0 0 8px; font-size: 16px; }
            p { margin: 5px 0; font-size: 12px; }
            svg { max-width: 100%; height: auto; }
            @media print {
              body { padding: 0; }
              .label { border: none; margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <h3>${escapeHTML(product.name)}</h3>
            <p>SKU: ${escapeHTML(product.sku)}</p>
            ${barcodeSVG}
            <p>${escapeHTML(product.barcode)}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
    setError("");
  };

  const lowStockCount = products.filter(
    (product) => product.quantity <= product.lowStockThreshold
  ).length;

  const totalUnits = products.reduce(
    (total, product) => total + Number(product.quantity || 0),
    0
  );

  return (
    <div className="products-page">

      <div className="products-heading">
        <div>
          <span className="eyebrow">INVENTORY / PRODUCTS</span>
          <h1>Product Management</h1>
          <p>Manage your products, pricing and inventory levels.</p>
        </div>

        {canManageProducts && (
          <motion.button
            className="add-product-btn"
            onClick={openAddModal}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus size={19} />
            Add Product
          </motion.button>
        )}
      </div>

      <div className="product-summary">
        <div className="product-summary-card">
          <Package />
          <div>
            <small>Total Products</small>
            <h2>{products.length}</h2>
          </div>
        </div>

        <div className="product-summary-card">
          <RefreshCw />
          <div>
            <small>Total Stock Units</small>
            <h2>{totalUnits}</h2>
          </div>
        </div>

        <div className="product-summary-card warning-summary">
          <AlertTriangle />
          <div>
            <small>Low Stock Products</small>
            <h2>{lowStockCount}</h2>
          </div>
        </div>
      </div>

      <div className="products-toolbar">
        <div className="products-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search products by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="refresh-btn"
          onClick={fetchProducts}
          title="Refresh products"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error && (
        <div className="products-error">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      <div className="products-table-card">
        <div className="products-table-heading">
          <div>
            <h3>All Products</h3>
            <p>Your complete inventory list</p>
          </div>
          <span>{products.length} products</span>
        </div>

        {loading ? (
          <div className="products-empty">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <Package size={38} />
            <h3>No products found</h3>
            <p>Add your first product to get started.</p>
          </div>
        ) : (
          <div className="products-table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>SKU</th>
                  <th>BARCODE</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>QUANTITY</th>
                  <th>STATUS</th>
                  {canManageProducts && <th>ACTIONS</th>}
                </tr>
              </thead>

              <tbody>
                {products.map((product, index) => {
                  const isLow =
                    product.quantity <= product.lowStockThreshold;

                  return (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <td>
                        <div className="product-name-cell">
                          <div className="product-image-icon">
                            <Package size={19} />
                          </div>
                          <div>
                            <strong>{product.name}</strong>
                            <small>{product.description || "No description"}</small>
                          </div>
                        </div>
                      </td>

                      <td>{product.sku}</td>

                      <td>
                        {product.barcode ? (
                          <div
                            className="product-barcode-cell"
                            ref={(element) => {
                              barcodeRefs.current[product._id] = element;
                            }}
                          >
                            <Barcode
                              value={product.barcode}
                              format="CODE128"
                              width={0.8}
                              height={30}
                              fontSize={9}
                              margin={2}
                              displayValue={false}
                            />
                            <small>{product.barcode}</small>
                            <button
                              type="button"
                              className="print-barcode-btn"
                              onClick={() => printBarcode(product)}
                              title="Print barcode label"
                            >
                              <Printer size={14} />
                              Print
                            </button>
                          </div>
                        ) : (
                          <span className="product-status low">
                            Barcode unavailable
                          </span>
                        )}
                      </td>

                      <td>{product.category}</td>

                      <td className="product-price">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </td>

                      <td>{product.quantity}</td>

                      <td>
                        <span className={`product-status ${isLow ? "low" : "available"}`}>
                          {isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      {canManageProducts && (
                        <td>
                          <div className="product-actions">
                            <button
                              onClick={() => openEditModal(product)}
                              title="Edit product"
                            >
                              <Pencil size={16} />
                            </button>

                            {canDeleteProducts && (
                              <button
                                className="delete-action"
                                onClick={() => handleDelete(product._id)}
                                title="Delete product"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="product-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="product-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="product-modal-heading">
                <div>
                  <span className="eyebrow">INVENTORY MANAGEMENT</span>
                  <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
                </div>

                <button onClick={() => setModalOpen(false)}>
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="product-form-grid">
                  <div className="product-form-field">
                    <label>Product Name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Wireless Mouse"
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>SKU *</label>
                    <input
                      name="sku"
                      value={form.sku}
                      onChange={handleChange}
                      placeholder="WM001"
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>Category *</label>
                    <input
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Electronics"
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>Price (₹) *</label>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="599"
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>Quantity *</label>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={handleChange}
                      placeholder="50"
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>Low Stock Threshold</label>
                    <input
                      name="lowStockThreshold"
                      type="number"
                      min="0"
                      step="1"
                      value={form.lowStockThreshold}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="product-form-field full-field">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Enter product description..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="product-modal-actions">
                  <button
                    type="button"
                    className="cancel-product-btn"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-product-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Product"
                        : "Create Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Products;
