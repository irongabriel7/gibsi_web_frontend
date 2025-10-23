import React, { useEffect, useState } from "react";
import "../styles/TopGainers.css";
import "../styles/Loading.css"; // Include your loader CSS
import api from "../apiClient";

export default function TopGainers() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    api.get("/api/top_gainers")
      .then((res) => {
        setStocks(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching gainers:", err);
        setLoading(false);
      });
  }, []);

  // Generate random candlesticks on first render
  useEffect(() => {
    if (loading) {
      const generated = Array.from({ length: 7 }, (_, i) => {
        const isGreen = Math.random() > 0.5;
        const height = Math.floor(Math.random() * 80) + 40; // 40px to 120px
        return { color: isGreen ? "green" : "red", height };
      });
      setCandles(generated);
    }
  }, [loading]);

  return (
    <div className="top-gainers-container">
      <div className="content-wrapper">
        <div className="header">
          <h2 >📈 Top Gainers / Losers</h2>

        </div>

        {loading ? (
          <div className="candlestick-loader">
            <div className="candles">
              {candles.map((candle, idx) => (
                <div
                  key={idx}
                  className={`candle ${candle.color}`}
                  style={{ height: `${candle.height}px` }}
                />
              ))}
            </div>
            <p>Analyzing Market Trends...</p>
          </div>
        ) : (
          stocks.length === 0 ? (
            <p className="no-data">No data available.</p>
          ) : (
            <div className="table-wrapper">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Stock</th>
                    <th>7-Day %</th>
                    <th>7-Day Profit</th>
                    <th>30-Day %</th>
                    <th>30-Day Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s, idx) => (
                    <tr key={idx} className={(s["7d_percent"] ?? 0) >= 0 ? "profit-row" : "loss-row"}>
                      <td>{idx + 1}</td> {/* 👈 Serial number */}
                      <td>{s.stock}</td>
                      <td>{s["7d_percent"] !== null ? s["7d_percent"].toFixed(2) + "%" : "N/A"}</td>
                      <td>{s["7d_profit"] ?? "N/A"}</td>
                      <td>{s["30d_percent"] !== null ? s["30d_percent"].toFixed(2) + "%" : "N/A"}</td>
                      <td>{s["30d_profit"] ?? "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
