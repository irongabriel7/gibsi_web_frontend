import React, { useState, useEffect } from "react";
import api from "../apiClient";
import "../styles/ConfigUpdater.css";

export default function ConfigUpdater({ profile }) {
  const isAdmin = profile?.usertype === "admin";

  const [selectedConfig, setSelectedConfig] = useState(null);
  const [stockUpdates, setStockUpdates] = useState([]);
  const [tradeConfigData, setTradeConfigData] = useState(null);
  const [tradeConfigJson, setTradeConfigJson] = useState("");
  const [selectedTradeParam, setSelectedTradeParam] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: "", success: null });

  // Load config data
  useEffect(() => {
    if (!selectedConfig) return;
    setStatus({ loading: true, message: "", success: null });

    const fetchData = async () => {
      try {
        if (selectedConfig === "stocks") {
          const res = await api.get("/get_stocks");
          if (res.data.success) {
            // Normalize IgnoreDate for frontend editing (YYYY-MM-DD or "None")
            const normalized = res.data.data.map((row) => ({
              ...row,
              // keep original Ignore as-is (backend sends "0.0", "-1.0", etc.)
              Ignore: row.Ignore == null ? "" : String(row.Ignore),
              IgnoreDate:
                row.IgnoreDate && row.IgnoreDate !== "None"
                  ? String(row.IgnoreDate).split(" ")[0]
                  : "None",
            }));
            setStockUpdates(normalized);
            setStatus({ loading: false, message: "", success: true });
          } else {
            setStatus({ loading: false, message: res.data.message, success: false });
          }
        } else if (selectedConfig === "tradeConfig") {
          const res = await api.get("/get_trade_config");
          if (res.data.success) {
            setTradeConfigData(res.data.data);
            setTradeConfigJson(JSON.stringify(res.data.data, null, 2));
            setStatus({ loading: false, message: "", success: true });
          } else {
            setStatus({ loading: false, message: res.data.message, success: false });
          }
        }
      } catch (err) {
        setStatus({
          loading: false,
          message: err.message || "Error loading config data",
          success: false,
        });
      }
    };

    fetchData();
  }, [selectedConfig]);

  const paramDescriptions = {
    // Example descriptions, fill as needed
    "BUY_TECHNICAL_INDICATOR": "All time intervals are in UTC. If needed to add more intervals for BUY keep same format\nAll Technical Indicator Parameter for BUY Analysis",
    "SELL_TECHNICAL_INDICATOR": "If needed to add more intervals for SELL keep same format, 09:40 Force exit UTC (15:10 IST)\nAll Technical Indicator Parameter for SELL Analysis",
    "TRADE_ENGINE": "MIN PROFIT_THRESHOLD = 0.5 (0.5%)\tMIN CONFIDENCE = 0.6 (60% confidence must be >= 0.6 out of 1)\nPREDICTION REFRESH THRESHOLD=1.5 percent deviation needed to re-predict\nBUY AVG CONFIDENCE=0.6 (60%)\tSELL AVG CONFIDENCE=0.6 (60%)\n SELL Condition: stop loss pct: -0.8(0.8%) Hard Stop Loss\tenough_profit=0.6 (0.6% If already Enough Profit is made)\nPositive profit=0.2 (Technical SELL signal + positive profit)\texpected sell time=600 (Target time reached (±5 min))\nMax Profit=0.8 (Maximum profit predicted by ML model (80% of it))\tMin Profit=0.4 (Minimum profit predicted by ML model (40% of it))",
    // add all relevant tradeConfig keys here
  };

  const getDescriptionForParam = (param) => paramDescriptions[param] || "No description available.";

  // Handle field changes
  const handleStockChange = (index, field, value) => {
    if (!isAdmin) return;
    const updated = [...stockUpdates];
    updated[index] = { ...updated[index], [field]: value };
    setStockUpdates(updated);
  };

  // Add/Remove rows
  const addStockRow = () => {
    if (!isAdmin) return;
    setStockUpdates([
      ...stockUpdates,
      {
        ID: "",
        instrumentKey: "",
        Ticker: "",
        "End Datetime": "",
        // default to "0.0" (active) or "" — keep string so highlighting works
        Ignore: "0.0",
        IgnoreDate: "None",
        "Trained Datetime": "",
        MAE: "",
      },
    ]);
  };

  const removeStockRow = (index) => {
    if (!isAdmin) return;
    setStockUpdates(stockUpdates.filter((_, i) => i !== index));
  };

  // Normalize datetime format before sending
  const normalizeDatetime = (value) => {
    if (!value || value === "None") return "None";
    return value.includes("T") ? value.replace("T", " ") + ":00" : value;
  };

  // Submit stock updates
  const submitStocks = async () => {
    if (!isAdmin) return;
    setStatus({ loading: true, message: "Saving stocks...", success: null });

    try {
      const payload = stockUpdates
        .filter((row) => String(row.ID).trim() !== "")
        .map((row) => ({
          ...row,
          ID: parseInt(row.ID || "0", 10),
          "End Datetime": normalizeDatetime(row["End Datetime"]),
          "Trained Datetime": normalizeDatetime(row["Trained Datetime"]),
          // send IgnoreDate either "None" or "YYYY-MM-DD"
          IgnoreDate:
            row.IgnoreDate === "None" || row.IgnoreDate === ""
              ? "None"
              : String(row.IgnoreDate),
          // ensure Ignore stays as string (backend likely expects numeric string)
          Ignore: row.Ignore == null ? "" : String(row.Ignore),
        }));

      const res = await api.post("/update_stocks", { updates: payload });
      setStatus({
        loading: false,
        message: res.data.message,
        success: res.data.success,
      });
    } catch (err) {
      setStatus({
        loading: false,
        message: err.message || "Error updating stocks",
        success: false,
      });
    }
  };

  // Submit trade config
  const submitTradeConfig = async () => {
    if (!isAdmin) return;
    setStatus({ loading: true, message: "Saving trade config...", success: null });
    try {
      const updates = JSON.parse(tradeConfigJson);
      const res = await api.post("/update_trade_config", { updates });
      setStatus({
        loading: false,
        message: res.data.message,
        success: res.data.success,
      });
    } catch (err) {
      setStatus({
        loading: false,
        message: err.message || "Invalid JSON or error updating config",
        success: false,
      });
    }
  };

  // --- Robust row class logic for Ignore highlighting ---
  const getRowClass = (ignoreValue) => {
    // handle null/undefined/empty quickly
    if (ignoreValue == null) return "";

    const raw = String(ignoreValue).trim();

    // Try numeric parse first (handles "0.0", "-1.0", numbers, " -1 ")
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      if (num === -1) return "row-ignore-red";
      if (num !== 0) return "row-ignore-yellow";
      return "";
    }

    // fallback to raw string checks (covers "None", "", "-1", etc.)
    if (raw === "-1" || raw === "-1.0") return "row-ignore-red";
    if (raw !== "0" && raw !== "0.0" && raw !== "") return "row-ignore-yellow";
    return "";
  };

  if (!selectedConfig) {
    return (
      <div className="config-updater">
        <h1>Configuration Updater</h1>
        <label>
          <input
            type="radio"
            name="configChoice"
            onChange={() => setSelectedConfig("stocks")}
          />{" "}
          Load Stocks List
        </label>
        <label>
          <input
            type="radio"
            name="configChoice"
            onChange={() => setSelectedConfig("tradeConfig")}
          />{" "}
          Load Trade Config
        </label>
      </div>
    );
  }

  return (
    <div className="config-updater">
      <h1>Configuration Updater</h1>
      {!isAdmin && (
        <div className="view-only-banner">
          View Only: Updates disabled for non-admins
        </div>
      )}
      <button className="btn-back" onClick={() => setSelectedConfig(null)}>
        Choose Config
      </button>

      {selectedConfig === "stocks" && (
        <section className="update-section">
          <h2>Stock List</h2>
          {status.message && (
            <p className={`status-message ${status.success ? "success" : "error"}`}>
              {status.message}
            </p>
          )}
          {status.loading ? (
            <p>Loading stock list...</p>
          ) : (
            <>
              <table className="stocks-table">
                <thead>
                  <tr>
                    {[
                      "ID",
                      "instrumentKey",
                      "Ticker",
                      "End Datetime",
                      "Ignore",
                      "IgnoreDate",
                      "Trained Datetime",
                      "MAE",
                      isAdmin ? "Actions" : null,
                    ]
                      .filter(Boolean)
                      .map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {stockUpdates.map((row, idx) => (
                    <tr key={idx} className={getRowClass(row.Ignore)}>
                      {[
                        "ID",
                        "instrumentKey",
                        "Ticker",
                        "End Datetime",
                        "Ignore",
                        "IgnoreDate",
                        "Trained Datetime",
                        "MAE",
                      ].map((field) => (
                        <td key={field}>
                          {field === "IgnoreDate" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <input
                                type="date"
                                value={row[field] === "None" ? "" : (row[field] || "")}
                                onChange={(e) =>
                                  handleStockChange(
                                    idx,
                                    field,
                                    e.target.value || "None"
                                  )
                                }
                                disabled={!isAdmin}
                              />
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="btn-clear"
                                  onClick={() => handleStockChange(idx, field, "None")}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ) : (
                            // For Ignore field show a text input (allow editing numeric string)
                            <input
                              type={field === "End Datetime" || field === "Trained Datetime" ? "datetime-local" : "text"}
                              value={row[field] == null ? "" : String(row[field])}
                              onChange={(e) => handleStockChange(idx, field, e.target.value)}
                              disabled={!isAdmin}
                            />
                          )}
                        </td>
                      ))}
                      {isAdmin && (
                        <td>
                          <button className="btn-remove" onClick={() => removeStockRow(idx)}>
                            &times;
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {isAdmin && (
                <div className="btn-row">
                  <button className="btn-add" onClick={addStockRow}>
                    + Add Stock
                  </button>
                  <button className="btn-submit" onClick={submitStocks} disabled={status.loading}>
                    {status.loading ? "Saving..." : "Save Stocks"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {selectedConfig === "tradeConfig" && (
          <section className="update-section">
            <h2>
              Trade Configuration <span className="subtle">(YAML as JSON)</span>
            </h2>
            {status.message && (
              <p className={`status-message ${status.success ? "success" : "error"}`}>
                {status.message}
              </p>
            )}
            {status.loading ? (
              <p>Loading trade config...</p>
            ) : (
              <div className="trade-config-split">
                <div className="param-list">
                  <ul>
                    {tradeConfigData
                      ? Object.keys(tradeConfigData).map((param) => (
                          <li
                            key={param}
                            className={param === selectedTradeParam ? "selected" : ""}
                            onClick={() => setSelectedTradeParam(param)}
                          >
                            {param}
                          </li>
                        ))
                      : null}
                  </ul>
                </div>
                <div className="param-details">
                  {selectedTradeParam ? (
                    <>
                      <h3>{selectedTradeParam}</h3>
                      <pre>{JSON.stringify(tradeConfigData[selectedTradeParam], null, 2)}</pre>
                      <div className="param-description-box">
                        {getDescriptionForParam(selectedTradeParam).split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>Select a parameter to see details.</p>
                  )}

                  {isAdmin && (
                    <>
                      <textarea
                        className="json-input"
                        rows={10}
                        value={tradeConfigJson}
                        onChange={(e) => setTradeConfigJson(e.target.value)}
                        spellCheck="false"
                      />
                      <button
                        className="btn-submit"
                        onClick={submitTradeConfig}
                        disabled={status.loading}
                      >
                        {status.loading ? "Saving..." : "Save Trade Config"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
    </div>
  );
}
