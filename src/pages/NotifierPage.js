import React, { useState, useEffect } from "react";
import "../styles/Notifier.css";
import api from "../apiClient";

export default function NotifierPage() {
  const [title, setTitle] = useState("GIBSI Alert");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const [userOptions, setUserOptions] = useState([]);
  const [recipientGid, setRecipientGid] = useState("all");

  useEffect(() => {
    api.get("/api/alerts/active_users")
      .then(res => setUserOptions(res.data || []))
      .catch(() => setUserOptions([]));
  }, []);

  async function handleAlert(e) {
    e.preventDefault();
    setSending(true);
    setStatus("");
    try {
      let resp;
      if (recipientGid === "all") {
        resp = await api.post("/api/alerts/broadcast", { title, message });
        setStatus(`✅ Sent to ${resp.data.sent} devices${resp.data.errors?.length ? `. Errors: ${resp.data.errors.length}` : ""}`);
      } else {
        resp = await api.post(`/api/alerts/send_to_user/${recipientGid}`, { title, message });
        setStatus(resp.data.status === "ok" ? "✅ Sent to user." : `❌ Error: ${resp.data.error || "Unknown error"}`);
      }
    } catch {
      setStatus("❌ Error sending notification!");
    }
    setSending(false);
  }

  return (
    <div className="notifier-bg">
      <form className="notifier-form" onSubmit={handleAlert}>
        <h2 className="notifier-heading">🚀 GIBSI APP Notifier Console</h2>
        <div className="notifier-field">
          <label className="notifier-label">Recipient</label>
          <select
            value={recipientGid}
            onChange={e => setRecipientGid(e.target.value)}
            className="notifier-select"
            disabled={sending}
          >
            <option value="all">Broadcast to All</option>
            {userOptions.map(u => (
              <option key={u.gid} value={u.gid}>{u.username}</option>
            ))}
          </select>
        </div>
        <div className="notifier-field">
          <label className="notifier-label">Notification Title</label>
          <input
            className="notifier-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder="Short summary (e.g. GIBSI Alert)"
            disabled={sending}
          />
        </div>
        <div className="notifier-field">
          <label className="notifier-label">Notification Message</label>
          <textarea
            className="notifier-textarea"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            maxLength={500}
            rows={4}
            placeholder="What do you want to broadcast?"
            disabled={sending}
          />
        </div>
        <button
          type="submit"
          className={sending ? "notifier-btn disabled" : "notifier-btn"}
          disabled={sending}
        >
          {sending ? (recipientGid === "all" ? "Broadcasting..." : "Sending...") : "Send 🚨"}
        </button>
        {status && <div className="notifier-status">{status}</div>}
      </form>
      <div className="notifier-glow"></div>
    </div>
  );
}
