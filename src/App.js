// App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Routes, Route, NavLink, Navigate } from "react-router-dom";
import TopGainers from './pages/TopGainers';
import LiveGainers from "./pages/LiveGainers";
import DataQueryPage from "./pages/DataQueryPage";
import DbOverviewPage from "./pages/DbOverviewPage";
import DisplayChart from './pages/DisplayChart';
import EditChart from './pages/EditChart';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import About from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import IntraGainers from './pages/IntraGainers';
import MongoExport from './pages/MongoexportPage';
import HealthPage from './pages/HealthPage';
import NotifierPage from './pages/NotifierPage';
import AnalyzePage from './pages/AnalyzePage';
import LoveletterPage from './pages/LoveletterPage';
import { useAutoLogout } from './components/useAutoLogout';
import api from "./apiClient";
import './styles/App.css';

/** Safe storage wrapper (browser + MIT App Inventor WebView) */
const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      } else if (typeof window !== "undefined" && window.AppInventor) {
        const str = window.AppInventor.getWebViewString?.() || "";
        const parts = str.split("|").map(s => s.split(":"));
        const map = Object.fromEntries(parts);
        return map[key] || null;
      }
    } catch (e) {}
    return null;
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else if (typeof window !== "undefined" && window.AppInventor) {
        const existing = window.AppInventor.getWebViewString?.() || "";
        let map = {};
        if (existing) {
          const parts = existing.split("|").map(s => s.split(":"));
          map = Object.fromEntries(parts);
        }
        map[key] = value;
        const newString = Object.entries(map).map(([k,v]) => `${k}:${v}`).join("|");
        window.AppInventor.setWebViewString(newString);
      }
    } catch (e) {}
  },
  removeItem: (key) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      } else if (typeof window !== "undefined" && window.AppInventor) {
        const existing = window.AppInventor.getWebViewString?.() || "";
        const parts = existing.split("|").map(s => s.split(":"));
        let map = Object.fromEntries(parts);
        delete map[key];
        const newString = Object.entries(map).map(([k,v]) => `${k}:${v}`).join("|");
        window.AppInventor.setWebViewString(newString);
      }
    } catch (e) {}
  },
  clear: () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      } else if (typeof window !== "undefined" && window.AppInventor) {
        window.AppInventor.setWebViewString("");
      }
    } catch (e) {}
  }
};

