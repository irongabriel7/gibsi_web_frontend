// src/pages/UserProfilePage.js
import React, { useState, useEffect } from "react";
import api from "../apiClient";
import "../styles/UserProfile.css";
import ProfilePage from "./ProfilePage"; // Detail/edit panel for selected user


export default function UserProfilePage() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await api.get("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        setUsers([]);
        setError("Failed to fetch users.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Add this handler!
  function handleCloseModalOrPanel() {
    setSelected(null);
  }

  // Add this function inside UserProfilePage component
  async function handleDeleteUser(gid) {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No authentication token");

      await api.delete(`/api/admin/delete-user/${gid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh user list after deletion
      const res = await api.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);

      setSelected(null); // Close detail panel

    } catch (err) {
      alert("Failed to delete user.");
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div>
      <h2>All Users</h2>
      {error && (
        <div style={{ color: "red", padding: "1rem" }}>{error}</div>
      )}

      <div className="responsive-table" style={{ maxWidth: "100%", overflowX: "auto" }}>
        <table className="fixed-width-table">
          <thead>
            <tr>
              <th>GID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Usertype</th>
              <th>Active</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.gid}
                onClick={() => setSelected(u.gid)}
                style={{ cursor: "pointer" }}
              >
                <td>{u.gid}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.usertype}</td>
                <td>{u.Active ? "Yes" : "No"}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail/Edit panel */}
      {selected && (
        <div style={{ marginTop: "2rem" }}>
          <ProfilePage
            gid={selected}
            isAdmin={true}
            onClose={handleCloseModalOrPanel}
            onDelete={handleDeleteUser}  // <-- new prop
          />
        </div>
      )}
    </div>
  );
}
