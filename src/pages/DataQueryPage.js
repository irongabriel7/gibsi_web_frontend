import React, { useState, useEffect } from "react";
import "../styles/App.css";
import "../styles/LiveGainers.css";
import "../styles/Loading.css";
import "../styles/DataQuery.css";
import api from "../apiClient";

export default function DataQueryPage() {
  const [tickers, setTickers] = useState([]);
  const [ticker, setTicker] = useState("");
  const [stockId, setStockId] = useState("");
  const [date, setDate] = useState("");
  const [db, setDb] = useState("intraday");
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStocks() {
      try {
        const res = await api.get("/api/stocks_list");
        if (Array.isArray(res.data)) {
          const stocksWithIds = res.data.map((ticker, idx) => ({
            ticker,
            stock_id: idx + 1,
          }));
          setTickers(stocksWithIds);
        } else {
          setError("Unexpected stocks list format");
          setTickers([]);
        }
      } catch (err) {
        console.error("Error fetching stock list:", err);
        setError("Failed to load stock list");
        setTickers([]);
      }
    }
    loadStocks();
  }, []);

  useEffect(() => {
    if (!ticker) {
      setStockId("");
      setData([]);
      return;
    }
    const selectedStock = tickers.find(
      (s) => s.ticker === ticker || s.symbol === ticker
    );
    if (selectedStock) {
      setStockId(selectedStock.stock_id ?? selectedStock.id ?? "");
    } else {
      setStockId("");
    }
    setData([]);
  }, [ticker, tickers]);

  const fetchData = async () => {
    if (!ticker) return setError("Please select a stock ticker.");
    if (db === "intraday" && !date)
      return setError("Please select a date for intraday data.");
    if (!stockId) return setError("Stock ID is required.");

    setError("");
    setLoading(true);
    try {
      const params = { db, ticker, stock_id: stockId, page, limit };
      if (db === "intraday") params.date = date;
      else if (db === "periodic_summary" && date) params.datetime = date;

      const res = await api.get("/api/data_query", { params });
      setData(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Error fetching data");
      setData([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const onPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  useEffect(() => {
    if (ticker && stockId) fetchData();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="app-container">
      <div className="header">Stock Data Query</div>
      <div className="main-content">
        <div className="card">
          <div className="controls">
            <label>
              Data Type:
              <select value={db} onChange={(e) => setDb(e.target.value)}>
                <option value="intraday">Intraday</option>
                <option value="periodic_summary">Periodic Summary</option>
              </select>
            </label>

            <label>
              Stock:
              <select value={ticker} onChange={(e) => setTicker(e.target.value)}>
                <option value="">-- Select --</option>
                {tickers.map((s) => (
                  <option
                    key={s.stock_id ?? s.id ?? s.ticker ?? s.symbol}
                    value={s.ticker ?? s.symbol}
                  >
                    {s.ticker ?? s.symbol}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date:
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </label>

            <button onClick={() => { setPage(1); fetchData(); }}>Fetch</button>
          </div>

          {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

          {loading ? (
            <div className="candlestick-loader">
              <div className="candles">
                <div className="candle red" />
                <div className="candle green" />
                <div className="candle red" />
              </div>
              Loading data...
            </div>
          ) : data.length === 0 ? (
            <div className="no-data">No data found.</div>
          ) : (
            <>
              <div className="table-wrapper responsive-table">
                <table className="stock-table fixed-width-table">
                    <thead>
                    <tr>
                        <th>#</th>
                        {Object.keys(data[0])
                        .filter((key) => key !== "_id")
                        .map((key) => (
                            <th key={key}>{key}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => {
                            const rowClass =
                            item.signal === "BUY"
                                ? "row-buy"
                                : item.signal === "SELL"
                                ? "row-sell"
                                : "";

                            return (
                            <tr key={item._id ?? index} className={rowClass}>
                                <td>{(page - 1) * limit + index + 1}</td>
                                {Object.entries(item)
                                .filter(([key]) => key !== "_id")
                                .map(([key, value]) => (
                                    <td key={key}>
                                    {typeof value === "number"
                                        ? value.toFixed(4)
                                        : String(value)}
                                    </td>
                                ))}
                            </tr>
                            );
                        })}
                    </tbody>             
                </table>
                </div>

              <div className="controls" style={{ justifyContent: "space-between" }}>
                <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="footer">© {new Date().getFullYear()} Stock Query Tool</div>
    </div>
  );
}
