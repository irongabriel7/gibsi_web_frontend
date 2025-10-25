import React, { useState, useEffect } from "react";
import api from "../apiClient";
import "../styles/App.css";
import "../styles/Loading.css";
import "../styles/DisplayChart.css";
import "../styles/Profile.css";

export default function ProfilePage({ gid = null, isAdmin = false, onClose = () => {}, onDelete}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(false);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [password, setPassword] = useState("");
  const [passcode, setPasscode] = useState("");

  const [statusMsg, setStatusMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passcodeMsg, setPasscodeMsg] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (isAdmin && gid && res.data.gid !== gid) {
        const userList = await api.get("/api/users", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const targetUser = userList.data.find(u => u.gid === gid);
        if (!targetUser) throw new Error("User not found");

        setProfile(targetUser);
        setUsername(targetUser.username);
        setEmail(targetUser.email);
        setActive(targetUser.Active || false);
        setIsAdminRole(targetUser.usertype === "admin");
      } else {
        setProfile(res.data);
        setUsername(res.data.username);
        setEmail(res.data.email);
        setActive(res.data.Active || false);
        setIsAdminRole(res.data.usertype === "admin");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [gid]);

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        `/api/update-user/${gid || profile.gid}`,
        {
          username,
          email,
          Active: active,
          usertype: isAdminRole ? "admin" : "normal",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStatusMsg("✅ Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      console.error(err);
      setStatusMsg("❌ Failed to update profile.");
    }
  };

  const handlePasswordReset = async () => {
    if (!password) {
      setPasswordMsg("Password cannot be empty");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");

      const url = isAdmin && gid
        ? `/api/admin/reset-password/${gid}`
        : `/api/reset-password`;

      await api.post(
        url,
        { new_password: password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMsg("✅ Password updated successfully!");
      setPassword("");
      fetchProfile(); // Auto-refresh
    } catch (err) {
      setPasswordMsg("❌ Error updating password");
    }
  };

  const handlePasscodeReset = async () => {
    if (!passcode) {
      setPasscodeMsg("Passcode cannot be empty");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");

      const url = isAdmin && gid
        ? `/api/admin/reset-passcode/${gid}`
        : `/api/reset-passcode`;

      await api.post(
        url,
        { new_passcode: passcode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasscodeMsg("✅ Passcode updated successfully!");
      setPasscode("");
      fetchProfile(); // Auto-refresh
    } catch (err) {
      setPasscodeMsg("❌ Error updating passcode");
    }
  };

  const handleDeleteUser = () => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    if (onDelete && typeof onDelete === "function") {
      onDelete(profile.gid);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error">Failed to load profile</div>;
  }

  return (
    <div className="profile-page">
      <h1 className="profile-title">User Profile</h1>

      <div className="profile-content">
        <div className="profile-card">
          {isAdmin && onClose && (
            <div className="close-btn-container">
              <button className="close-btn" onClick={onClose}>✖</button>
            </div>
          )}

          <p><b>GID:</b> {profile.gid}</p>

          {isAdmin ? (
            <>
              <div className="form-group">
                <button
                  className="action-btn"
                  style={{ backgroundColor: "#ef4444", marginTop: "1rem" }}
                  onClick={handleDeleteUser}
                >
                  🗑️ Delete User
                </button>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group toggle-switch">
                <label>Account Active</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="form-group toggle-switch">
                <label>Account Admin</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isAdminRole}
                    onChange={(e) => setIsAdminRole(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="form-group">
                <button className="action-btn" onClick={handleUpdateProfile}>
                  💾 Save Changes
                </button>
              </div>

              {statusMsg && (
                <p className={`status-message ${statusMsg.startsWith("✅") ? "success" : "error"}`}>
                  {statusMsg}
                </p>
              )}
            </>
          ) : (
            <>
              <p><b>Username:</b> {username}</p>
              <p><b>Email:</b> {email}</p>
            </>
          )}

          <p><b>Usertype:</b> {profile.usertype}</p>
          <p><b>Created:</b> {profile.created_at ? new Date(profile.created_at).toLocaleString() : "N/A"}</p>
          <p><b>Last login:</b> {profile.last_login ? new Date(profile.last_login).toLocaleString() : "Never"}</p>
        </div>

        <div className="reset-sections">
          <div className="reset-section">
            <h3>Reset Password</h3>
            <input
              type="password"
              className="input-field"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="action-btn" onClick={handlePasswordReset}>
              Update Password
            </button>
            {passwordMsg && (
              <p className={`status-message ${passwordMsg.startsWith("✅") ? "success" : "error"}`}>
                {passwordMsg}
              </p>
            )}
          </div>

          <div className="reset-section">
            <h3>Reset Passcode</h3>
            <input
              type="text"
              className="input-field"
              placeholder="New 4-digit passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button className="action-btn" onClick={handlePasscodeReset}>
              Update Passcode
            </button>
            {passcodeMsg && (
              <p className={`status-message ${passcodeMsg.startsWith("✅") ? "success" : "error"}`}>
                {passcodeMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
