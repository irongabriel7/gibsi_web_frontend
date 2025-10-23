import React, { useEffect, useMemo, useState } from "react";
import api from "../apiClient";
import { motion } from "framer-motion";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  ThermometerSun,
  AlertTriangle,
  Play,
  Pause,
  RotateCw,
  Square
} from "lucide-react";
import "../styles/Health.css";

export default function HealthPage({ profile }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await api.get("/api/health");
      setHealth(res.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch system health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 4000);
    return () => clearInterval(id);
  }, []);

  const metrics = useMemo(() => {
    if (!health) return null;
    return {
      cpu: clamp(Number(health?.cpu?.cpu_percent)),
      mem: clamp(Number(health?.memory?.memory_percent)),
      disk: clamp(Number(health?.disk?.disk_percent)),
      netUp: Number(health?.network?.bytes_sent_mb) || 0,
      netDown: Number(health?.network?.bytes_recv_mb) || 0,
      gpuTemp: health?.gpu?.gpu_temp ?? "N/A",
      memDetail: `${health?.memory?.memory_used_gb} GB / ${health?.memory?.memory_total_gb} GB`,
      diskDetail: `${health?.disk?.disk_used_gb} GB / ${health?.disk?.disk_total_gb} GB`,
    };
  }, [health]);

  const processStatuses = useMemo(() => {
    if (!health?.process_statuses) return null;
    const ps = health.process_statuses;
    return {
      stocks_fetcher: ps.stocks_fetcher?.status ?? "unknown",
      trade_engine: ps.trade_engine?.status ?? "unknown",
      model_trainer: ps.model_trainer?.status ?? "unknown",
      notifier: ps.notifier?.status ?? "unknown", // new notifier process
    };
  }, [health]);

  const handleProcessAction = async (process, action) => {
    setUpdating(true);
    try {
      await api.post(`/api/control/${process}/status`, { status: action });
      await fetchHealth();
    } catch (err) {
      console.error(`Failed to ${action} ${process}`, err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="health-page">
        <div className="health-loader neon-text">Initializing telemetry…</div>
      </div>
    );
  }

  return (
    <div className="health-page">
      {/* Top bar */}
      <header className="health-header">
        <h1 className="neon-text">System Health</h1>
        <div className="header-right">
          {error ? (
            <span className="chip chip-warn">
              <AlertTriangle className="mr-1" size={16} />
              {error}
            </span>
          ) : (
            <span className="chip chip-ok">Live</span>
          )}
        </div>
      </header>

      {/* Main metrics grid */}
      <div className="health-grid">
        <GaugeCard title="CPU" icon={<Cpu />} value={metrics.cpu} color="var(--c-cyan)" />
        <GaugeCard
          title="Memory"
          icon={<MemoryStick />}
          value={metrics.mem}
          color="var(--c-purple)"
          subtitle={metrics.memDetail}
        />
        <GaugeCard
          title="Disk"
          icon={<HardDrive />}
          value={metrics.disk}
          color="var(--c-pink)"
          subtitle={metrics.diskDetail}
        />

        <InfoCard title="Network I/O" icon={<Network />}>
          <div className="net-io">
            <div><span className="label">Up</span><span className="val">{metrics.netUp.toFixed(2)} MB</span></div>
            <div><span className="label">Down</span><span className="val">{metrics.netDown.toFixed(2)} MB</span></div>
          </div>
          <div className="bars">
            <Bar pct={scaleToBar(metrics.netUp)} color="var(--c-green)" />
            <Bar pct={scaleToBar(metrics.netDown)} color="var(--c-blue)" />
          </div>
        </InfoCard>

        <InfoCard title="GPU Temp" icon={<ThermometerSun />}>
          <div className="gpu-wrap">
            <ThermalSVG />
            <div className="gpu-temp neon-text">{metrics.gpuTemp}</div>
          </div>
        </InfoCard>

        <InfoCard title="Cooling System">
          <div className="cooling"><FanSVG /><div className="cooling-label">Fans Operational</div></div>
        </InfoCard>
      </div>

      {/* Process Status Section */}
      {processStatuses && (
        <div className="process-status-container">
          <h2 className="neon-text">Process Controls</h2>
          <div className="process-status-grid">
            {Object.entries(processStatuses).map(([key, status]) => {
              const trainerDetails = health?.process_statuses?.model_trainer || {};

              // Assign individual signals
              let signalActive = null;
              if (key === "stocks_fetcher") signalActive = trainerDetails.stocks_fetcher_status;
              else if (key === "trade_engine") signalActive = trainerDetails.trade_engine_status;
              else if (key === "model_trainer") signalActive = trainerDetails.model_training_status;

              return (
                <div key={key} className={`process-status-card ${statusColor(status)}`}>
                  <div className="process-card-header">
                    <div className="process-name">{key.replace(/_/g, " ").toUpperCase()}</div>
                    <div className="process-status">{String(status).toUpperCase()}</div>
                  </div>

                  {/* Individual process indicator (if applicable) */}
                  {signalActive !== null && (
                    <IndicatorSignal
                      label="Status"
                      active={signalActive}
                    />
                  )}

                  <div className="process-actions">
                    {profile?.usertype === "admin" ? (
                      key === "notifier" ? (
                        <>
                          <ActionButton
                            icon={<Play size={16} />}
                            label="Start"
                            onClick={() => handleProcessAction(key, "start")}
                            disabled={updating}
                          />
                          <ActionButton
                            icon={<Square size={16} />}
                            label="Stop"
                            onClick={() => handleProcessAction(key, "stop")}
                            disabled={updating}
                          />
                        </>
                      ) : (
                        <>
                          <ActionButton
                            icon={<Play size={16} />}
                            label="Start"
                            onClick={() => handleProcessAction(key, "start")}
                            disabled={updating}
                          />
                          <ActionButton
                            icon={<Pause size={16} />}
                            label="Pause"
                            onClick={() => handleProcessAction(key, "pause")}
                            disabled={updating}
                          />
                          <ActionButton
                            icon={<RotateCw size={16} />}
                            label="Restart"
                            onClick={() => handleProcessAction(key, "restart")}
                            disabled={updating}
                          />
                          <ActionButton
                            icon={<Square size={16} />}
                            label="Stop"
                            onClick={() => handleProcessAction(key, "stop")}
                            disabled={updating}
                          />
                        </>
                      )
                    ) : (
                      <span className="process-view-only">Actions restricted</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      <div className="hud">
        <MiniGauge label="CPU" value={metrics.cpu} />
        <MiniGauge label="MEM" value={metrics.mem} />
        <MiniGauge label="DSK" value={metrics.disk} />
      </div>
    </div>
  );
}

/* ---------- Utility Components ---------- */
function ActionButton({ icon, label, onClick, disabled }) {
  return (
    <button className="process-btn" onClick={onClick} disabled={disabled}>
      {icon} {label}
    </button>
  );
}

function IndicatorSignal({ label, active }) {
  return (
    <div className="indicator-signal">
      <span
        className={`indicator-dot ${active ? "indicator-on" : "indicator-off"}`}
      />
      <span className="indicator-label">
        {label}: {active ? "Online" : "Offline"}
      </span>
    </div>
  );
}

/* ---------- Info Cards, Gauges, Bars ---------- */
function InfoCard({ title, icon, children }) {
  return (
    <motion.div className="card system-card" whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
      <div className="card-head"><span className="card-icon">{icon}</span><span className="card-title">{title}</span></div>
      <div className="card-body">{children}</div>
    </motion.div>
  );
}

function GaugeCard({ title, icon, value, color, subtitle }) {
  const r = 52, C = 2 * Math.PI * r, pct = clamp(value), dashOffset = C * (1 - pct / 100);
  return (
    <InfoCard title={title} icon={icon}>
      <div className="gauge">
        <svg viewBox="0 0 140 140" className="gauge-svg">
          <circle cx="70" cy="70" r={r} className="gauge-bg" />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            className="gauge-fg"
            style={{ stroke: color }}
            strokeDasharray={C}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.9 }}
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-val neon-text">{pct}%</div>
          {subtitle && <div className="gauge-sub">{subtitle}</div>}
        </div>
      </div>
    </InfoCard>
  );
}

function Bar({ pct, color }) {
  return (
    <div className="bar">
      <motion.div className="bar-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
    </div>
  );
}

/* ---------- Mini Gauges ---------- */
function MiniGauge({ label, value }) {
  const v = clamp(value), R = 24, C = 2 * Math.PI * R;
  return (
    <div className="hud-item">
      <div className="hud-ring">
        <svg viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={R} className="hud-bg" />
          <motion.circle cx="30" cy="30" r={R} className="hud-fg" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - v / 100) }} transition={{ duration: 0.8 }} />
        </svg>
        <div className="hud-val">{v}</div>
      </div>
      <div className="hud-label">{label}</div>
    </div>
  );
}

/* ---------- Animated SVGs ---------- */
function FanSVG() {
  return (
    <motion.svg viewBox="0 0 100 100" className="fan" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}>
      <circle cx="50" cy="50" r="10" className="fan-hub" />
      <path d="M50 8 L63 35 L37 35 Z" className="fan-blade" />
      <path d="M92 50 L65 63 L65 37 Z" className="fan-blade" />
      <path d="M50 92 L37 65 L63 65 Z" className="fan-blade" />
      <path d="M8 50 L35 37 L35 63 Z" className="fan-blade" />
    </motion.svg>
  );
}

function ThermalSVG() {
  return (
    <svg viewBox="0 0 120 80" className="thermal">
      <defs><linearGradient id="heat" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffa34d" /><stop offset="100%" stopColor="#ff0040" /></linearGradient></defs>
      <motion.path d="M10 60 Q60 40 110 60" stroke="url(#heat)" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }} fill="none" strokeWidth="3" />
    </svg>
  );
}

/* ---------- Utils ---------- */
function clamp(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function scaleToBar(v) {
  const capped = Math.min(2000, v);
  return Math.round((capped / 2000) * 100);
}
function statusColor(status) {
  switch (String(status).toLowerCase()) {
    case "start": return "status-start";
    case "pause": return "status-pause";
    case "stop": return "status-stop";
    case "restart": return "status-restart";
    default: return "status-unknown";
  }
}
