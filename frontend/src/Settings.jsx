
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Palette,
  User,
  Shield,
  Users,
  UserPlus,
  Package,
  Bell,
  Building2,
  Database,
  Monitor,
  Moon,
  Sun,
  Save,
  RefreshCw,
  Lock,
  CheckCircle,
  UserCheck,
  UserX
} from "lucide-react";
import "./Settings.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const STORAGE_KEY = "stockflowSettings";

const defaultSettings = {
  theme: "dark",
  accent: "#5eead4",
  lowStockThreshold: 5,
  notifications: {
    lowStock: true,
    newOrders: true,
    stockUpdates: true
  },
  business: {
    name: "StockFlow",
    email: "",
    phone: "",
    address: ""
  }
};

const sections = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile", label: "My Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "users", label: "User Management", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "business", label: "Business Details", icon: Building2 },
  { id: "system", label: "System", icon: Database }
];

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    return {
      ...defaultSettings,
      ...saved,
      notifications: {
        ...defaultSettings.notifications,
        ...(saved.notifications || {})
      },
      business: {
        ...defaultSettings.business,
        ...(saved.business || {})
      }
    };
  } catch (error) {
    console.error("Unable to load settings:", error);
    return defaultSettings;
  }
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "staff"
};

export default function Settings({ currentUser }) {
  const [activeSection, setActiveSection] = useState("appearance");
  const [settings, setSettings] = useState(loadSettings);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [systemStatus, setSystemStatus] = useState("Not checked");

  // User management states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userActionId, setUserActionId] = useState("");

  const token = sessionStorage.getItem("token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => setMessage(""), 3500);
  };

  // Apply theme globally
  useEffect(() => {
    const applyTheme = () => {
      const selectedTheme = settings.theme || "dark";

      let actualTheme = selectedTheme;

      if (selectedTheme === "system") {
        actualTheme = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches ? "dark" : "light";
      }

      document.documentElement.setAttribute("data-theme", actualTheme);
      document.documentElement.style.setProperty(
        "--accent",
        settings.accent || "#5eead4"
      );
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (settings.theme === "system") applyTheme();
    };

    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [settings.theme, settings.accent]);

  // Automatically save settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Unable to save settings:", error);
    }
  }, [settings]);

  // Load users when the admin opens User Management
  useEffect(() => {
    if (activeSection === "users" && currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [activeSection, currentUser?.role]);

  const fetchUsers = async () => {
    setUsersLoading(true);

    try {
      const response = await axios.get(`${API}/users`, authConfig);
      setUsers(response.data.users || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Could not load users.",
        "error"
      );
    } finally {
      setUsersLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNotification = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updateBusiness = (key, value) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        [key]: value
      }
    }));
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      showMessage("Settings saved successfully.");
    } catch {
      showMessage("Unable to save settings.", "error");
    }
  };

  // Save profile
  const saveProfile = async () => {
    try {
      const response = await axios.put(
        `${API}/auth/profile`,
        { name: profileName, email: profileEmail },
        authConfig
      );

      const updatedUser = response.data.user;

      if (updatedUser) {
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
      }

      showMessage("Profile updated successfully.");
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Could not update profile.",
        "error"
      );
    }
  };

  // Change password
  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("Please fill in all password fields.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("New passwords do not match.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("Password must contain at least 8 characters.", "error");
      return;
    }

    try {
      const response = await axios.put(
        `${API}/auth/password`,
        { currentPassword, newPassword },
        authConfig
      );

      showMessage(response.data.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Password update failed.",
        "error"
      );
    }
  };

  // Create a Manager or Staff account
  const createUser = async (event) => {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password) {
      showMessage("Please complete all user fields.", "error");
      return;
    }

    if (userForm.password.length < 8) {
      showMessage("User password must contain at least 8 characters.", "error");
      return;
    }

    setCreatingUser(true);

    try {
      await axios.post(
        `${API}/users`,
        {
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          password: userForm.password,
          role: userForm.role
        },
        authConfig
      );

      showMessage(`${userForm.role} account created successfully.`);
      setUserForm(emptyUserForm);
      setShowCreateUser(false);
      await fetchUsers();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Could not create user.",
        "error"
      );
    } finally {
      setCreatingUser(false);
    }
  };

  // Change a user's role
  const changeUserRole = async (userId, role) => {
    setUserActionId(userId);

    try {
      await axios.patch(
        `${API}/users/${userId}/role`,
        { role },
        authConfig
      );

      showMessage("User role updated successfully.");
      await fetchUsers();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Could not update user role.",
        "error"
      );
      await fetchUsers();
    } finally {
      setUserActionId("");
    }
  };

  // Activate or deactivate a user
  const toggleUserStatus = async (user) => {
    const nextStatus = !user.isActive;
    const action = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    setUserActionId(user._id);

    try {
      await axios.patch(
        `${API}/users/${user._id}/status`,
        { isActive: nextStatus },
        authConfig
      );

      showMessage(`User ${action}d successfully.`);
      await fetchUsers();
    } catch (error) {
      showMessage(
        error.response?.data?.message || `Could not ${action} user.`,
        "error"
      );
      await fetchUsers();
    } finally {
      setUserActionId("");
    }
  };

  // Check backend connection
  const checkSystem = async () => {
    try {
      await axios.get(`${API}/health`);
      setSystemStatus("Connected");
    } catch {
      setSystemStatus("Disconnected");
    }
  };

  // Export settings
  const exportSettings = () => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "stockflow-settings.json";
      link.click();
      URL.revokeObjectURL(url);

      showMessage("Settings exported.");
    } catch {
      showMessage("Could not export settings.", "error");
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "appearance":
        return (
          <>
            <h2>Appearance</h2>
            <p className="settings-description">
              Customize how StockFlow looks on your device.
            </p>

            <div className="settings-group">
              <h3>Theme</h3>
              <div className="theme-options">
                {[
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "light", label: "Light", icon: Sun },
                  { id: "system", label: "System", icon: Monitor }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`theme-option ${settings.theme === item.id ? "selected" : ""}`}
                      onClick={() => updateSetting("theme", item.id)}
                    >
                      <Icon size={24} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-group">
              <h3>Accent Colour</h3>
              <div className="accent-options">
                {["#5eead4", "#60a5fa", "#a78bfa", "#f472b6", "#fbbf24", "#4ade80"].map(color => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`Choose ${color}`}
                    className={`accent-option ${settings.accent === color ? "selected" : ""}`}
                    style={{ background: color }}
                    onClick={() => updateSetting("accent", color)}
                  />
                ))}
              </div>
            </div>

            <p className="settings-description">
              Your appearance preferences are saved automatically.
            </p>
          </>
        );

      case "profile":
        return (
          <>
            <h2>My Profile</h2>
            <p className="settings-description">Manage your account information.</p>

            <div className="settings-form">
              <label>Full Name</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} />

              <label>Email Address</label>
              <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />

              <label>Role</label>
              <input value={currentUser?.role || ""} disabled />

              <button type="button" className="settings-primary" onClick={saveProfile}>
                <Save size={17} /> Save Profile
              </button>
            </div>
          </>
        );

      case "security":
        return (
          <>
            <h2>Security</h2>
            <p className="settings-description">Change your account password.</p>

            <div className="settings-form">
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />

              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />

              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

              <button type="button" className="settings-primary" onClick={changePassword}>
                <Lock size={17} /> Change Password
              </button>
            </div>
          </>
        );

      case "users":
        return (
          <>
            <div className="users-heading">
              <div>
                <h2>User Management</h2>
                <p className="settings-description">
                  Create accounts and manage staff and manager access.
                </p>
              </div>

              <button
                type="button"
                className="settings-primary"
                onClick={() => setShowCreateUser(value => !value)}
              >
                <UserPlus size={17} />
                {showCreateUser ? "Close Form" : "Add User"}
              </button>
            </div>

            {currentUser?.role !== "admin" ? (
              <p>Only administrators can manage user accounts.</p>
            ) : (
              <>
                {showCreateUser && (
                  <form className="user-create-form" onSubmit={createUser}>
                    <h3>Create New Account</h3>

                    <div className="user-form-grid">
                      <div>
                        <label>Full Name</label>
                        <input
                          value={userForm.name}
                          onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter full name"
                          required
                        />
                      </div>

                      <div>
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email"
                          required
                        />
                      </div>

                      <div>
                        <label>Password</label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Minimum 8 characters"
                          minLength={8}
                          required
                        />
                      </div>

                      <div>
                        <label>Account Role</label>
                        <select
                          value={userForm.role}
                          onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="settings-primary" disabled={creatingUser}>
                      <UserPlus size={17} />
                      {creatingUser ? "Creating..." : "Create Account"}
                    </button>
                  </form>
                )}

                <div className="users-toolbar">
                  <strong>Registered Users ({users.length})</strong>
                  <button
                    type="button"
                    className="settings-secondary"
                    onClick={fetchUsers}
                    disabled={usersLoading}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>

                {usersLoading ? (
                  <p className="settings-description">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="settings-description">No users found.</p>
                ) : (
                  <div className="users-table-wrapper">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => {
                          const isSelf = String(user._id) === String(currentUser?._id || currentUser?.id);
                          const isAdmin = user.role === "admin";
                          const isProtected = isSelf || isAdmin;
                          const busy = userActionId === user._id;

                          return (
                            <tr key={user._id}>
                              <td>
                                <div className="user-name-cell">
                                  <strong>{user.name}</strong>
                                  <small>{user.email}</small>
                                  {isSelf && <small>You</small>}
                                </div>
                              </td>

                              <td>
                                <select
                                  value={user.role}
                                  disabled={isProtected || busy}
                                  onChange={e => changeUserRole(user._id, e.target.value)}
                                  aria-label={`Change role for ${user.name}`}
                                >
                                  <option value="staff">Staff</option>
                                  <option value="manager">Manager</option>
                                  {isAdmin && <option value="admin">Admin</option>}
                                </select>
                              </td>

                              <td>
                                <span className={`user-status ${user.isActive ? "active" : "inactive"}`}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>

                              <td>
                                {user.createdAt
                                  ? new Date(user.createdAt).toLocaleDateString()
                                  : "—"}
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className={`user-action-button ${user.isActive ? "deactivate" : "activate"}`}
                                  disabled={isProtected || busy}
                                  onClick={() => toggleUserStatus(user)}
                                  title={isProtected ? "Protected account" : user.isActive ? "Deactivate user" : "Activate user"}
                                >
                                  {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                  {busy ? "Please wait" : user.isActive ? "Deactivate" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="settings-description">
                  Admin accounts and your own account are protected from role and status changes here.
                </p>
              </>
            )}
          </>
        );

      case "inventory":
        return (
          <>
            <h2>Inventory Preferences</h2>
            <p className="settings-description">Configure your inventory defaults.</p>

            <div className="settings-form">
              <label>Default Low Stock Threshold</label>
              <input
                type="number"
                min="0"
                value={settings.lowStockThreshold}
                onChange={e => updateSetting("lowStockThreshold", Math.max(0, Number(e.target.value)))}
              />

              <button type="button" className="settings-primary" onClick={saveSettings}>
                <Save size={17} /> Save Inventory Settings
              </button>
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            <h2>Notifications</h2>
            <p className="settings-description">Choose which notifications you want enabled.</p>

            {[
              ["lowStock", "Low Stock Alerts", "When a product reaches its low stock level."],
              ["newOrders", "New Order Alerts", "When a new order is created."],
              ["stockUpdates", "Stock Updates", "When inventory quantities change."]
            ].map(([key, label, description]) => (
              <div className="settings-toggle" key={key}>
                <div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={e => updateNotification(key, e.target.checked)}
                />
              </div>
            ))}

            <button type="button" className="settings-primary" onClick={saveSettings}>
              <Save size={17} /> Save Preferences
            </button>
          </>
        );

      case "business":
        return (
          <>
            <h2>Business Details</h2>
            <p className="settings-description">Configure your business information.</p>

            <div className="settings-form">
              <label>Business Name</label>
              <input value={settings.business.name} onChange={e => updateBusiness("name", e.target.value)} />

              <label>Business Email</label>
              <input type="email" value={settings.business.email} onChange={e => updateBusiness("email", e.target.value)} />

              <label>Phone Number</label>
              <input value={settings.business.phone} onChange={e => updateBusiness("phone", e.target.value)} />

              <label>Business Address</label>
              <textarea value={settings.business.address} onChange={e => updateBusiness("address", e.target.value)} />

              <button type="button" className="settings-primary" onClick={saveSettings}>
                <Save size={17} /> Save Business Details
              </button>
            </div>
          </>
        );

      case "system":
        return (
          <>
            <h2>System Information</h2>
            <p className="settings-description">Check your application connection.</p>

            <div className="settings-status">
              <Database size={22} />
              <div>
                <strong>Backend API</strong>
                <p>{systemStatus}</p>
              </div>
            </div>

            <button type="button" className="settings-primary" onClick={checkSystem}>
              <RefreshCw size={17} /> Check Connection
            </button>

            <button type="button" className="settings-secondary" onClick={exportSettings}>
              <Database size={17} /> Export Settings
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your StockFlow workspace and preferences.</p>
        </div>
      </div>

      {message && (
        <div className={`settings-message ${messageType === "error" ? "error" : ""}`}>
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          {sections.map(section => {
            const Icon = section.icon;

            if (section.id === "users" && currentUser?.role !== "admin") {
              return null;
            }

            return (
              <button
                type="button"
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={19} />
                {section.label}
              </button>
            );
          })}
        </aside>

        <main className="settings-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
