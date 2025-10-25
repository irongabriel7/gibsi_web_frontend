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

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  zoomPlugin,
  ScatterController
);

function getTimeAMPM(datetimeString) {
  if (!datetimeString) return "";
  return new Date(datetimeString).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
}

export default function DisplayChart() {
  // Stock list for dropdown
  const [stocksList, setStocksList] = useState([]);

  // States for data and UI
  const [ticker, setTicker] = useState("");
  const [stockId, setStockId] = useState(null);
  const [date, setDate] = useState(""); // YYYY-MM-DD format

  const [intradayData, setIntradayData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [openPositions, setOpenPositions] = useState([]);
  const [intradayProfit, setIntradayProfit] = useState(null);
  const [intradayProfitPercent, setIntradayProfitPercent] = useState(null);

  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Load stocks list on mount
  useEffect(() => {
    async function fetchStocks() {
      try {
        const res = await api.get("/api/stocks_list");
        if (Array.isArray(res.data)) {
          const list = res.data.map((item, idx) =>
            typeof item === "string"
              ? { ticker: item, stock_id: idx + 1 }
              : {
                  ticker: item.ticker || item.symbol || item,
                  stock_id: item.stock_id ?? item.id ?? idx + 1
                }
          );
          setStocksList(list);
          if (list.length) {
            setTicker(list[0].ticker);
            setStockId(list[0].stock_id);
            setDate(new Date().toISOString().slice(0, 10)); // default to today
          }
        } else {
          setError("Unexpected stocks list format");
        }
      } catch {
        setError("Failed to load stock list");
      } finally {
        setInitialLoading(false);
      }
    }
    fetchStocks();
  }, []);

  // Fetch data API on stockId or date change
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
        setError("");
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
  }, [stockId, date]);

  // Chart data generation
  const getChartData = () => {
    if (!intradayData.length) return null;

    const labels = intradayData.map((item) =>
      new Date(item.datetime).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      })
    );
    const closePoints = intradayData.map((item, idx) => ({ x: idx, y: item.close }));

    const buySellPoints = [];

    openPositions.forEach((pos) => {
      const addPoint = (time, type, color) => {
        const timeLabel = new Date(time).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata"
        });
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

      if (pos.signal === "CLOSED") {
        if (pos.buy_time) addPoint(pos.buy_time, "BUY", "#ef4444");  // BUY in red
        if (pos.sell_time) addPoint(pos.sell_time, "SELL", "#22c55e"); // SELL in green
      } else if (pos.signal === "BUY") {
        if (pos.buy_time) addPoint(pos.buy_time, "BUY", "#ef4444"); // BUY in red
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "BUY/SELL",
          data: buySellPoints,
          parsing: false,
          pointBackgroundColor: buySellPoints.map((pt) => pt.color),
          pointBorderColor: buySellPoints.map((pt) => pt.color),
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
              const selected = stocksList.find((s) => s.ticker === e.target.value);
              setTicker(e.target.value);
              setStockId(selected ? selected.stock_id : null);
            }}
            disabled={stocksList.length === 0}
          >
            <option value="">Select stock</option>
            {stocksList.map((s, i) => (
              <option key={i} value={s.ticker}>
                {s.ticker}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="button"
            onClick={() => {
              if (!stockId) setError("Please select a stock");
              else if (!date) setError("Please select a date");
              else setError("");
            }}
          >
            Load Chart
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Display metrics on top */}
      <div className="displaychart-metrics">
        <div className="displaychart-card">
          <div className="displaychart-label">Day Profit ₹</div>
          <div className="displaychart-value">
            {historicalData.length && historicalData[0].profit_value != null
              ? historicalData[0].profit_value.toFixed(2)
              : "-"}
          </div>
        </div>
        <div className="displaychart-card">
          <div className="displaychart-label">Day Profit %</div>
          <div className="displaychart-value">
            {historicalData.length && historicalData[0].profit_percent != null
              ? historicalData[0].profit_percent.toFixed(2) + "%"
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
            {intradayProfitPercent != null ? intradayProfitPercent.toFixed(2) + "%" : "-"}
          </div>
        </div>
        <div
          className={`displaychart-card ${
            historicalData.length && historicalData[0].status === "GAIN" ? "gain" : "loss"
          }`}
        >
          <div className="displaychart-label">Overall Status</div>
          <div className="displaychart-value">
            {historicalData.length ? historicalData[0].status : "-"}
          </div>
        </div>
        <div
          className={`displaychart-card ${
            intradayProfit != null && intradayProfit >= 0 ? "gain" : "loss"
          }`}
        >
          <div className="displaychart-label">Intraday Status</div>
          <div className="displaychart-value">
            {intradayProfit != null ? (intradayProfit >= 0 ? "GAIN" : "LOSS") : "-"}
          </div>
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
                  zoom: { pan: { enabled: true, mode: "x" }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" } }
                },
                scales: {
                  x: {
                    type: "category",
                    labels: chartConfig.labels,
                    ticks: { font: { size: 12 } },
                    title: { display: true, text: "Time (IST)" }
                  },
                  y: { ticks: { font: { size: 12 } }, title: { display: true, text: "Close Price" } }
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
              {openPositions.map((pos, idx) => {
                const rows = [];
                if (pos.buy_time) {
                  rows.push(
                    <tr key={`${idx}-buy`}>
                      <td>{getTimeAMPM(pos.buy_time)}</td>
                      <td className="displaychart-buy blink">📈 BUY</td>
                      <td>{pos.buy_price != null ? `₹${pos.buy_price.toFixed(2)}` : "—"}</td>
                    </tr>
                  );
                }
                if (pos.signal === "CLOSED" && pos.sell_time) {
                  rows.push(
                    <tr key={`${idx}-sell`}>
                      <td>{getTimeAMPM(pos.sell_time)}</td>
                      <td className="displaychart-sell">📉 SELL</td>
                      <td>{pos.sell_price != null ? `₹${pos.sell_price.toFixed(2)}` : "—"}</td>
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        ) : (
          <div className="displaychart-empty">No signals available.</div>
        )}
      </div>
    </div>
  );
}
