import React, { useState } from "react";
import api from "../apiClient";
import "../styles/Export.css";

const COLLECTION_OPTIONS = [
  { value: "periodic_summary", label: "Periodic Summary" },
  { value: "intraday", label: "Intraday" },
  { value: "historical", label: "Historical" },
  { value: "open_positions", label: "Open Positions" },
  { value: "login", label: "Login" }
];

const ExportPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [collection, setCollection] = useState("periodic_summary");

  const isInvalidDateRange = () => {
    return (
      !startDate ||
      !endDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      endDate < startDate
    );
  };

  const handleExport = async () => {
    if (isInvalidDateRange()) {
      setMessage("End date should be equal to or after Start date, in YYYY-MM-DD format.");
      setStatus("error");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.get("/api/db/export", {
        params: {
          start_date: startDate,
          end_date: endDate,
          collection: collection
        },
        responseType: "blob"
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `${collection}_${startDate}_to_${endDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMessage(`Downloaded ${collection}_${startDate}_to_${endDate}.csv`);
      setStatus("success");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Network error. Please try again later.";
      setMessage(msg);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isInvalidDateRange()) {
      setMessage("End date should be equal to or after Start date, in YYYY-MM-DD format.");
      setStatus("error");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      await api.delete("/api/db/delete", {
        data: {
          start_date: startDate,
          end_date: endDate,
          collection: collection
        }
      });
      setMessage(`Deleted data from ${collection} between ${startDate} and ${endDate}.`);
      setStatus("success");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Network error. Please try again later.";
      setMessage(msg);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <h1 className="export-title">📤 Export Collection Data</h1>
      <p className="export-subtitle">
        Choose date range and collection to export as CSV.
      </p>

      <div className="form-card">
        <label className="date-label">Collection:</label>
        <select
          value={collection}
          onChange={e => setCollection(e.target.value)}
          className="collection-select"
          disabled={loading}
        >
          {COLLECTION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="date-label">Start Date:</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="date-input"
          disabled={loading}
          max={endDate || undefined}
        />
        <label className="date-label">End Date:</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="date-input"
          disabled={loading}
          min={startDate || undefined}
        />
        <div className="button-group">
          <button
            onClick={handleExport}
            disabled={
              loading ||
              isInvalidDateRange()
            }
            className="export-btn"
          >
            {loading ? "Exporting..." : "Export & Send"}
          </button>
          <button
            onClick={handleDelete}
            disabled={
              loading ||
              isInvalidDateRange()
            }
            className="delete-btn"
          >
            {loading ? "Deleting..." : "Delete Data"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`status-box ${status}`}>
          {status === "success" ? "✅" : "❌"} {message}
        </div>
      )}
    </div>
  );
};

export default ExportPage;
