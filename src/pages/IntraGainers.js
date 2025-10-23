import React, { useEffect, useState, useRef } from "react";
import "../styles/IntraGainers.css";
import api from "../apiClient";

const SIGNAL_COLORS = {
  CLOSED: "#6B7280",
  SELL: "#c62828",
  BUY: "#2e7d32",
};

function formatTime(date) {
  // date is a JS Date object now
  return date.toLocaleTimeString("en-IN", {
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

  // Store server IST time as Date object
  const [currentTime, setCurrentTime] = useState(null);
  const serverTimeRef = useRef(null);

  useEffect(() => {
    fetchSignals();

    // Update server time every second by adding 1 second (simulate clock)
    const clockInterval = setInterval(() => {
      if (serverTimeRef.current) {
        serverTimeRef.current = new Date(serverTimeRef.current.getTime() + 1000);
        setCurrentTime(new Date(serverTimeRef.current));
      }
    }, 1000);

    // Refresh signals every 30 sec to get fresh server time & data
    const fetchInterval = setInterval(fetchSignals, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(fetchInterval);
    };
  }, []);

  async function fetchSignals() {
    setLoading(true);
    try {
      const marketResp = await api.get("/api/market_update");
      const marketData = marketResp.data;

      setMarketOpen(marketData.is_market_open);
      setLastTradingDay(marketData.last_trading_day);
      setNextMarketOpenTime(marketData.next_market_open);

      // Parse server_time_ist string like "2025-10-19 21:36:00" in IST as Date object
      // Treat as local time because IST is fixed offset +5:30
      if (marketData.server_time_ist) {
        // Replace space with 'T' and append ':00+05:30' for proper JS parsing
        const isoString = marketData.server_time_ist.replace(" ", "T") + "+05:30";
        const serverDate = new Date(isoString);
        serverTimeRef.current = serverDate;
        setCurrentTime(serverDate);
      }

      const signalsResp = await api.get("/api/live_intraday_gainers");
      const signalsData = signalsResp.data;

      const buys = [];
      const sells = [];

      (signalsData.stocks || []).forEach((s) => {
        if (s.signal === "BUY") {
          buys.push({
            ticker: s.symbol || s.ticker,
            time: s.buy_time || s.Datetime || null,
            price: s.buy_price || s.price || s.Adj_Close,
            reasons: s.reasons || "",
          });
        } else if (s.signal === "SELL" || s.signal === "CLOSED") {
          sells.push({
            ticker: s.symbol || s.ticker,
            time: s.sell_time || s.Datetime || null,
            price: s.sell_price || s.price || s.Adj_Close,
            reasons: s.reason || s.reasons || "",
            status: s.signal,
          });
        }
      });

      setBuySignals(buys);
      setSellSignals(sells);
    } catch (error) {
      console.error("Failed to fetch signals:", error);
      setBuySignals([]);
      setSellSignals([]);
    } finally {
      setLoading(false);
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
            {currentTime ? formatTime(currentTime) : "..."}
          </span>
        </div>
      </header>

      {!marketOpen && (
        <section className="market-info">
          <p>Last Trading Day: {lastTradingDay}</p>
          <p>Next Market Open: {nextMarketOpenTime}</p>
        </section>
      )}

      {loading ? (
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
                    <th>Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {buySignals.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.ticker}</td>
                      <td>{s.time ? formatTime(new Date(s.time)) : "-"}</td>
                      <td>₹{s.price?.toFixed(2)}</td>
                      <td>
                        <small className="reason-text">{s.reasons}</small>
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
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {sellSignals.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.ticker}</td>
                      <td>{s.time ? formatTime(new Date(s.time)) : "-"}</td>
                      <td>₹{s.price?.toFixed(2)}</td>
                      <td style={{ color: SIGNAL_COLORS[s.status] || "#374151", fontWeight: "700" }}>
                        {s.status}
                      </td>
                      <td>
                        <small className="reason-text">{s.reasons}</small>
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
