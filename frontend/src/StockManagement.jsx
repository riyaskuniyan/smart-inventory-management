
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertTriangle,
  Package,
  History,
  X,
  ScanBarcode,
  Camera,
  Search
} from "lucide-react";
import "./StockManagement.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function StockManagement() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [movementType, setMovementType] = useState("IN");

  // Barcode scanner states
  const [usbBarcode, setUsbBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanningLookup, setScanningLookup] = useState(false);

  // Scanner references
  const videoRef = useRef(null);
  const scanBusyRef = useRef(false);
  const scannerControlsRef = useRef(null);

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

  // Load products, stock history and low stock
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

  // Find product using barcode
  const lookupBarcode = useCallback(async (barcode) => {
    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode) {
      setScanMessage("Please scan or enter a barcode.");
      return;
    }

    if (scanBusyRef.current) return;

    scanBusyRef.current = true;
    setScanningLookup(true);
    setScanMessage("Searching for product...");

    try {
      const response = await axios.get(`${API}/products`, {
        params: {
          barcode: cleanBarcode
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const foundProducts = response.data.products || [];

      const product = foundProducts.find(
        (item) =>
          String(item.barcode || "").trim().toUpperCase() ===
          cleanBarcode.toUpperCase()
      );

      if (!product) {
        setScanMessage(
          `No product found for barcode: ${cleanBarcode}`
        );
        return;
      }

      setForm((previous) => ({
        ...previous,
        productId: product._id
      }));

      setUsbBarcode("");

      setScanMessage(
        `Product selected successfully: ${product.name}`
      );

      setScannerOpen(false);

    } catch (err) {
      console.error("Barcode lookup error:", err);

      setScanMessage(
        err.response?.data?.message ||
        "Unable to find this barcode. Please try again."
      );
    } finally {
      setScanningLookup(false);
      scanBusyRef.current = false;
    }
  }, [token]);

  // ZXing camera barcode scanner
  useEffect(() => {
    if (!scannerOpen || !modalOpen || !videoRef.current) {
      return;
    }

    let active = true;
    let controls = null;

    const hints = new Map();

    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE
    ]);

    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    const startScanner = async () => {
      try {
        setScanMessage("Starting camera...");

        const cameraControls =
          await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (!active || scanBusyRef.current) return;

              if (result) {
                const barcode = result.getText();

                if (barcode) {
                  lookupBarcode(barcode);
                }
              }
            }
          );

        if (active) {
          controls = cameraControls;
          scannerControlsRef.current = cameraControls;
          setScanMessage("Camera ready. Point at a barcode.");
        } else {
          cameraControls.stop();
        }

      } catch (err) {
        console.error("ZXing camera error:", err);

        if (active) {
          setScanMessage(
            "Camera could not start. Check browser permissions."
          );
        }
      }
    };

    startScanner();

    return () => {
      active = false;

      if (controls) {
        controls.stop();
      }

      scannerControlsRef.current = null;
    };

  }, [scannerOpen, modalOpen, lookupBarcode]);

  // Open stock modal
  const openModal = (type) => {
    setMovementType(type);

    setForm({
      productId: "",
      quantity: "",
      note: ""
    });

    setUsbBarcode("");
    setMessage("");
    setError("");
    setScanMessage("");
    setScannerOpen(false);

    scanBusyRef.current = false;

    setModalOpen(true);
  };

  // USB scanner or manual barcode lookup
  const handleUSBScan = (e) => {
    e.preventDefault();
    lookupBarcode(usbBarcode);
  };

  // Submit stock movement
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
        response.data.message ||
        "Stock updated successfully."
      );

      setModalOpen(false);
      setScannerOpen(false);

      await loadData();

    } catch (err) {
      console.error("Stock update error:", err);

      setError(
        err.response?.data?.message ||
        "Stock update failed. Please try again."
      );
    }
  };

  const totalUnits = products.reduce(
    (sum, product) =>
      sum + Number(product.quantity || 0),
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

      {/* HEADER */}
      <div className="stock-heading">
        <div>
          <span className="stock-eyebrow">
            INVENTORY / STOCK
          </span>

          <h1>Stock Management</h1>

          <p>
            Track stock movements and manage inventory levels.
          </p>
        </div>

        <button
          className="stock-refresh"
          onClick={loadData}
          title="Refresh stock"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {message && (
        <div className="stock-success">{message}</div>
      )}

      {error && (
        <div className="stock-error">{error}</div>
      )}

      {/* STOCK STATISTICS */}
      <div className="stock-stats">

        <motion.div
          className="stock-stat"
          whileHover={{ y: -4 }}
        >
          <Package size={25} />

          <div>
            <span>Total Products</span>
            <h2>{products.length}</h2>
          </div>
        </motion.div>

        <motion.div
          className="stock-stat"
          whileHover={{ y: -4 }}
        >
          <ArrowDownToLine size={25} />

          <div>
            <span>Total Stock Units</span>
            <h2>{totalUnits}</h2>
          </div>
        </motion.div>

        <motion.div
          className="stock-stat warning"
          whileHover={{ y: -4 }}
        >
          <AlertTriangle size={25} />

          <div>
            <span>Low Stock Products</span>
            <h2>{lowStock.length}</h2>
          </div>
        </motion.div>

      </div>

      {/* STOCK ACTIONS */}
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

      {/* LOW STOCK ALERTS */}
      <section className="stock-section">

        <div className="stock-section-title">
          <div>
            <h2>Low Stock Alerts</h2>
            <p>Products that need restocking</p>
          </div>

          <AlertTriangle size={22} />
        </div>

        {lowStock.length === 0 ? (
          <p className="stock-empty">
            No low-stock products. All good!
          </p>
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

      {/* STOCK MOVEMENT HISTORY */}
      <section className="stock-section">

        <div className="stock-section-title">
          <div>
            <h2>Stock Movement History</h2>
            <p>
              Recent stock in and stock out transactions
            </p>
          </div>

          <History size={22} />
        </div>

        {history.length === 0 ? (
          <p className="stock-empty">
            No stock movements found.
          </p>
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

                    <td>
                      {item.product?.name || "Unknown Product"}
                    </td>

                    <td>
                      <span
                        className={
                          item.type === "IN"
                            ? "movement-in"
                            : "movement-out"
                        }
                      >
                        {item.type}
                      </span>
                    </td>

                    <td>{item.quantity}</td>
                    <td>{item.previousStock}</td>
                    <td>{item.newStock}</td>

                    <td>
                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* STOCK IN / OUT MODAL */}
      {modalOpen && (

        <div className="stock-modal-overlay">

          <div className="stock-modal">

            <button
              className="stock-modal-close"
              onClick={() => {
                setModalOpen(false);
                setScannerOpen(false);
              }}
              type="button"
            >
              <X size={21} />
            </button>

            <h2>
              {movementType === "IN"
                ? "Add Stock"
                : "Remove Stock"}
            </h2>

            <p>
              {movementType === "IN"
                ? "Increase available product quantity."
                : "Decrease available product quantity."}
            </p>

            {/* BARCODE SCANNER */}
            <div className="stock-barcode-area">

              <h3>
                <ScanBarcode size={19} />
                Scan Product Barcode
              </h3>

              {/* USB SCANNER / MANUAL INPUT */}
              <form
                onSubmit={handleUSBScan}
                className="usb-scan-form"
              >

                <input
                  type="text"
                  value={usbBarcode}
                  onChange={(e) =>
                    setUsbBarcode(e.target.value)
                  }
                  placeholder="Scan with USB scanner or type barcode"
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={scanningLookup}
                >
                  <Search size={17} />
                  Find
                </button>

              </form>

              {/* CAMERA BUTTON */}
              <button
                type="button"
                className="camera-scan-button"
                onClick={() => {
                  setScanMessage("");
                  setScannerOpen((previous) => !previous);
                }}
              >
                <Camera size={18} />

                {scannerOpen
                  ? "Close Camera Scanner"
                  : "Scan Using Camera"}
              </button>

              {/* ZXING CAMERA VIEW */}
              {scannerOpen && (

                <div className="barcode-camera-box">

                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      maxHeight: "300px",
                      objectFit: "contain",
                      background: "#000",
                      borderRadius: "10px"
                    }}
                  />

                  <p>
                    Point your camera at the product barcode.
                    Keep the barcode clear and fully visible.
                  </p>

                </div>
              )}

              {/* SCAN STATUS */}
              {scanMessage && (

                <div className="barcode-scan-message">

                  {scanningLookup ? (
                    <RefreshCw
                      size={15}
                      className="spin"
                    />
                  ) : (
                    <ScanBarcode size={15} />
                  )}

                  {scanMessage}

                </div>
              )}

            </div>

            {/* STOCK FORM */}
            <form onSubmit={handleSubmit}>

              <label>Select Product</label>

              <select
                value={form.productId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    productId: e.target.value
                  })
                }
                required
              >
                <option value="">
                  Choose a product
                </option>

                {products.map((product) => (

                  <option
                    key={product._id}
                    value={product._id}
                  >
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
                  setForm({
                    ...form,
                    quantity: e.target.value
                  })
                }
                required
              />

              <label>Note</label>

              <textarea
                placeholder="Optional note..."
                value={form.note}
                onChange={(e) =>
                  setForm({
                    ...form,
                    note: e.target.value
                  })
                }
              />

              {error && (
                <div className="stock-error">
                  {error}
                </div>
              )}

              <button
                className="stock-submit"
                type="submit"
              >
                {movementType === "IN"
                  ? "Confirm Stock In"
                  : "Confirm Stock Out"}
              </button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default StockManagement;
