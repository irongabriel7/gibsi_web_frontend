import React, { useState } from 'react';
import api from "../apiClient";
import "../styles/Analyzer.css"; // Updated CSS

function PurchasesByDate() {
  const [date, setDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    const parsed = parseFloat(num);
    return isNaN(parsed) ? '-' : parsed.toFixed(2);
  };

  const fetchPurchases = async () => {
    if (!date) {
      setError('Please select a date.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const response = await api.get(`/api/purchases_by_date?date=${date}`);
      setData(response.data);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(err.message || 'Failed to fetch data');
      }
    }
    setLoading(false);
  };

  return (
    <div className="analyzer-container">
      <div className="header-section">
        <h2>📈 Stock Purchases Analyzer</h2>
        <div className="input-section">
          <label htmlFor="dateInput">Select Date:</label>
          <input
            id="dateInput"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={fetchPurchases} disabled={loading}>
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {data && (
        <div className="table-section">
          <p className="summary">
            Showing <strong>{data.count}</strong> purchase{data.count !== 1 ? 's' : ''} for date:{" "}
            <strong>{data.date}</strong>
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Buy Price</th>
                <th>Buy Time</th>
                <th>Expected Sell Close</th>
                <th>Expected Sell Time</th>
                <th>Max Profit %</th>
                <th>Reason</th>
                <th>Signal</th>
                <th>Stock ID</th>
                <th>Profit %</th>
                <th>Sell Price</th>
                <th>Sell Time</th>
                <th>Trade Signal</th>
              </tr>
            </thead>
            <tbody>
              {data.purchases.map((purchase, index) => {
                const profit = parseFloat(purchase.profit_pct);
                const rowClass =
                  profit > 0
                    ? 'profit-row'
                    : profit < 0
                    ? 'loss-row'
                    : 'neutral-row';
                return (
                  <tr key={index} className={rowClass}>
                    <td>{purchase.ticker}</td>
                    <td>{formatNumber(purchase.buy_price)}</td>
                    <td>{purchase.buy_time}</td>
                    <td>{formatNumber(purchase.expected_sell_close)}</td>
                    <td>{purchase.expected_sell_time}</td>
                    <td>{formatNumber(purchase.max_profit_pct)}</td>
                    <td>{purchase.reason}</td>
                    <td>{purchase.signal}</td>
                    <td>{purchase.stock_id}</td>
                    <td>{formatNumber(purchase.profit_pct)}</td>
                    <td>{formatNumber(purchase.sell_price)}</td>
                    <td>{purchase.sell_time}</td>
                    <td>{purchase.trade_signal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PurchasesByDate;
