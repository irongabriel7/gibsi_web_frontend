import React, { useState, useRef, useEffect } from "react";
import api from "../apiClient";
import "../styles/Auth.css";
import "../styles/Loading.css";
import "../styles/DigitScroller.css";

const DigitSelector = ({ value = 0, onChange, state = "" }) => {
  const [digit, setDigit] = useState(value);
  const [animating, setAnimating] = useState(false);
  const startY = useRef(null);

  const changeDigit = (delta) => {
    let newDigit = (digit + delta + 10) % 10;
    setDigit(newDigit);
    onChange(newDigit);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 200);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (!animating) changeDigit(e.deltaY > 0 ? 1 : -1);
  };

  const handleDrag = (clientY) => {
    if (startY.current === null || animating) return;
    let diff = clientY - startY.current;
    if (Math.abs(diff) > 25) {
      changeDigit(diff > 0 ? 1 : -1);
      startY.current = clientY;
    }
  };

  return (
    <div
      className={`digit-selector ${animating ? "scrolling" : ""} ${state}`}
      onWheel={handleWheel}
      onMouseDown={(e) => { startY.current = e.clientY; }}
      onMouseMove={(e) => handleDrag(e.clientY)}
      onMouseUp={() => { startY.current = null; }}
      onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
      onTouchMove={(e) => handleDrag(e.touches[0].clientY)}
      onTouchEnd={() => { startY.current = null; }}
      style={{ touchAction: "none", userSelect: "none" }}
    >
      <div className="digit-list" style={{ transform: `translateY(${-digit * 80}px)` }}>
        {[...Array(10)].map((_, index) => (
          <div key={index} className="digit-item">{index}</div>
        ))}
      </div>
    </div>
  );
};

export default function AuthPage({ onUnlock, onCancel }) {
  const [mode, setMode] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [form, setForm] = useState({ username: "", email: "", password: "", passcode: "" });
  const [passcodeDigits, setPasscodeDigits] = useState([0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inactiveWarning, setInactiveWarning] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const tryAutoLogin = async () => {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const res = await api.post("/api/refresh", {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });
          localStorage.setItem("access_token", res.data.access_token);
          onUnlock();
          return;
        } catch {
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("access_token");
        }
      }
      setLoading(false);
    };
    tryAutoLogin();
  }, [onUnlock]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasscodeChange = (index, value) => {
    const newDigits = [...passcodeDigits];
    newDigits[index] = value;
    setPasscodeDigits(newDigits);
    setForm({ ...form, passcode: newDigits.join("") });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInactiveWarning(""); setMessage(""); setLoading(true);

    try {
      if (mode === "login") {
        const payload = { email: form.email };
        loginMethod === "password" ? payload.password = form.password : payload.passcode = form.passcode;
        const res = await api.post("/api/login", payload);
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        setMessage("Login successful!");
        onUnlock();
      } else {
        await api.post("/api/user_register", {
          username: form.username,
          email: form.email,
          password: form.password,
          passcode: form.passcode
        });
        const loginRes = await api.post("/api/login", {
          email: form.email,
          password: form.password
        });
        localStorage.setItem("access_token", loginRes.data.access_token);
        localStorage.setItem("refresh_token", loginRes.data.refresh_token);
        onUnlock();
      }
    } catch (err) {
      if (err.response?.data?.error) {
        err.response.data.error.toLowerCase().includes("not active")
          ? setInactiveWarning(err.response.data.error)
          : setError(err.response.data.error);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="candlestick-loader">
        <div className="candles">
          <div className="candle red"></div>
          <div className="candle green"></div>
        </div>
        {mode === "login" ? "Loading..." : "Registering..."}
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{mode === "login" ? "Login" : "Register"}</h2>

        <div className="auth-messages">
          {error && <p className="message error">{error}</p>}
          {inactiveWarning && <p className="message warning">{inactiveWarning}</p>}
          {message && <p className="message success">{message}</p>}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="input-group">
              <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
            </div>
          )}

          <div className="input-group">
            <input type="text" name="email" placeholder="E-mail / Username / GID" value={form.email} onChange={handleChange} required />
          </div>

          {mode === "login" ? (
            <>
              <div className="auth-method-switch">
                <button type="button" className={loginMethod === "password" ? "active" : ""} onClick={() => setLoginMethod("password")}>Password</button>
                <button type="button" className={loginMethod === "passcode" ? "active" : ""} onClick={() => setLoginMethod("passcode")}>Passcode</button>
              </div>

              {loginMethod === "password" && (
                <div className="input-group">
                  <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} />
                </div>
              )}

              {/* Passcode for LOGIN: BOTH VERSIONS ALWAYS RENDERED, CSS decides which shows */}
              {loginMethod === "passcode" && (
                <>
                  {/* Desktop only */}
                  <div className="passcode-row passcode-desktop">
                    {passcodeDigits.map((digit, idx) => (
                      <DigitSelector key={idx} value={digit} onChange={(val) => handlePasscodeChange(idx, val)} />
                    ))}
                  </div>
                  {/* Mobile only */}
                  <div className="input-group passcode-mobile">
                    <input
                      type="password"
                      name="passcode"
                      placeholder="4-digit Passcode"
                      value={form.passcode}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setForm({ ...form, passcode: val });
                        setPasscodeDigits(val.split('').map(x => Number(x) || 0).concat([0,0,0,0]).slice(0,4));
                      }}
                      pattern="\d{4}"
                      maxLength={4}
                      inputMode="numeric"
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="input-group">
                <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="passcode" placeholder="4-digit Passcode" value={form.passcode} onChange={handleChange} pattern="\d{4}" required />
              </div>
            </>
          )}

          <div className="submit-group">
            <button type="submit" className="auth-submit-btn">
              {mode === "login" ? "Login" : "Register"}
            </button>
          </div>
        </form>

        <div className="auth-switch-container">
          {mode === "login" ? (
            <>
              Don’t have an account? <button className="auth-switch" onClick={() => setMode("register")}>Register here</button>
            </>
          ) : (
            <>
              Already have an account? <button className="auth-switch" onClick={() => setMode("login")}>Login here</button>
            </>
          )}
        </div>

        {/* ADD THIS FOR "BACK" BUTTON */}
        <div className="auth-back-container" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="nav-link-btn back-btn"
            onClick={onCancel}
            style={{ minWidth: 88 }}
          >
            ⟵ Back to Home
          </button>
        </div>
        {/* END ADDITION */}
      </div>
    </div>
  );
}
