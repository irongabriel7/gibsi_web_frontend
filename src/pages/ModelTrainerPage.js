import React, { useState, useEffect } from "react";
import api from "../apiClient";
import "../styles/ModelTrainer.css";

export default function ModelTrainerPage() {
  const [stockName, setStockName] = useState("");
  const [validName, setValidName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);
  const [isTickerValid, setIsTickerValid] = useState(false);
  const [showPrepare, setShowPrepare] = useState(false);
  const [trainingSetMessage, setTrainingSetMessage] = useState("");

  useEffect(() => {
    const today = new Date().getDay();
    setIsWeekend(today === 0 || today === 6);
  }, []);

  const validateStockNameFormat = (name) => {
    const regex = /^[A-Za-z0-9.]+$/;
    return regex.test(name);
  };

  useEffect(() => {
    if (stockName.length > 0 && validateStockNameFormat(stockName)) {
      setValidName(true);
      setError("");
      setIsTickerValid(false);
      setShowPrepare(false);
      setMessage("");
      setTrainingSetMessage("");
    } else {
      setValidName(false);
      setIsTickerValid(false);
      setShowPrepare(false);
      setTrainingSetMessage("");
      if (stockName.length > 0) setError("Invalid stock name format");
      else setError("");
    }
  }, [stockName]);

  const checkTicker = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setIsTickerValid(false);
    setShowPrepare(false);
    setTrainingSetMessage("");
    try {
      const resp = await api.get(`/api/stock-check/${stockName}`);
      if (resp.data?.success) {
        setIsTickerValid(true);
        setMessage(`Ticker ${stockName} is valid.`);
      } else {
        const errMsg =
          resp.data?.message ||
          resp.data?.error?.description ||
          "Ticker not valid";
        setError(errMsg);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const errMsg =
          err.response.data.message ||
          err.response.data.error?.description ||
          "Error communicating with server";
        setError(errMsg);
      } else {
        setError("Error communicating with server");
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadCsvData = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setTrainingSetMessage("");
    try {
      const resp = await api.get(`/api/stock-data/${stockName}`);
      if (resp.data?.success) {
        setMessage(`Data downloaded and saved for ${stockName}.`);
        setShowPrepare(true); // Show Prepare for Training button
      } else {
        setError(resp.data?.message || "Failed to download data");
      }
    } catch {
      setError("Error downloading data");
    } finally {
      setLoading(false);
    }
  };

  // Call backend route to set flag for new trainer and show training message
  const prepareForTraining = async () => {
    setLoading(true);
    setError("");
    setTrainingSetMessage("");
    try {
      const resp = await api.post("/api/control/set_flag", {
        flagname: "new_trainer",
        flagvalue: false,
      });

      if (resp.data?.success) {
        // Modify message as needed with date info; example uses current date
        const weekendDate = new Date();
        // Example: get next Saturday date
        const day = weekendDate.getDay();
        const daysTillSaturday = (6 - day + 7) % 7; 
        weekendDate.setDate(weekendDate.getDate() + daysTillSaturday);
        const options = { year: "numeric", month: "long", day: "numeric" };
        const formattedDate = weekendDate.toLocaleDateString(undefined, options);

        setTrainingSetMessage(`Set for Weekend training on ${formattedDate}.`);
        setShowPrepare(false); // Hide Prepare button after setting flag
      } else {
        setError(resp.data?.message || "Failed to set training flag");
      }
    } catch {
      setError("Error communicating with server to set training flag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="model-trainer-page">
      <header className="page-header">
        <h1>Model Trainer - Download Stock Data</h1>
      </header>
      <div className="form-container">
        <label htmlFor="stockName" className="form-label">
          Enter Stock Name:
        </label>
        <input
          id="stockName"
          type="text"
          value={stockName}
          onChange={(e) => setStockName(e.target.value.toUpperCase())}
          placeholder="E.g., RELIANCE.NS"
          disabled={loading}
          autoFocus
          className={`text-input ${error ? "input-error" : ""}`}
        />

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {/* Check Ticker Button */}
        <button
          onClick={checkTicker}
          disabled={!validName || loading || isTickerValid}
          className={`btn ${
            validName && !loading && !isTickerValid ? "btn-primary" : "btn-disabled"
          }`}
        >
          {loading && !isTickerValid ? "Checking..." : "Check Ticker"}
        </button>

        {/* Download Button appears after ticker validation */}
        {isTickerValid && !showPrepare && (
          <button
            onClick={downloadCsvData}
            disabled={loading}
            className={`btn ${!loading ? "btn-primary" : "btn-disabled"}`}
          >
            {loading ? "Downloading..." : "Download Data"}
          </button>
        )}

        {/* Prepare for Training button appears after download */}
        {showPrepare && (
          <button
            onClick={prepareForTraining}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? "Processing..." : "Prepare for Training"}
          </button>
        )}

        {/* Show Training Set Message */}
        {trainingSetMessage && (
          <div className="success-message">{trainingSetMessage}</div>
        )}

        <div className="weekend-info">
          {isWeekend ? (
            <div>
              Today is weekend. The model trainer will train this data during the
              weekend.
            </div>
          ) : (
            <div>Today is a weekday. Training will be performed over the weekend.</div>
          )}
        </div>
      </div>
    </div>
  );
}
