
import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Boxes, Mail, Lock, Eye, EyeOff,
  ArrowRight, ShieldCheck
} from "lucide-react";
import "./Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      if (response.data.success) {
        sessionStorage.setItem("token", response.data.token);
        sessionStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        onLogin(response.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <motion.div
        className="login-decoration"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="login-brand">
          <div className="login-brand-icon"><Boxes /></div>
          <h2>Stock<span>Flow</span></h2>
        </div>

        <div className="login-hero">
          <div className="hero-glow" />
          <motion.div
            className="hero-cube"
            animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Boxes size={110} strokeWidth={1} />
          </motion.div>

          <span className="eyebrow">SMART INVENTORY PLATFORM</span>
          <h1>Take control of<br />your <span>business.</span></h1>
          <p>
            One powerful platform to manage products,
            track inventory and grow your business.
          </p>

          <div className="login-feature">
            <ShieldCheck size={18} />
            Secure inventory management
          </div>
        </div>

        <div className="login-footer">
          SMARTER INVENTORY. BETTER BUSINESS.
        </div>
      </motion.div>

      <div className="login-form-side">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to StockFlow</h2>
          <p className="login-subtitle">
            Enter your credentials to access your dashboard.
          </p>

          <form onSubmit={handleLogin}>
            <label>Email address</label>
            <div className="login-input">
              <Mail size={18} />
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label>Password</label>
            <div className="login-input">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <motion.button
              type="submit"
              className="login-submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Signing in..." : "Sign in to dashboard"}
              <ArrowRight size={18} />
            </motion.button>
          </form>

          <div className="login-security">
            <ShieldCheck size={16} />
            Your account is protected with secure authentication.
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