function PrivateRoute({ unlocked, children }) {
  return unlocked ? children : <Navigate to="/" replace />;
}

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showProfileBox, setShowProfileBox] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const navigate = useNavigate();
  const menuToggleRef = useRef(null);
  const dropdownTimerRef = useRef(null);

  /** Logout handler */
  const handleLogout = useCallback(async () => {
    try {
      const accessToken = safeStorage.getItem("access_token");
      if (accessToken) {
        await api.post("/api/logout", {}, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
    } catch (err) {
      console.warn("Logout API failed:", err);
    } finally {
      safeStorage.removeItem("access_token");
      safeStorage.removeItem("refresh_token");
      setUnlocked(false);
      setProfile(null);
      navigate("/");
    }
  }, [navigate]);

  /** Fetch user profile */
  const fetchProfile = useCallback(async () => {
    const accessToken = safeStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const res = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.warn("Profile fetch failed:", err);
      setProfile(null);
    }
  }, []);

  /** Initial token check */
  useEffect(() => {
    setUnlocked(!!safeStorage.getItem("access_token"));
  }, []);

  /** Fetch profile when unlocked changes */
  useEffect(() => {
    if (unlocked) fetchProfile();
    else setProfile(null);
  }, [unlocked, fetchProfile]);

  /** Token auto-refresh every 50 minutes */
  useEffect(() => {
    if (!unlocked) return;
    const interval = setInterval(async () => {
      const refreshToken = safeStorage.getItem("refresh_token");
      if (!refreshToken) {
        handleLogout();
        return;
      }
      try {
        const res = await api.post("/api/refresh", {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });
        safeStorage.setItem("access_token", res.data.access_token);
        await fetchProfile();
      } catch (err) {
        console.warn("Token refresh failed:", err);
        handleLogout();
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [unlocked, fetchProfile, handleLogout]);

  useAutoLogout(handleLogout, unlocked);
  const handleMenuClose = () => {
    if (menuToggleRef.current) {
      menuToggleRef.current.checked = false;
    }
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = null;
    }
  };

  // Auto-close dropdown on link click (mobile)
  useEffect(() => {
    const menuToggle = menuToggleRef.current;
    if (!menuToggle) return;

    const handleToggleChange = () => {
      if (menuToggle.checked) {
        // Dropdown opened: start timer
        dropdownTimerRef.current = setTimeout(() => {
          menuToggle.checked = false;
          dropdownTimerRef.current = null;
        }, 5000);
      } else {
        // Dropdown closed: clear timer
        if (dropdownTimerRef.current) {
          clearTimeout(dropdownTimerRef.current);
          dropdownTimerRef.current = null;
        }
      }
    };

    menuToggle.addEventListener("change", handleToggleChange);

    // Cleanup on component unmount
    return () => {
      menuToggle.removeEventListener("change", handleToggleChange);
      if (dropdownTimerRef.current) {
        clearTimeout(dropdownTimerRef.current);
        dropdownTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="gibsi-header">
        <span className="header-title">GIBSI</span>
        {/* Mobile Menu Toggle */}
        <input type="checkbox" id="menu-toggle" className="menu-toggle" ref={menuToggleRef} />
        <label htmlFor="menu-toggle" className="menu-icon">☰</label>

        <div className="nav-links">
          {/* Always show Home */}
          <NavLink to="/" onClick={handleMenuClose}>Home</NavLink>

          {/* Dropdown only in mobile (hidden unless menu toggled) */}
          <div className="mobile-dropdown">
            {unlocked ? (
              <>
                <NavLink to="/about" onClick={handleMenuClose}>About</NavLink>
                <NavLink to="/top-gainers" onClick={handleMenuClose}>Top Gainers</NavLink>
                <NavLink to="/intra-gainers" onClick={handleMenuClose}>Intra Gainers</NavLink>
                <NavLink to="/stock-analyze" onClick={handleMenuClose}>Daily Report</NavLink>
                <NavLink to="/live-gainers" onClick={handleMenuClose}>Live Gainers</NavLink>
                <NavLink to="/data-query" onClick={handleMenuClose}>Data Query</NavLink>
                <NavLink to="/chart" onClick={handleMenuClose}>Chart</NavLink>
                <NavLink to="/health-check" onClick={handleMenuClose}>System Health</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/about" onClick={handleMenuClose}>About</NavLink>
              </>
            )}
          </div>

          {/* Admin dropdown button ONLY for logged in admin user */}
          {unlocked && profile?.usertype === "admin" && (
            <div className="admin-dropdown">
              <button
                className="dropdown-title nav-link-btn admin-btn"
                onClick={() => setShowAdminDropdown((prev) => !prev)}
                type="button"
                tabIndex={0}
                aria-haspopup="true"
                aria-expanded={showAdminDropdown}
              >
                Admin ▾
              </button>
              {showAdminDropdown && (
                <div
                  className="dropdown-content"
                  onMouseLeave={() => setShowAdminDropdown(false)}
                >
                  <NavLink to="/db-overview" onClick={handleMenuClose}>DB Overview</NavLink>
                  <NavLink to="/user-profile" onClick={handleMenuClose}>User Profile</NavLink>
                  <NavLink to="/edit-chart" onClick={handleMenuClose}>Edit Chart</NavLink>
                  <NavLink to="/mongo-export" onClick={handleMenuClose}>DB Export</NavLink>
                  <NavLink to="/health-check" onClick={handleMenuClose}>System Health</NavLink>
                  <NavLink to="/send-notifier" onClick={handleMenuClose}>Notifier</NavLink>
                </div>
              )}
            </div>
          )}

          {/* Profile icon fixed, always at end */}
          {unlocked && profile && (
            <div
              className="profile-icon"
              onMouseEnter={() => setShowProfileBox(true)}
              onMouseLeave={() => setShowProfileBox(false)}
              onClick={() => { setShowProfileBox(false); navigate("/profile"); }}
            >
              <span role="img" aria-label="profile">👤</span>
              {showProfileBox && (
                <div className="profile-info-tooltip">
                  <div><b>GID:</b> {profile.gid}</div>
                  <div><b>User Name:</b> {profile.username}</div>
                  <div><b>Email:</b> {profile.email}</div>
                  <div><b>User Type:</b> {profile.usertype}</div>
                  <div><b>Last login:</b> {profile.last_login}</div>
                </div>
              )}
            </div>
          )}

          {/* Logout/Login (always at very end) */}
          {unlocked ? (
            <button className="nav-link-btn logout-btn" onClick={handleLogout}>Logout</button>
          ) : (
            <button className="nav-link-btn login-btn" onClick={() => setShowAuth(true)}>Login</button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {showAuth ? (
          <AuthPage
            onUnlock={() => { setUnlocked(true); setShowAuth(false); }}
            onCancel={() => setShowAuth(false)}
          />
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<About />} />
            <Route path="/loveletter" element={<LoveletterPage />} />
            <Route path="/intra-gainers" element={<IntraGainers />} />
            <Route path="/top-gainers" element={<PrivateRoute unlocked={unlocked}><TopGainers /></PrivateRoute>} />
            <Route path="/live-gainers" element={<PrivateRoute unlocked={unlocked}><LiveGainers /></PrivateRoute>} />
            <Route path="/data-query" element={<PrivateRoute unlocked={unlocked}><DataQueryPage /></PrivateRoute>} />
            <Route path="/chart" element={<PrivateRoute unlocked={unlocked}><DisplayChart /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute unlocked={unlocked}><ProfilePage /></PrivateRoute>} />
            <Route path="/stock-analyze" element={<PrivateRoute unlocked={unlocked}><AnalyzePage /></PrivateRoute>} />
            <Route path="/db-overview" element={<PrivateRoute unlocked={unlocked}>{profile?.usertype === "admin" ? <DbOverviewPage /> : <Navigate to="/" replace />}</PrivateRoute>} />
            <Route path="/edit-chart" element={<PrivateRoute unlocked={unlocked}>{profile?.usertype === "admin" ? <EditChart /> : <Navigate to="/" replace />}</PrivateRoute>} />
            <Route path="/user-profile" element={<PrivateRoute unlocked={unlocked}>{profile?.usertype === "admin" ? <UserProfilePage /> : <Navigate to="/" replace />}</PrivateRoute>} />
            <Route path="/mongo-export" element={<PrivateRoute unlocked={unlocked}>{profile?.usertype === "admin" ? <MongoExport /> : <Navigate to="/" replace />}</PrivateRoute>} />
            <Route path="/health-check" element={<PrivateRoute unlocked={unlocked}><HealthPage profile={profile} /></PrivateRoute>}/>
            <Route path="/send-notifier" element={<PrivateRoute unlocked={unlocked}>{profile?.usertype === "admin" ? <NotifierPage /> : <Navigate to="/" replace />}</PrivateRoute>} />
          </Routes>
        )}
      </main>
    </div>
  );
}

export default App;
