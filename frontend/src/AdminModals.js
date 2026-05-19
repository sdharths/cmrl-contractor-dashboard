import React from "react";
import axios from "axios";

// ─── Manage Access Modal (Admin) ─────────────────────────────────────────────
export function AccessModal({
  show,
  onClose,
  selectedFile,
  usersList,
  fileAccessList,
  onGrant,
  onGrantAll,
  onRevoke,
  isAdmin,
}) {
  const [selectedUserIds, setSelectedUserIds] = React.useState([]);
  const [userSearch, setUserSearch] = React.useState("");

  if (!show) return null;

  const filteredUsers = usersList.filter(u => 
    (u.name || u.username || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkGrant = (permission) => {
    if (selectedUserIds.length === 0) return;
    onGrant(selectedUserIds, permission);
    setSelectedUserIds([]);
  };

  const handleBulkRevoke = () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Are you sure you want to revoke access for ${selectedUserIds.length} users?`)) {
      onRevoke(selectedUserIds);
      setSelectedUserIds([]);
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"> Manage Access: {selectedFile?.filename}</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {isAdmin && (
            <>
              <div style={{ marginBottom: "20px", borderBottom: "1px solid var(--border-light)", paddingBottom: "20px" }}>
                <h4 style={{ marginTop: 0 }}>Grant / Revoke Multiple Users</h4>
                
                <div className="bulk-user-selector" style={{ 
                  border: "1px solid var(--border-light)", 
                  borderRadius: "8px", 
                  padding: "10px",
                  background: "var(--panel-bg)",
                  marginBottom: "15px"
                }}>
                  <div style={{ position: "relative", marginBottom: "10px" }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search users to select..." 
                      className="edit-input" 
                      style={{ paddingLeft: "35px", width: "100%", height: "36px", fontSize: "0.9rem" }}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="user-checkbox-list" style={{ 
                    maxHeight: "150px", 
                    overflowY: "auto", 
                    padding: "5px"
                  }}>
                    {filteredUsers.map(u => (
                      <label key={u._id} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "10px", 
                        padding: "6px 8px", 
                        cursor: "pointer",
                        borderRadius: "4px",
                        background: selectedUserIds.includes(u._id) ? "var(--hover-bg)" : "transparent"
                      }}>
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.includes(u._id)}
                          onChange={() => toggleUserSelection(u._id)}
                        />
                        <span style={{ fontSize: "0.9rem", color: "var(--color-text-main)" }}>
                          {u.name || u.username} ({u.email})
                        </span>
                      </label>
                    ))}
                    {filteredUsers.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>No users found.</p>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <select id="bulk-permission-select" className="edit-input" style={{ width: "130px" }}>
                    <option value="view">View Access</option>
                    <option value="edit">Edit Access</option>
                  </select>
                  <button
                    className="btn-primary"
                    disabled={selectedUserIds.length === 0}
                    style={{ opacity: selectedUserIds.length === 0 ? 0.6 : 1 }}
                    onClick={() => handleBulkGrant(document.getElementById("bulk-permission-select").value)}
                  >
                    Grant to {selectedUserIds.length} Selected
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={selectedUserIds.length === 0}
                    style={{ 
                      opacity: selectedUserIds.length === 0 ? 0.6 : 1,
                      color: "#e53e3e",
                      borderColor: "#e53e3e"
                    }}
                    onClick={handleBulkRevoke}
                  >
                    Revoke Selected
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px", padding: "15px", background: "var(--hover-bg)", borderRadius: "8px", border: "1px dashed var(--primary-color)" }}>
                <h4 style={{ marginTop: 0, color: "var(--primary-color)" }}>Quick Actions</h4>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    className="btn-primary"
                    style={{ background: "var(--primary-color)" }}
                    onClick={() => {
                      if (window.confirm(`Grant VIEW access to ALL users for this file?`)) {
                        onGrantAll("view");
                      }
                    }}
                  >
                    Grant View to All
                  </button>
                  <button
                    className="btn-primary"
                    style={{ background: "#10b981" }}
                    onClick={() => {
                      if (window.confirm(`Grant EDIT access to ALL users for this file?`)) {
                        onGrantAll("edit");
                      }
                    }}
                  >
                    Grant Edit to All
                  </button>
                </div>
              </div>
            </>
          )}

          <h4 style={{ marginTop: "20px", borderTop: "1px solid var(--border-light)", paddingTop: "20px" }}>
            Current Access
          </h4>
          {fileAccessList.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {fileAccessList.map((acc) => {
                const userObj = usersList.find((u) => u._id === acc.user_id);
                return (
                  <li
                    key={acc._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      background: "var(--hover-bg)",
                      marginBottom: "5px",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      <strong>{userObj ? userObj.name || userObj.username : "Unknown User"}</strong>
                      <span style={{ marginLeft: "10px", color: "var(--text-muted)" }}>{userObj?.email}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span title={acc.permission === "edit" ? "Can Edit" : "View Only"} style={{ fontSize: "1.2rem" }}>
                        {acc.permission === "edit" ? "✏️" : "👁️"}
                      </span>
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => onRevoke(acc.user_id)}
                          title="Revoke Access"
                          style={{ color: "#e53e3e" }}
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No users have been granted explicit access.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Requests Modal (Admin) ───────────────────────────────────────────
export function DeleteRequestsModal({
  show,
  onClose,
  deleteRequestsList,
  onApprove,
  onReject,
}) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🗑️ Delete Requests</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {deleteRequestsList.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {deleteRequestsList.map((req) => (
                <li
                  key={req._id}
                  style={{
                    padding: "15px",
                    background: "var(--hover-bg)",
                    marginBottom: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <strong>File:</strong> {req.filename} <br />
                    <strong>Requested By:</strong> {req.user_email} <br />
                    <strong>Date:</strong> {req.requested_at}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" onClick={() => onApprove(req._id)}>
                      Approve (Delete)
                    </button>
                    <button className="btn-secondary" onClick={() => onReject(req._id)}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No pending delete requests.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── All Access Requests Modal (Admin) ───────────────────────────────────────
export function AllAccessRequestsModal({
  show,
  onClose,
  pendingAccessRequests,
  onAction,
  onApproveAll,
}) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🔑 Access Requests</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {pendingAccessRequests.length > 0 && (
            <div style={{ 
              display: "flex", 
              gap: "10px", 
              marginBottom: "20px", 
              padding: "12px", 
              background: "var(--hover-bg)", 
              borderRadius: "8px",
              border: "1px solid var(--primary-color)"
            }}>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block" }}>Bulk Approve All Requests</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Approve all {pendingAccessRequests.length} pending requests at once.
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  className="btn-primary" 
                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                  onClick={() => {
                    if (window.confirm("Approve all pending requests with VIEW access?")) {
                      onApproveAll("view");
                    }
                  }}
                >
                  Approve All (View)
                </button>
                <button 
                  className="btn-primary" 
                  style={{ fontSize: "0.85rem", padding: "6px 12px", background: "#10b981" }}
                  onClick={() => {
                    if (window.confirm("Approve all pending requests with EDIT access?")) {
                      onApproveAll("edit");
                    }
                  }}
                >
                  Approve All (Edit)
                </button>
              </div>
            </div>
          )}
          {pendingAccessRequests.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pendingAccessRequests.map((req) => (
                <li
                  key={req._id}
                  style={{
                    padding: "15px",
                    background: "var(--hover-bg)",
                    marginBottom: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <strong>File:</strong> {req.filename} <br />
                    <strong>User:</strong> {req.user_email} <br />
                    <strong>Date:</strong> {req.requested_at}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" onClick={() => onAction(req._id, "approve", "view")}>
                      Approve (View)
                    </button>
                    <button
                      className="btn-primary"
                      style={{ background: "#10b981" }}
                      onClick={() => onAction(req._id, "approve", "edit")}
                    >
                      Approve (Edit)
                    </button>
                    <button className="btn-secondary" onClick={() => onAction(req._id, "reject")}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No pending access requests.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Download Requests Modal (Admin) ──────────────────────────────────────────
export function DownloadRequestsModal({
  show,
  onClose,
  downloadRequestsList,
  onAction,
}) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📥 Download Requests</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {downloadRequestsList.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {downloadRequestsList.map((req) => (
                <li
                  key={req._id}
                  style={{
                    padding: "15px",
                    background: "var(--hover-bg)",
                    marginBottom: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <strong>File:</strong> {req.filename} <br />
                    <strong>User:</strong> {req.user_email} <br />
                    <strong>Date:</strong> {req.requested_at}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" onClick={() => onAction(req._id, "approve")}>
                      Approve
                    </button>
                    <button className="btn-secondary" onClick={() => onAction(req._id, "reject")}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No pending download requests.</p>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── User Management Modal (Admin Only) ──────────────────────────────────────
export function UserManagementModal({
  show,
  onClose,
  usersList,
  files,
  onGrant,
  onRevoke,
  onDeleteUser,
  fetchUsers,
  currentUser,
  API,
}) {
  const [viewMode, setViewMode] = React.useState("list"); // "list" | "matrix"
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [userAccess, setUserAccess] = React.useState([]);
  const [loadingAccess, setLoadingAccess] = React.useState(false);
  const [grantFileId, setGrantFileId] = React.useState("");
  const [grantPermission, setGrantPermission] = React.useState("view");
  const [isGranting, setIsGranting] = React.useState(false);

  const [pendingChanges, setPendingChanges] = React.useState({});
  const [userSearchTerm, setUserSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all"); // "all" | "user" | "admin" | "super_admin"
  
  React.useEffect(() => {
    if (!show) {
      setSelectedUser(null);
      setUserAccess([]);
      setPendingChanges({});
      setUserSearchTerm("");
      setRoleFilter("all");
    }
  }, [show]);

  React.useEffect(() => {
    setPendingChanges({});
  }, [selectedUser]);

  const loadUserAccess = async (user, silent = false) => {
    if (!user) return;
    setSelectedUser(user);
    if (!silent) setLoadingAccess(true);
    try {
      console.log(`Fetching access for user: ${user.email} (${user._id})`);
      const res = await axios.get(`${API}/user/access/${user._id}`);
      console.log("Access data received:", res.data);
      setUserAccess(res.data);
    } catch (e) {
      console.error("Error loading user access:", e);
      setUserAccess([]);
    } finally {
      if (!silent) setLoadingAccess(false);
    }
  };

  const handleGrant = async () => {
    if (!grantFileId || !selectedUser) return;
    setIsGranting(true);
    try {
      console.log(`Granting ${grantPermission} access to ${selectedUser.email} for file ${grantFileId}`);
      await onGrant(selectedUser._id, grantFileId, grantPermission);
      
      // Reload access list
      await loadUserAccess(selectedUser);
      
      setGrantFileId("");
      alert("Access granted successfully!");
    } catch (err) {
      console.error("Grant failed:", err);
      alert("Failed to grant access. Please try again.");
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevoke = async (fileId) => {
    // Optimistic update
    const previousAccess = [...userAccess];
    setUserAccess(userAccess.filter(a => a.file_id !== fileId));
    
    try {
      await onRevoke(selectedUser._id, fileId);
      await loadUserAccess(selectedUser, true);
    } catch (err) {
      console.error("Revoke failed:", err);
      setUserAccess(previousAccess); // Rollback
      alert("Failed to revoke access.");
    }
  };

  const handleTogglePermission = (fileId, currentPermission) => {
    // If there's already a pending change for a DIFFERENT file, block it
    if (Object.keys(pendingChanges).length > 0 && !pendingChanges[fileId]) {
      alert("Please save your current change before modifying another file.");
      return;
    }

    const newPermission = currentPermission === "edit" ? "view" : "edit";
    
    // Update local state for immediate feedback
    setUserAccess(userAccess.map(a => 
      a.file_id === fileId ? { ...a, permission: newPermission } : a
    ));
    
    // Track this change (only one at a time)
    setPendingChanges({
      [fileId]: newPermission
    });
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setIsGranting(true);
    try {
      console.log("Saving batch changes:", pendingChanges);
      const promises = Object.entries(pendingChanges).map(([fileId, permission]) => 
        onGrant(selectedUser._id, fileId, permission)
      );
      await Promise.all(promises);
      setPendingChanges({});
      alert("All changes saved successfully!");
      await loadUserAccess(selectedUser, true);
    } catch (err) {
      console.error("Save changes failed:", err);
      alert("Failed to save some changes. Please try again.");
    } finally {
      setIsGranting(false);
    }
  };

  const handleToggleRole = async (targetUser, newRole) => {
    if (!window.confirm(`Are you sure you want to change ${targetUser.email}'s role to ${newRole}?`)) return;
    try {
      await axios.post(`${API}/users/toggle_role`, {
        user_id: targetUser._id,
        role: newRole,
        caller_role: currentUser.role
      });
      alert("Role updated successfully!");
      if (fetchUsers) fetchUsers();
    } catch (err) {
      alert("Error updating role: " + (err.response?.data?.error || err.message));
    }
  };

  if (!show) return null;

  // Show all users except the current super admin themselves
  const displayUsers = usersList
    .filter((u) => u.email !== currentUser?.email)
    .filter((u) => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const search = userSearchTerm.toLowerCase();
      
      const matchesSearch = name.includes(search) || username.includes(search) || email.includes(search);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "800px", width: "90vw" }}
      >
        <div className="modal-header">
          <h3 className="modal-title">👥 User Management</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {!selectedUser ? (
            <>
              {/* Search and Role Filter Row */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, position: "relative", minWidth: "200px" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search users by name or email..." 
                    className="edit-input" 
                    style={{ paddingLeft: "35px", width: "100%", height: "38px" }}
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="edit-input" 
                  style={{ width: "160px", height: "38px" }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Contractors</option>
                  <option value="admin">Admins</option>
                  <option value="super_admin">Super Admins</option>
                </select>
              </div>

              {/* View toggle */}
              <div className="user-mgmt-controls">
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-secondary"
                    style={{ backgroundColor: viewMode === "list" ? "var(--primary-color)" : "var(--btn-secondary-bg)", color: viewMode === "list" ? "white" : "var(--text-muted)", padding: "6px 14px", borderRadius: "6px" }}
                    onClick={() => setViewMode("list")}
                  >
                    ≡ List
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ backgroundColor: viewMode === "matrix" ? "var(--primary-color)" : "var(--btn-secondary-bg)", color: viewMode === "matrix" ? "white" : "var(--text-muted)", padding: "6px 14px", borderRadius: "6px" }}
                    onClick={() => setViewMode("matrix")}
                  >
                    ⊞ Matrix
                  </button>
                </div>
              </div>

              {viewMode === "list" ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {displayUsers.map((u) => (
                    <li
                      key={u._id}
                      className="user-list-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "12px 16px",
                        marginBottom: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-light)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        onClick={() => loadUserAccess(u)}
                        style={{
                          width: "40px", height: "40px", borderRadius: "50%",
                          background: "var(--primary-color)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "bold", fontSize: "1.1rem", flexShrink: 0,
                        }}
                      >
                        {(u.name || u.username || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div onClick={() => loadUserAccess(u)} style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "var(--title-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                          {u.name || u.username || "—"}
                          {u.role === "super_admin" && <span style={{ fontSize: "0.7rem", background: "#7c3aed", color: "white", padding: "2px 6px", borderRadius: "4px" }}>SUPER ADMIN</span>}
                          {u.role === "admin" && <span style={{ fontSize: "0.7rem", background: "var(--primary-color)", color: "white", padding: "2px 6px", borderRadius: "4px" }}>ADMIN</span>}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{u.email}</div>
                      </div>


                      
                      {currentUser?.role === "super_admin" && u.role !== "super_admin" && (
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRole(u, u.role === "admin" ? "user" : "admin");
                          }}
                          style={{ fontSize: "0.75rem", padding: "4px 8px", marginRight: "10px" }}
                        >
                          {u.role === "admin" ? "Demote" : "Make Admin"}
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete user "${u.name || u.username || u.email}"? This will also remove all their access records.`)) {
                            onDeleteUser(u._id);
                          }
                        }}
                        title="Delete User"
                        style={{ color: "#e53e3e", fontSize: "1.1rem", padding: "6px", flexShrink: 0 }}
                      >
                        🗑️
                      </button>
                      <span onClick={() => loadUserAccess(u)} style={{ color: "var(--primary-color)", fontSize: "1.2rem" }}>›</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
                  {displayUsers.map((u) => (
                    <div
                      key={u._id}
                      className="user-card-matrix"
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        padding: "18px 12px", background: "var(--panel-bg)",
                        borderRadius: "10px", border: "1px solid var(--border-light)",
                        cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                        textAlign: "center", position: "relative",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete user "${u.name || u.username || u.email}"? This will also remove all their access records.`)) {
                            onDeleteUser(u._id);
                          }
                        }}
                        title="Delete User"
                        style={{ position: "absolute", top: "6px", right: "6px", color: "#e53e3e", fontSize: "0.9rem", padding: "4px" }}
                      >
                        🗑️
                      </button>
                      <div
                        onClick={() => loadUserAccess(u)}
                        style={{
                          width: "52px", height: "52px", borderRadius: "50%",
                          background: "var(--primary-color)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "bold", fontSize: "1.3rem", marginBottom: "10px",
                        }}
                      >
                        {(u.name || u.username || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div onClick={() => loadUserAccess(u)} style={{ fontWeight: "600", color: "var(--title-color)", fontSize: "0.9rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        {u.name || u.username || "—"}
                        {u.role === "super_admin" && <span style={{ fontSize: "0.6rem", background: "#7c3aed", color: "white", padding: "1px 4px", borderRadius: "3px" }}>SUPER ADMIN</span>}
                        {u.role === "admin" && <span style={{ fontSize: "0.6rem", background: "var(--primary-color)", color: "white", padding: "1px 4px", borderRadius: "3px" }}>ADMIN</span>}
                      </div>
                      <div onClick={() => loadUserAccess(u)} style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px", wordBreak: "break-all" }}>{u.email}</div>
                      

                      
                      {currentUser?.role === "super_admin" && u.role !== "super_admin" && (
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRole(u, u.role === "admin" ? "user" : "admin");
                          }}
                          style={{ fontSize: "0.7rem", padding: "2px 6px", marginTop: "8px" }}
                        >
                          {u.role === "admin" ? "Demote" : "Make Admin"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── User detail: file access view ── */
            <>
              <button
                className="btn-secondary"
                style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => setSelectedUser(null)}
              >
                ← Back to Users
              </button>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "50%",
                    background: "var(--primary-color)", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "bold", fontSize: "1.3rem",
                  }}>
                    {(selectedUser.name || selectedUser.username || selectedUser.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "1.1rem", color: "var(--title-color)" }}>{selectedUser.name || selectedUser.username}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{selectedUser.email}</div>
                  </div>
                </div>

              {selectedUser.role === "admin" || selectedUser.role === "super_admin" ? (
                <div style={{ 
                  padding: "30px", 
                  textAlign: "center", 
                  background: "var(--hover-bg)", 
                  borderRadius: "12px",
                  border: "1px dashed var(--primary-color)",
                  margin: "20px 0"
                }}>
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "10px" }}>🛡️</span>
                  <h4 style={{ color: "var(--primary-color)", margin: "0 0 5px 0" }}>Administrative Access</h4>
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    This user has full access to all records in the system.
                  </p>
                </div>
              ) : (
                <>
                  <h4 style={{ marginTop: 0, borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>File Access</h4>
                  {loadingAccess ? (
                    <p style={{ color: "var(--text-muted)" }}>Loading...</p>
                  ) : userAccess.length > 0 ? (
                    <>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: "20px" }}>
                        {userAccess.map((acc) => (
                          <li
                            key={acc._id}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 14px", background: "var(--hover-bg)",
                              marginBottom: "6px", borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                            }}
                          >
                            <span style={{ fontWeight: "500", color: "var(--title-color)" }}>{acc.filename}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                              <button
                                className="btn-icon"
                                onClick={() => handleTogglePermission(acc.file_id, acc.permission)}
                                title={acc.permission === "edit" ? "Switch to View Only" : "Switch to Edit Access"}
                                style={{ 
                                  fontSize: "1.2rem", 
                                  padding: "4px", 
                                  background: "rgba(255, 255, 255, 0.1)", 
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  transition: "transform 0.1s",
                                  opacity: (Object.keys(pendingChanges).length > 0 && !pendingChanges[acc.file_id]) ? 0.3 : 1
                                }}
                                onMouseEnter={(e) => {
                                  if (!(Object.keys(pendingChanges).length > 0 && !pendingChanges[acc.file_id])) {
                                    e.currentTarget.style.transform = "scale(1.2)";
                                  }
                                }}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                {acc.permission === "edit" ? "✏️" : "👁️"}
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleRevoke(acc.file_id)}
                                title="Revoke Access"
                                style={{ color: "#e53e3e", fontSize: "1rem" }}
                              >
                                ✖
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {Object.keys(pendingChanges).length > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                          <button 
                            className="btn-primary" 
                            onClick={handleSaveChanges}
                            style={{ background: "#10b981", width: "200px" }}
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>This user has no file access granted yet.</p>
                  )}

                  {/* Grant New Access */}
                  <div style={{
                    background: "var(--hover-bg)", borderRadius: "8px",
                    padding: "16px", border: "1px solid var(--border-light)",
                  }}>
                    <h4 style={{ margin: "0 0 12px 0" }}>Grant File Access</h4>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <select
                        className="edit-input"
                        style={{ flex: 1, minWidth: "160px" }}
                        value={grantFileId}
                        onChange={(e) => setGrantFileId(e.target.value)}
                      >
                        <option value="">Select a file...</option>
                        {files
                          .filter((f) => !userAccess.find((a) => a.file_id === f._id))
                          .map((f) => (
                            <option key={f._id} value={f._id}>{f.filename}</option>
                          ))}
                      </select>
                      <select
                        className="edit-input"
                        style={{ width: "120px" }}
                        value={grantPermission}
                        onChange={(e) => setGrantPermission(e.target.value)}
                      >
                        <option value="view">👁️ View Only</option>
                        <option value="edit">✏️ Edit Access</option>
                      </select>
                      <button 
                        className="btn-primary" 
                        onClick={handleGrant} 
                        disabled={!grantFileId || isGranting}
                        style={{ opacity: (!grantFileId || isGranting) ? 0.6 : 1 }}
                      >
                        {isGranting ? "Granting..." : "Grant Access"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
