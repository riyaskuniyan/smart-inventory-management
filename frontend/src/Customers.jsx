
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Search, Pencil, Trash2, X, RefreshCw
} from "lucide-react";
import "./Customers.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const token = sessionStorage.getItem("token");

  const api = axios.create({
    baseURL: `${API}/api`,
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers");
      setCustomers(res.data.customers || []);
    } catch (error) {
      console.error("Customers loading error:", error);
      alert(error.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", address: "" });
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingId(customer._id);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || ""
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
        alert("Customer updated successfully");
      } else {
        await api.post("/customers", form);
        alert("Customer added successfully");
      }

      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save customer");
    }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) {
      return;
    }

    try {
      await api.delete(`/customers/${id}`);
      alert("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to delete customer");
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="customers-page">
      <div className="customers-header">
        <div>
          <h1>Customers</h1>
          <p>Manage your customer information</p>
        </div>

        <div className="customers-actions">
          <button className="customer-refresh" onClick={fetchCustomers}>
            <RefreshCw size={17} /> Refresh
          </button>
          <button className="customer-add" onClick={openAddModal}>
            <UserPlus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-icon"><Users /></div>
          <div>
            <span>Total Customers</span>
            <h2>{customers.length}</h2>
          </div>
        </div>
      </div>

      <div className="customers-table-card">
        <div className="customers-table-header">
          <div>
            <h3>Customer Directory</h3>
            <p>All registered customers</p>
          </div>

          <div className="customer-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="customer-message">Loading customers...</p>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <div className="customer-name-cell">
                        <div className="customer-avatar">
                          {customer.name?.charAt(0).toUpperCase()}
                        </div>
                        <strong>{customer.name}</strong>
                      </div>
                    </td>
                    <td>{customer.email || "—"}</td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.address || "—"}</td>
                    <td>
                      <div className="customer-row-actions">
                        <button
                          className="customer-edit"
                          onClick={() => openEditModal(customer)}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="customer-delete"
                          onClick={() => deleteCustomer(customer._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="customer-message">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="customer-modal-overlay">
          <motion.div
            className="customer-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="customer-modal-header">
              <div>
                <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>
                <p>Enter customer information below</p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Full Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />

              <label>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
              />

              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />

              <label>Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
                rows="3"
              />

              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="customer-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="customer-save">
                  {editingId ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Customers;
