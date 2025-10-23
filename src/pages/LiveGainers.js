import React, { useEffect, useState } from "react";
import "../styles/LiveGainers.css";
import "../styles/Loading.css";
import api from "../apiClient";

export default function LiveIntradayGainers() {
  const [stocks, setStocks] = useState([]);
  const [marketOpen, setMarketOpen] = useState(true);
  const [nextMarketOpenTime, setNextMarketOpenTime] = useState("");
  const [lastTradingDay, setLastTradingDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Fetch initial data and server time
    fetchStockData();
    fetchServerTime();

    // Refresh stock data every 30 seconds
    const interval = setInterval(() => {
      fetchStockData();
      fetchServerTime();
    }, 30000);

    // Increment time state every second locally
    const clockInterval = setInterval(() => {
      setTime((prevTime) => new Date(prevTime.getTime() + 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Fetch stock data and market info
  const fetchStockData = async () => {
    try {
      const qes = await api.get("/api/market_update");
      const res = await api.get("/api/live_intraday_gainers");
      setMarketOpen(qes.data.is_market_open);
      setNextMarketOpenTime(qes.data.next_market_open);
      setLastTradingDay(qes.data.last_trading_day);
      setStocks(res.data.stocks || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching live gainers:", err);
      setLoading(false);
    }
  };

  // Fetch server time from backend and update time state
  const fetchServerTime = async () => {
    try {
      const response = await api.get("/api/market_update");
      const serverTimeStr = response.data.server_time_ist; // "YYYY-MM-DD HH:mm:ss"
      // Parse server time string as Date (treating it as local IST)
      // new Date() parsing assumes local timezone, so convert accordingly:
      const [datePart, timePart] = serverTimeStr.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute, second] = timePart.split(":").map(Number);
      // Create a Date object in IST (Asia/Kolkata) timezone by constructing with UTC then adjusting offset
      // IST is UTC+5:30, so convert time to UTC by subtracting 5h30m
      const utcTime = new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second));
      setTime(utcTime);
    } catch (err) {
      console.error("Error fetching server time:", err);
    }
  };

  const formatClock = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata", // ensure display is in IST
    });
  };

  useEffect(() => {
    if (loading) {
      const generated = Array.from({ length: 7 }, () => {
        const isGreen = Math.random() > 0.5;
        const height = Math.floor(Math.random() * 80) + 40;
        return { color: isGreen ? "green" : "red", height };
      });
      setCandles(generated);
    }
  }, [loading]);

  const getArrowCount = (change) => {
    const abs = Math.abs(change);
    if (abs >= 2) return 3;
    if (abs >= 1) return 2;
    return 1;
  };

  return (
    <div className="live-gainers-container">
      <div className="content-wrapper">
        <div className="header">
          <h2>📊 Live Intraday Gainers / Losers</h2>
          <div className={`market-banner ${marketOpen ? "open" : "closed"}`}>
            <span className="market-status">
              {marketOpen ? "🟢 Market Open" : "🔴 Market Closed"}
            </span>
            <span className="clock">{formatClock(time)}</span>
            {!marketOpen && (
              <div className="market-details">
                <span>Last Trading Day: {lastTradingDay}</span>
                <span>Next Open: {nextMarketOpenTime}</span>
              </div>
            )}
          </div>
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
            <p>Loading Live Intraday Data...</p>
          </div>
        ) : stocks.length === 0 ? (
          <p className="no-data">No data available.</p>
        ) : (
          <div className="table-wrapper full-table">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Profit/Loss</th>
                  <th>% Change</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s, index) => {
                  return (
                    <tr key={index} className={s.change >= 0 ? "gain" : "loss"}>
                      <td>{index + 1}</td>
                      <td>{s.symbol}</td>
                      <td>{Number(s.price).toFixed(2)}</td>
                      <td>
                        <span className={`profit-wrapper ${s.profit >= 0 ? "up" : "down"}`}>
                          {s.profit >= 0 ? `+${s.profit}` : `${s.profit}`}
                        </span>
                      </td>
                      <td>
                        <span className={`change-with-arrows ${s.change >= 0 ? "up" : "down"}`}>
                          {s.change >= 0 ? `+${s.change.toFixed(2)}%` : `${s.change.toFixed(2)}%`}
                          <div className={`arrow-stack ${s.change >= 0 ? "up" : "down"}`}>
                            {[...Array(getArrowCount(parseFloat(s.change)))].map((_, i) => (
                              <span key={i} className="arrow" />
                            ))}
                          </div>
                        </span>
                      </td>
                      <td>
                        <span className={`signal-badge ${s.signal?.toLowerCase()}`}>
                          {s.signal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
