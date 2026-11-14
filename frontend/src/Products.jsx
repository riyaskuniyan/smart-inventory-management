
import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Package, Pencil, Trash2,
  X, AlertTriangle, RefreshCw
} from "lucide-react";
import "./Products.css";

const API = "http://localhost:5000/api/products";

const emptyForm = {
  name: "",
  sku: "",
  description: "",
  category: "",
  price: "",
  quantity: "",
  lowStockThreshold: 5
};

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // FETCH PRODUCTS
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/", {
        params: search ? { search } : {}
      });

      setProducts(response.data.products || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  // FORM INPUT
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // OPEN ADD MODAL
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // OPEN EDIT MODAL
  const openEditModal = (product) => {
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

  // CREATE OR UPDATE PRODUCT
  const handleSubmit = async (e) => {
    e.preventDefault();

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
      setError(
        err.response?.data?.message || "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  // DELETE PRODUCT
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete product."
      );
    }
  };

  const lowStockCount = products.filter(
    (product) => product.quantity <= product.lowStockThreshold
  ).length;

  const totalUnits = products.reduce(
    (total, product) => total + product.quantity,
    0
  );

  return (
    <div className="products-page">

      {/* HEADER */}
      <div className="products-heading">
        <div>
          <span className="eyebrow">INVENTORY / PRODUCTS</span>
          <h1>Product Management</h1>
          <p>Manage your products, pricing and inventory levels.</p>
        </div>

        <motion.button
          className="add-product-btn"
          onClick={openAddModal}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Plus size={19} />
          Add Product
        </motion.button>
      </div>

      {/* SUMMARY */}
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

      {/* SEARCH */}
      <div className="products-toolbar">
        <div className="products-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search products by name..."
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

      {/* ERROR */}
      {error && (
        <div className="products-error">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      {/* PRODUCT TABLE */}
      <div className="products-table-card">

        <div className="products-table-heading">
          <div>
            <h3>All Products</h3>
            <p>Your complete inventory list</p>
          </div>

          <span>{products.length} products</span>
        </div>

        {loading ? (
          <div className="products-empty">
            Loading products...
          </div>
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
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>QUANTITY</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
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

                      <td>
                        <div className="product-actions">
                          <button
                            onClick={() => openEditModal(product)}
                            title="Edit product"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="delete-action"
                            onClick={() => handleDelete(product._id)}
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ADD / EDIT MODAL */}
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
