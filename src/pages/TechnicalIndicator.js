import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import api from "../apiClient";

const API_URL = "/api/technical_signals";
const STOCKS_LIST_URL = "/api/stocks_list";

export default function TechnicalIndicatorChart() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState("");
  const [mode, setMode] = useState("day");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    api
      .get(STOCKS_LIST_URL)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setStocks(res.data);
          if (res.data.length > 0) {
            setSelectedStock(res.data[0]);
          }
        }
      })
      .catch((err) => console.error("❌ Stock list fetch error:", err));
  }, []);

  useEffect(() => {
    if (!selectedStock) return;

    api
      .get(API_URL, {
        params: {
          ticker: selectedStock, // assumes stock list already has full ticker like "PETRONET.NS"
          mode,
        },
      })
      .then((res) => {
        const signals = res.data?.[0]?.signals || [];
        console.log("📡 Raw API response:", res.data);

        const timestampMap = new Map();
        const transformed = signals.map((s) => {
          let ts = new Date(s.Datetime).toLocaleString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "short",
          });

          // Make timestamp unique
          if (timestampMap.has(ts)) {
            const count = timestampMap.get(ts) + 1;
            timestampMap.set(ts, count);
            ts = `${ts} (${count})`;
          } else {
            timestampMap.set(ts, 1);
          }

          return {
            timestamp: ts,
            price: s.price,
            signal: s.signal,
          };
        });

        console.log("📊 Transformed Chart Data:", transformed);
        setChartData(transformed);
      })
      .catch((err) => console.error("❌ Signal fetch error:", err));
  }, [selectedStock, mode]);

  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.signal === "BUY") {
      return <circle cx={cx} cy={cy} r={6} fill="green" stroke="darkgreen" strokeWidth={2} />;
    }
    if (payload.signal === "SELL") {
      return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill="red" stroke="darkred" strokeWidth={2} />;
    }
    return null;
  };

  return (
    <div className="p-4 w-full min-w-[1000px]">
      <div className="mb-4 flex gap-4">
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          className="p-2 border rounded"
        >
          {stocks.map((stock) => (
            <option key={stock} value={stock}>
              {stock}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="day">Intraday</option>
          <option value="hour">Hourly</option>
        </select>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center text-gray-500">No data available</div>
      ) : (
        <ResponsiveContainer width={800} height={800}>
          <LineChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={70} />
            <YAxis tickFormatter={(v) => `₹${v.toFixed(2)}`} />
            <Tooltip formatter={(val) => `₹${val.toFixed(2)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              name="Price"
              stroke="#1e88e5"
              strokeWidth={2}
              dot={renderDot}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
