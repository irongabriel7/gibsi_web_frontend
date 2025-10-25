import React, { useEffect, useState, useRef } from "react";
import "../styles/IntraGainers.css";
import api from "../apiClient";

const SIGNAL_COLORS = {
  CLOSED: "#6B7280",
  SELL: "#c62828",
  BUY: "#2e7d32",
};

// Parse backend date to JS Date
function parseBackendDate(dateObj) {
  if (!dateObj) return null;
  const isoString = dateObj.$date;
  if (!isoString) return null;
  return new Date(isoString);
}

// Convert to 12-hour AM/PM time display
function formatTo12Hour(date) {
  if (!date) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function IntraGainerDashboard() {
  const [buySignals, setBuySignals] = useState([]);
  const [sellSignals, setSellSignals] = useState([]);
  const [marketOpen, setMarketOpen] = useState(false);
  const [lastTradingDay, setLastTradingDay] = useState("");
  const [nextMarketOpenTime, setNextMarketOpenTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const serverTimeRef = useRef(null);
  const scrollYRef = useRef(window.scrollY);

  useEffect(() => {
    fetchSignals();

    // Start local clock sync
    const clockInterval = setInterval(() => {
      if (serverTimeRef.current) {
        serverTimeRef.current = new Date(serverTimeRef.current.getTime() + 1000);
        setCurrentTime(new Date(serverTimeRef.current));
      }
    }, 1000);

    // Refresh every 30 seconds
    const fetchInterval = setInterval(() => {
      scrollYRef.current = window.scrollY; // Save scroll position
      fetchSignals(false); // silent refresh
    }, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(fetchInterval);
    };
  }, []);

  async function fetchSignals(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const marketResp = await api.get("/api/market_update");
      const marketData = marketResp.data;
      setMarketOpen(marketData.is_market_open);
      setLastTradingDay(marketData.last_trading_day);
      setNextMarketOpenTime(marketData.next_market_open);

      if (marketData.server_time_ist) {
        const serverDate = new Date(marketData.server_time_ist.replace(" ", "T") + "+05:30");
        serverTimeRef.current = serverDate;
        setCurrentTime(serverDate);
      }

      const signalsResp = await api.get("/api/live_intra_gainers");
      const signalsData = signalsResp.data;

      const newBuys = [];
      const newSells = [];

      (signalsData.stocks || []).forEach((s) => {
        if (s.buy_time) {
          newBuys.push({
            ticker: s.ticker || s.symbol,
            time: parseBackendDate(s.buy_time),
            price: s.buy_price,
            status: "BUY",
          });
        }
        if (s.signal === "SELL" && s.sell_time) {
          newSells.push({
            ticker: s.ticker || s.symbol,
            sellTime: parseBackendDate(s.sell_time),
            sellPrice: s.sell_price,
            profit: s.profit_pct != null ? s.profit_pct.toFixed(2) : "-",
            status: "SELL",
          });
        }
      });

      // Update only if data actually changed
      const buysChanged = JSON.stringify(newBuys) !== JSON.stringify(buySignals);
      const sellsChanged = JSON.stringify(newSells) !== JSON.stringify(sellSignals);

      if (buysChanged) setBuySignals(newBuys);
      if (sellsChanged) setSellSignals(newSells);

      // Smoothly restore scroll after update
      if (!initialLoad) {
        setTimeout(() => window.scrollTo({ top: scrollYRef.current, behavior: "smooth" }), 100);
      } else {
        setInitialLoad(false);
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  return (
    <div className="intra-gainer-container">
      <header>
        <h1>Intraday Market Signals</h1>
        <div>
          <span className={`market-status ${marketOpen ? "market-open" : "market-closed"}`}>
            {marketOpen ? "🟢 Market Open" : "🔴 Market Closed"}
          </span>
          <span className="clock" style={{ marginLeft: 12 }}>
            {currentTime ? formatTo12Hour(currentTime) : "..."}
          </span>
        </div>
      </header>

      {!marketOpen && (
        <section className="market-info">
          <p>Last Trading Day: {lastTradingDay}</p>
          <p>Next Market Open: {nextMarketOpenTime}</p>
        </section>
      )}

      {loading && initialLoad ? (
        <p className="loading-message">Loading signals...</p>
      ) : (
        <>
          <section style={{ marginBottom: 40 }}>
            <h2>Buy Signals</h2>
            {buySignals.length === 0 ? (
              <p className="no-data-message">No buy signals at the moment.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ticker</th>
                    <th>Buy Time</th>
                    <th>Buy Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {buySignals.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.ticker}</td>
                      <td>{s.time ? formatTo12Hour(s.time) : "-"}</td>
                      <td>₹{s.price?.toFixed(2)}</td>
                      <td
                        className="buy-status synced-blink"
                        style={{
                          color: "#fff",
                          fontWeight: "700",
                          backgroundColor: SIGNAL_COLORS.BUY,
                          padding: "4px 8px",
                          borderRadius: 4,
                          textAlign: "center",
                        }}
                      >
                        BUY
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Sell Signals</h2>
            {sellSignals.length === 0 ? (
              <p className="no-data-message">No sell signals at the moment.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ticker</th>
                    <th>Sell Time</th>
                    <th>Sell Price</th>
                    <th>Profit %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sellSignals.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.ticker}</td>
                      <td>{s.sellTime ? formatTo12Hour(s.sellTime) : "-"}</td>
                      <td>₹{s.sellPrice?.toFixed(2)}</td>
                      <td style={{ color: s.profit >= 0 ? "green" : "red" }}>
                        {s.profit !== "-" ? `${s.profit}%` : "-"}
                      </td>
                      <td
                        className="sell-status synced-blink"
                        style={{
                          color: "#fff",
                          fontWeight: "700",
                          backgroundColor: SIGNAL_COLORS.SELL,
                          padding: "4px 8px",
                          borderRadius: 4,
                          textAlign: "center",
                        }}
                      >
                        SELL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
