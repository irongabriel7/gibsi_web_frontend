import React from "react";

export default function AlertButton() {
  const notify = () => {
    if (window.GIBSI?.notify) {
      // Explicit bridge call
      window.GIBSI.notify("Trading Alert", "Price crossed your threshold!");
    } else {
      // Fallback: normal alert() (also gets forwarded to native via your injection)
      alert("Price crossed your threshold!");
    }
  };

  return (
    <button
      onClick={notify}
      style={{
        padding: "10px 20px",
        fontSize: "16px",
        borderRadius: "8px",
        background: "#007bff",
        color: "white",
        border: "none",
        cursor: "pointer",
      }}
    >
      Trigger Alert
    </button>
  );
}