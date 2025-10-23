import React, { useState, useEffect } from "react";
import "../styles/App.css";
import "../styles/LiveGainers.css";
import "../styles/Loading.css";
import "../styles/DisplayChart.css";
import api from "../apiClient";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ScatterController
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, zoomPlugin, ScatterController);

function getTimeAMPM(datetimeString) {
  if (!datetimeString) return "";
  return new Date(datetimeString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export default function EditChart() {
  const [tickers, setTickers] = useState([]);
  const [ticker, setTicker] = useState("");
  const [stockId, setStockId] = useState(null);
  const [date, setDate] = useState("");

  const [intradayData, setIntradayData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [openPositions, setOpenPositions] = useState([]);
  const [intradayProfit, setIntradayProfit] = useState(null);
  const [intradayProfitPercent, setIntradayProfitPercent] = useState(null);

  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [editRows, setEditRows] = useState({}); // { idx: { datetime, signal, price } }
  const [isSaving, setIsSaving] = useState(false);
  const [addRows, setAddRows] = useState({}); // { BUY: { datetime, price }, SELL: { ... } }

  function handleEdit(idx, field, value) {
    setEditRows(prev => {
      let updated = { ...prev[idx], [field]: value };
      // If user edits datetime, auto-update price from intradayData
      if (field === "datetime" && value) {
        // Find close price in intradayData matching new datetime
        // First, convert to IST ISO string (add +05:30 if missing)
        let isoTime = value.endsWith("+05:30") ? value : value + "+05:30";
        let found = intradayData.find(entry => entry.datetime.startsWith(isoTime));
        if (!found) {
          // fallback: match only to minute
          found = intradayData.find(entry =>
            entry.datetime.slice(0, 16) === value
          );
        }
        updated.price = found ? found.close : null;
      }
      return {
        ...prev,
        [idx]: updated
      };
    });
  }

  function cancelEdit(idx) {
    setEditRows(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  }

  function startEdit(idx) {
    const pos = openPositions[idx];
    setEditRows(prev => ({
      ...prev,
      [idx]: {
        datetime: pos.datetime,
        // Only time is editable; these remain for completeness
        signal: pos.signal,
        price: pos.price
      }
    }));
  }

  function handleSaveTimeOnly(idx, signalType) {
    setIsSaving(true);
    const editData = editRows[idx];
    let newDate = editData.datetime;
    if (!newDate.endsWith("+05:30")) {
      newDate = newDate + "+05:30";
    }
    const oldPos = openPositions[idx];

    // Correct: Use the price from editData, which matches the new Datetime.
    const updatedPos = {
      old_datetime: oldPos.datetime,
      datetime: newDate,
      signal: signalType,
      price: editData.price
    };

    api.post("/api/update_open_positions", {
      stock_id: stockId,
      ticker: ticker,
      open_positions: [updatedPos]
    }).then(async () => {
      setEditRows(prev => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
      // Delay 2 seconds before refreshing chart data
      setTimeout(async () => {
        const res = await api.get("/api/display_chart", {
          params: { stock_id: stockId, target_datetime: date }
        });
        setOpenPositions(res.data.open_positions || []);
        setIntradayData(res.data.intraday || []);
        setHistoricalData(res.data.historical || []);
        setIntradayProfit(res.data.intraday_profit_value ?? null);
        setIntradayProfitPercent(res.data.intraday_profit_percent ?? null);
      }, 2000);
    }).catch(err => {
      setError("Failed to update: " + err.message);
    }).finally(() => setIsSaving(false));
  }

  function handleAddChange(signalType, field, value) {
    setAddRows(prev => {
      let newRow = { ...(prev[signalType] || {}) };
      newRow[field] = value;
      // If the field is datetime, auto-fill price from intradayData
      if (field === "datetime" && value) {
        const isoTime = value + "+05:30";
        const found = intradayData.find(entry => entry.datetime.startsWith(isoTime));
        if (found) {
          newRow.price = found.close;
        } else {
          // fallback: find the nearest time
          const entry = intradayData.find(ent => ent.datetime.slice(0, 16) === value);
          if (entry) newRow.price = entry.close;
          else newRow.price = null;
        }
      }
      return { ...prev, [signalType]: newRow };
    });
  }

  function handleAddPosition(signalType) {
    setIsSaving(true);
    const addData = addRows[signalType];
    let newDate = addData.datetime;
    if (!newDate.endsWith("+05:30")) {
      newDate = newDate + "+05:30";
    }
    const newPos = {
      datetime: newDate,
      signal: signalType,
      price: Number(addData.price)
    };
    api.post("/api/update_open_positions", {
      stock_id: stockId,
      ticker: ticker,
      open_positions: [newPos]
    }).then(async () => {
      setAddRows(prev => {
        const copy = { ...prev };
        delete copy[signalType];
        return copy;
      });
      const res = await api.get("/api/display_chart", {
        params: { stock_id: stockId, target_datetime: date }
      });
      setOpenPositions(res.data.open_positions || []);
    }).catch(err => {
      setError("Failed to add: " + err.message);
    }).finally(() => setIsSaving(false));
  }

  useEffect(() => {
    async function loadStocks() {
      try {
        const res = await api.get("/api/stocks_list");
        if (Array.isArray(res.data)) {
          const stocksWithIds = res.data.map((item, idx) =>
            typeof item === "string"
              ? { ticker: item, stock_id: idx + 1 }
              : {
                  ticker: item.ticker || item.symbol || item,
                  stock_id: item.stock_id ?? item.id ?? idx + 1
                }
          );
          setTickers(stocksWithIds);
          if (stocksWithIds.length > 0) {
            setTicker(stocksWithIds[0].ticker);
            setStockId(stocksWithIds[0].stock_id);
          }
        } else {
          setError("Unexpected stocks list format");
        }
      } catch (err) {
        setError("Failed to load stock list");
      } finally {
        setInitialLoading(false);
      }
    }
    loadStocks();
  }, []);

  useEffect(() => {
    setIntradayData([]);
    setHistoricalData([]);
    setOpenPositions([]);
    setIntradayProfit(null);
    setIntradayProfitPercent(null);
  }, [ticker, date]);

  useEffect(() => {
    if (!stockId || !date) return;

    const fetchData = async () => {
      try {
        const res = await api.get("/api/display_chart", {
          params: { stock_id: stockId, target_datetime: date }
        });
        const data = res.data || {};
        setIntradayData(data.intraday || []);
        setHistoricalData(data.historical || []);
        setOpenPositions(data.open_positions || []);
        setIntradayProfit(data.intraday_profit_value ?? null);
        setIntradayProfitPercent(data.intraday_profit_percent ?? null);
      } catch (err) {
        setError(`Error fetching data: ${err.message}`);
        setIntradayData([]);
        setHistoricalData([]);
        setOpenPositions([]);
        setIntradayProfit(null);
        setIntradayProfitPercent(null);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [stockId, date]);

  const getChartData = () => {
    if (!intradayData.length) return null;

    const labels = intradayData.map(item => getTimeAMPM(item.datetime));
    const closePoints = intradayData.map((item, idx) => ({ x: idx, y: item.close }));

    const buySellPoints = openPositions
      .map(pos => {
        const time = getTimeAMPM(pos.datetime);
        const idx = labels.indexOf(time);
        if (idx === -1) return null;
        return {
          x: idx,
          y: intradayData[idx].close,
          signal: pos.signal
        };
      })
      .filter(Boolean);

    return {
      labels,
      datasets: [
        {
          label: "BUY/SELL",
          data: buySellPoints,
          parsing: false,
          pointBackgroundColor: buySellPoints.map(pt =>
            pt.signal === "BUY" ? "#ef4444" : "#22c55e"
          ),
          pointBorderColor: buySellPoints.map(pt =>
            pt.signal === "BUY" ? "#ef4444" : "#22c55e"
          ),
          borderColor: "transparent",
          showLine: false,
          pointRadius: 8,
          type: "scatter"
        },
        {
          label: "Close Price",
          data: closePoints,
          parsing: false,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.08)",
          tension: 0.4,
          fill: true,
          type: "line"
        }
      ]
    };
  };

  const calculateMetrics = () => {
    if (!historicalData.length) {
      return { profit_value: null, profit_percent: null, status: null };
    }
    const first = intradayData[0].open;
    const last = intradayData[intradayData.length - 1].close;
    const value = last - first;
    const percent = (value / first) * 100;
    return {
      profit_value: value,
      profit_percent: percent,
      status: value >= 0 ? "GAIN" : "LOSS"
    };
  };

  // Existing daily status
  const dailyMetrics = historicalData.length ? historicalData[0] : calculateMetrics();

  // New intraday status
  const intradayStatus = intradayProfit != null
    ? (intradayProfit >= 0 ? "GAIN" : "LOSS")
    : null;

  const chartConfig = getChartData();

  if (initialLoading) {
    return (
      <div className="candlestick-loader">
        <div className="candles">
          <div className="candle red"></div>
          <div className="candle green"></div>
          <div className="candle red"></div>
        </div>
        Loading stocks list...
      </div>
    );
  }

  return (
    <div className="displaychart-board">
      <div className="displaychart-title-bar">
        <h2 className="displaychart-title">Intraday Stock Chart</h2>
        <div className="displaychart-controls">
          <select
            value={ticker}
            onChange={(e) => {
              const selected = tickers.find(s => s.ticker === e.target.value);
              setTicker(selected?.ticker || "");
              setStockId(selected?.stock_id || null);
            }}
            disabled={tickers.length === 0}
          >
            <option value="">Select stock</option>
            {tickers.map((s, i) => (
              <option key={i} value={s.ticker}>{s.ticker}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="displaychart-metrics">
        <div className="displaychart-card">
          <div className="displaychart-label">Profit ₹</div>
          <div className="displaychart-value">
            {dailyMetrics.profit_value != null ? dailyMetrics.profit_value.toFixed(2) : "-"}
          </div>
        </div>
        <div className="displaychart-card">
          <div className="displaychart-label">Profit %</div>
          <div className="displaychart-value">
            {dailyMetrics.profit_percent != null
              ? dailyMetrics.profit_percent.toFixed(2) + "%"
              : "-"}
          </div>
        </div>
        <div className="displaychart-card">
          <div className="displaychart-label">Intraday ₹</div>
          <div className="displaychart-value">
            {intradayProfit != null ? intradayProfit.toFixed(2) : "-"}
          </div>
        </div>
        <div className="displaychart-card">
          <div className="displaychart-label">Intraday %</div>
          <div className="displaychart-value">
            {intradayProfitPercent != null
              ? intradayProfitPercent.toFixed(2) + "%"
              : "-"}
          </div>
        </div>
        <div className={`displaychart-card ${dailyMetrics.status === "GAIN" ? "gain" : "loss"}`}>
          <div className="displaychart-label">Status</div>
          <div className="displaychart-value">{dailyMetrics.status || "-"}</div>
        </div>
        <div className={`displaychart-card ${intradayStatus === "GAIN" ? "gain" : "loss"}`}>
          <div className="displaychart-label">Intraday Status</div>
          <div className="displaychart-value">{intradayStatus || "-"}</div>
        </div>
      </div>

      <div className="displaychart-chart-panel">
        {chartConfig ? (
          <div style={{ height: "400px", width: "100%" }}>
            <Line
              data={chartConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                parsing: false,
                plugins: {
                  legend: { labels: { font: { size: 14 } } },
                  tooltip: { mode: "index", intersect: false },
                  zoom: {
                    pan: { enabled: true, mode: "x" },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
                  }
                },
                scales: {
                  x: {
                    type: "category",
                    labels: chartConfig.labels,
                    ticks: { font: { size: 12 } },
                    title: { display: true, text: "Time (AM/PM)" }
                  },
                  y: {
                    ticks: { font: { size: 12 } },
                    title: { display: true, text: "Close Price" }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="displaychart-empty">No chart data available.</div>
        )}
      </div>

      <div className="displaychart-signals">
        <h3 className="displaychart-section-title">Live Trade Signals</h3>
        <table className="displaychart-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Signal</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {["BUY", "SELL"].map(signalType => {
              const idx = openPositions.findIndex(pos => pos.signal === signalType);
              if (idx !== -1) {
                // ...existing code for editing row...
                const pos = openPositions[idx];
                const editing = editRows[idx];
                return (
                  <tr key={signalType}>
                    <td>
                      {editing ? (
                        <input
                          type="datetime-local"
                          min={intradayData[0]?.datetime.slice(0, 16)}
                          max={intradayData[intradayData.length-1]?.datetime.slice(0, 16)}
                          value={editing.datetime?.slice(0, 16) || pos.datetime.slice(0, 16)}
                          onChange={e => handleEdit(idx, "datetime", e.target.value)}
                        />
                      ) : (
                        getTimeAMPM(pos.datetime)
                      )}
                    </td>
                    <td>{signalType === "BUY" ? "📈 BUY" : "📉 SELL"}</td>
                    <td>₹{pos.price != null ? pos.price.toFixed(2) : "—"}</td>
                    <td>
                      {editing ? (
                        <>
                          <button className="button"
                                  onClick={() => handleSaveTimeOnly(idx, signalType)}
                                  disabled={isSaving || editing.price == null}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                          <button className="button cancel"
                                  onClick={() => cancelEdit(idx)}
                                  disabled={isSaving}
                          >
                            Cancel
                          </button>
                          {editing.price == null && (
                            <div className="error-message" style={{ color: "red", marginTop: 4 }}>
                              No price available for this time. Please select a valid market time.
                            </div>
                          )}
                        </>
                      ) : (
                        <button className="button" onClick={() => startEdit(idx)}>Edit Time</button>
                      )}
                    </td>
                  </tr>
                );
              } else {
                // Show "Add" UI even if openPositions is empty!
                return (
                  <tr key={signalType}>
                    <td>
                      <input
                        type="datetime-local"
                        min={intradayData[0]?.datetime.slice(0, 16)}
                        max={intradayData[intradayData.length-1]?.datetime.slice(0, 16)}
                        value={addRows[signalType]?.datetime || ""}
                        onChange={e => handleAddChange(signalType, "datetime", e.target.value)}
                      />
                    </td>
                    <td>{signalType === "BUY" ? "📈 BUY" : "📉 SELL"}</td>
                    <td>
                      {addRows[signalType]?.price != null
                        ? `₹${addRows[signalType].price.toFixed(2)}`
                        : <span style={{ color: "#999" }}>Auto-fill after time</span>}
                    </td>
                    <td>
                      <button
                        className="button"
                        onClick={() => handleAddPosition(signalType)}
                        disabled={isSaving || !addRows[signalType]?.datetime}
                      >
                        Add {signalType}
                      </button>
                      {addRows[signalType]?.datetime && addRows[signalType]?.price == null && (
                        <div className="error-message" style={{ color: "red", marginTop: 4 }}>
                          No price available for this time. Please select a valid market time.
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
