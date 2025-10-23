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

export default function DisplayChart() {
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

    // Build BUY and SELL points from open_positions
    const buySellPoints = [];

    openPositions.forEach(pos => {
      const addPoint = (time, type, color) => {
        const timeLabel = getTimeAMPM(time);
        const idx = labels.indexOf(timeLabel);
        if (idx !== -1) {
          buySellPoints.push({
            x: idx,
            y: intradayData[idx].close,
            signal: type,
            color: color
          });
        }
      };

      // If signal = CLOSED, show both BUY and SELL times
      if (pos.signal === "CLOSED" || pos.signal === "SELL") {
        if (pos.buy_time) addPoint(pos.buy_time, "BUY", "#22c55e");
        if (pos.sell_time) addPoint(pos.sell_time, "SELL", "#ef4444");
      } else if (pos.signal === "BUY" || pos.signal === "OPEN") {
        if (pos.datetime) addPoint(pos.datetime, "BUY", "#22c55e");
      } else if (pos.signal === "SELL") {
        if (pos.datetime) addPoint(pos.datetime, "SELL", "#ef4444");
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "BUY/SELL",
          data: buySellPoints,
          parsing: false,
          pointBackgroundColor: buySellPoints.map(pt => pt.color),
          pointBorderColor: buySellPoints.map(pt => pt.color),
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
        {openPositions.length > 0 ? (
          <table className="displaychart-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Signal</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((pos, idx) => (
                <tr key={idx}>
                  <td>{getTimeAMPM(pos.datetime)}</td>
                  <td
                    className={`displaychart-${(pos.signal || "").toLowerCase()} ${
                      pos.signal === "BUY" ? "blink" : ""
                    }`}
                  >
                    {pos.signal
                      ? pos.signal === "BUY"
                        ? "📈 BUY"
                        : "📉 SELL"
                      : "—"}
                  </td>
                  <td>
                    {pos.price != null ? `₹${pos.price.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="displaychart-empty">No signals available.</div>
        )}
      </div>
    </div>
  );
}
