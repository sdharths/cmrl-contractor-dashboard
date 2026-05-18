import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import Analytics from "./Analytics";

// ─── Auth Screen ─────────────────────────────────────────────────────────────
export function AuthScreen({
  authMode,
  setAuthMode,
  authForm,
  handleAuthChange,
  handleAuth,
  handleGoogleLogin,
  showPassword,
  setShowPassword,
  theme,
  themeToggleBtn,
}) {
  return (
    <div className="full-screen-center">
      <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000 }}>
        {themeToggleBtn}
      </div>
      <video className="bg-video" autoPlay loop muted>
        <source src="/new_video_dash -new.mp4" type="video/mp4" />
      </video>
      <div className="overlay-content auth-container">
        <h2 style={{ color: "white", margin: "0 0 20px 0" }}>
          {authMode === "login" ? "Sign In" : "Sign Up"}
        </h2>
        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="text"
            name="username"
            placeholder={authMode === "login" ? "Username or Email" : "Username"}
            value={authForm.username}
            onChange={handleAuthChange}
            required
            className="auth-input"
          />
          {authMode === "signup" && (
            <input
              type="email"
              name="email"
              placeholder="Email ID"
              value={authForm.email}
              onChange={handleAuthChange}
              required
              className="auth-input"
            />
          )}
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={authForm.password}
              onChange={handleAuthChange}
              required
              className="auth-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>
          <button type="submit" className="btn-primary auth-submit">
            {authMode === "login" ? "Login" : "Register"}
          </button>
        </form>
        {authMode === "login" && (
          <div className="google-login-container">
            <div className="divider">
              <span>OR</span>
            </div>
            <GoogleOAuthProvider clientId="200075441939-qpucv1phlt7gk842fjdb8q630qsg59db.apps.googleusercontent.com">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => console.log("Login Failed")}
                theme={theme === "dark" ? "filled_black" : "outline"}
              />
            </GoogleOAuthProvider>
          </div>
        )}
        <p className="auth-toggle">
          {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
            {authMode === "login" ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Files Page ───────────────────────────────────────────────────────────────
export function FilesPage({
  filteredFiles,
  currentUser,
  handleUpload,
  openFile,
  deleteFile,
  openAccessModal,
  setSelectedFileForAccess,
  setShowAccessRequestModal,
  getFileStatusIcon,
  togglePin,
  fileViewMode,
  setFileViewMode,
  newlyGrantedFiles = [],
  newlyRejectedFiles = [],
  fileSearchQuery,
  setFileSearchQuery,
  fileSearchCriteria,
  setFileSearchCriteria,
  fileDateRange,
  setFileDateRange,
}) {
  return (
    <div className="files-page-container">
      <header className="files-header">
        <div className="header-content">
          <h1 className="title">Document Database</h1>
          <p className="subtitle">Manage, view, and analyze your uploaded spreadsheets.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="view-toggle uniform-btn-group" style={{ marginRight: "10px" }}>
            <button
              className={`toggle-btn uniform-btn ${fileViewMode === "grid" ? "active" : ""}`}
              onClick={() => setFileViewMode("grid")}
              title="Grid View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              className={`toggle-btn uniform-btn ${fileViewMode === "list" ? "active" : ""}`}
              onClick={() => setFileViewMode("list")}
              title="List View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="upload-wrapper">
            <label className="btn-primary upload-btn-professional">
              <span className="upload-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              Upload New File
              <input
                type="file"
                onChange={handleUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="files-search-row">
        <div className="search-controls-container">
          <div className="search-bar-wrapper main-search">
            <span className="search-icon-inside">🔍</span>
            <input
              type="text"
              placeholder={fileSearchCriteria === "filename" ? "Search by filename..." : "Search by author email..."}
              className="search-input file-search-input"
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
            />
            <select 
              className="search-criteria-select"
              value={fileSearchCriteria}
              onChange={(e) => setFileSearchCriteria(e.target.value)}
            >
              <option value="filename">Filename</option>
              <option value="author">Author</option>
            </select>
          </div>

          <div className="date-range-wrapper">
            <div className="date-input-group">
              <label>From:</label>
              <input 
                type="date" 
                className="date-input"
                value={fileDateRange.start}
                onChange={(e) => setFileDateRange({...fileDateRange, start: e.target.value})}
              />
            </div>
            <div className="date-input-group">
              <label>To:</label>
              <input 
                type="date" 
                className="date-input"
                value={fileDateRange.end}
                onChange={(e) => setFileDateRange({...fileDateRange, end: e.target.value})}
              />
            </div>
            {(fileDateRange.start || fileDateRange.end || fileSearchQuery) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setFileSearchQuery("");
                  setFileDateRange({ start: "", end: "" });
                }}
                title="Clear all filters"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="files-grid-container">
        {filteredFiles.length === 0 ? (
          <div className="empty-state" style={{ padding: "60px 0" }}>
            <div className="empty-icon" style={{ fontSize: "3rem", marginBottom: "20px" }}>🔍</div>
            <h3>{fileSearchQuery || fileDateRange.start || fileDateRange.end ? "No matching files found" : "No files found"}</h3>
            <p>{fileSearchQuery || fileDateRange.start || fileDateRange.end ? "Try adjusting your search criteria or date range." : "No spreadsheets match this filter."}</p>
            {(fileSearchQuery || fileDateRange.start || fileDateRange.end) && (
              <button className="btn-secondary" onClick={() => { setFileSearchQuery(""); setFileDateRange({start: "", end: ""}); }} style={{ marginTop: "15px" }}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className={fileViewMode === "list" ? "files-list" : "files-grid"}>
            {filteredFiles.map((file) => {
              const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
              const isNewAccess = !isAdmin && newlyGrantedFiles.includes(file._id);
              const isRejected = !isAdmin && (file.request_rejected || newlyRejectedFiles.includes(file._id));
              
              return (
              <div key={file._id} className={`professional-file-card ${!file.has_access ? "locked-card" : ""} ${fileViewMode === "list" ? "list-card" : ""} ${isNewAccess ? "new-access-glow" : ""} ${isRejected ? "rejection-glow" : ""}`}>
                {isNewAccess && <div className="new-access-banner">✨ New Access Granted</div>}
                {isRejected && <div className="rejection-banner">❌ Access Request Rejected</div>}
                <div className="card-content-wrapper" style={{ display: "flex", flexDirection: fileViewMode === "list" ? "row" : "column", flexGrow: 1 }}>
                  <div className="card-header">
                    <div className="file-status-badge">{getFileStatusIcon(file)}</div>
                    <div className="file-icon-wrapper">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                    <div style={{ position: "absolute", top: "6px", right: "6px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                      <button
                        className={`pin-icon-btn ${file.pinned ? "pinned" : ""}`}
                        onClick={() => togglePin(file._id)}
                        title={file.pinned ? "Unpin file" : "Pin file"}
                        style={{
                          background: "transparent", border: "none", cursor: "pointer",
                          fontSize: "1.1rem", padding: "4px",
                          color: file.pinned ? "var(--primary-color)" : "var(--color-text-empty-desc)",
                          transition: "transform 0.2s, color 0.2s, opacity 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      >
                        {file.pinned ? "📌" : "📍"}
                      </button>

                      {/* Access Management Key for Admins */}
                      {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && (
                        <button
                          className="action-icon-btn"
                          onClick={() => openAccessModal(file)}
                          title="Manage Access"
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            fontSize: "1.1rem", padding: "4px",
                            color: "var(--primary-color)",
                            transition: "transform 0.2s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          🔑
                        </button>
                      )}

                      {file.has_access && (
                        <button className="delete-icon-btn action-icon-btn" onClick={() => deleteFile(file._id)} title="Delete File" style={{ position: "static" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <h3 className="file-name" title={file.filename}>{file.filename}</h3>
                    <p className="file-date">Uploaded on {file.uploaded_at.split(" ")[0]}</p>
                    <p className="file-date" style={{ marginTop: "5px" }}>
                      {file.uploader_email === currentUser?.email ? "You" : file.uploader_email || "Unknown"}
                    </p>
                    {isRejected && file.rejection_reason && (
                      <div className="reason-box">
                        <strong>Reason:</strong> {file.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="card-footer">
                    {file.has_access ? (
                      <button className="btn-open-file" onClick={() => openFile(file)}>
                        Open Dashboard
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "8px" }}>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                    ) : (
                      <button
                        className="btn-open-file"
                        onClick={() => {
                          if (file.request_pending) {
                            alert("Access request is already pending.");
                          } else {
                            setSelectedFileForAccess(file);
                            setShowAccessRequestModal(true);
                          }
                        }}
                      >
                        {file.request_pending ? "Request Pending..." : "Request Access"}
                        <span style={{ marginLeft: "8px" }}>🔒</span>
                      </button>
                    )}
                    {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && file.has_access && (
                      <button
                        className="btn-secondary"
                        style={{
                          width: "100%",
                          borderRadius: "0",
                          borderTop: "1px solid var(--border-light)",
                          borderLeft: "none",
                          borderRight: "none",
                          borderBottom: "none",
                        }}
                        onClick={() => openAccessModal(file)}
                      >
                        Manage Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Archives Page ────────────────────────────────────────────────────────────
export function ArchivesPage({
  archivedFiles,
  restoreFile,
  permanentlyDeleteFile,
  goBack,
}) {
  return (
    <div className="files-page-container">
      <header className="files-header">
        <div className="header-content">
          <button className="btn-icon" onClick={goBack} title="Back to Files" style={{ marginBottom: "10px", fontSize: "1.2rem" }}>
            🔙
          </button>
          <h1 className="title">Archive Repository</h1>
          <p className="subtitle">Restore archived documents or remove them permanently.</p>
        </div>
      </header>

      <div className="files-grid-container">
        {archivedFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Archive is empty</h3>
            <p>No documents have been archived yet.</p>
          </div>
        ) : (
          <div className="files-grid">
            {archivedFiles.map((file) => (
              <div key={file._id} className="professional-file-card archived-card">
                <div className="card-header">
                  <div className="file-status-badge">
                    <span className="status-lock">📦 Archived</span>
                  </div>
                  <div className="file-icon-wrapper" style={{ background: "var(--hover-bg)", color: "var(--primary-color)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path>
                      <path d="M1 3h22v5H1z"></path>
                      <line x1="10" y1="12" x2="14" y2="12"></line>
                    </svg>
                  </div>
                  <button className="delete-icon-btn" onClick={() => permanentlyDeleteFile(file._id)} title="Delete Permanently">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <div className="card-body">
                  <h3 className="file-name" title={file.filename}>{file.filename}</h3>
                  <p className="file-date">Archived on {file.archived_at?.split(" ")[0]}</p>
                  <p className="file-date" style={{ marginTop: "5px" }}>
                    Uploaded by: {file.uploader_email || "Unknown"}
                  </p>
                </div>
                <div className="card-footer">
                  <button className="btn-open-file" onClick={() => restoreFile(file._id)} style={{ color: "var(--color-status-approved)" }}>
                    Restore Document
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "8px" }}>
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────
export function DashboardView({
  currentFileId,
  dashboardMode,
  setDashboardMode,
  setShowReminders,
  files,
  openAccessModal,
  downloadFilteredExcel,
  filteredData,
  availableColumns,
  searchQuery,
  setSearchQuery,
  hiddenCols,
  unhideColumn,
  unhideAll,
  sortedVisibleColumns,
  frozenCols,
  toggleFreeze,
  hideColumn,
  enddateKey,
  calculateDaysLeft,
  getDaysLeftClass,
  editingRowId,
  editFormData,
  handleEditChange,
  saveEdit,
  cancelEditing,
  startEditing,
  deleteRow,
  currentFilePermission,
  addRow,
  visibleColumns,
  renameFile,
  currentUser,
  setShowDownloadRequestModal,
  theme,
  goBack,
  requestSort,
  sortConfig,
  activeColorFilters,
  setActiveColorFilters,
}) {
  const [isRenaming, setIsRenaming] = React.useState(false);

  const toggleColorFilter = (color) => {
    if (color === "all") {
      setActiveColorFilters([]);
    } else {
      if (activeColorFilters.includes(color)) {
        setActiveColorFilters(activeColorFilters.filter((c) => c !== color));
      } else {
        setActiveColorFilters([...activeColorFilters, color]);
      }
    }
  };
  const [newFileName, setNewFileName] = React.useState("");
  const fileObj = files.find((f) => f._id === currentFileId);

  const handleRenameSubmit = () => {
    if (newFileName.trim() && newFileName.trim() !== fileObj?.filename) {
      renameFile(currentFileId, newFileName.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div className="dashboard-container">
      <div className="header-container">
        <h2 className="title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn-icon" onClick={goBack} title="Back to Files" style={{ fontSize: "1.2rem", padding: "0 5px" }}>
            🔙
          </button>
          <span title="Dashboard">📊</span>
          {isRenaming ? (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                className="edit-input"
                style={{ fontSize: "1.2rem", padding: "5px", width: "300px" }}
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
              />
              <button className="btn-icon" onClick={handleRenameSubmit} title="Save">💾</button>
              <button className="btn-icon" onClick={() => setIsRenaming(false)} title="Cancel">❌</button>
            </div>
          ) : (
            <>
              {fileObj ? fileObj.filename : "Dashboard"}
              {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && fileObj && (
                <button
                  className="btn-edit-visible"
                  onClick={() => {
                    setNewFileName(fileObj.filename);
                    setIsRenaming(true);
                  }}
                  title="Edit File Name"
                >
                  <span style={{ marginRight: '5px' }}>✏️</span> Edit
                </button>
              )}
            </>
          )}
          {!currentFileId && (
            <span style={{ fontSize: "0.6em", color: "var(--color-status-pending)", marginLeft: "10px" }}>
              (Not Saved to Database)
            </span>
          )}
        </h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="view-toggle uniform-btn-group">
            <button
              className={`toggle-btn uniform-btn ${dashboardMode === "table" ? "active" : ""}`}
              onClick={() => setDashboardMode("table")}
            >
              Table
            </button>
            <button
              className={`toggle-btn uniform-btn ${dashboardMode === "analytics" ? "active" : ""}`}
              onClick={() => setDashboardMode("analytics")}
            >
              Analytics
            </button>
          </div>
          <button className="btn-secondary uniform-btn" onClick={() => setShowReminders(true)}>
            🔔 Reminders
          </button>
          <button
            className="btn-secondary uniform-btn"
            onClick={() => {
              if (fileObj) openAccessModal(fileObj);
              else alert("Access list not available for unsaved files.");
            }}
          >
            👁️ View Access List
          </button>
          {(!fileObj || currentUser?.role === "admin" || fileObj?.can_download) ? (
            <button className="btn-secondary uniform-btn excel-btn" onClick={downloadFilteredExcel} title="Download Excel">
              📥
            </button>
          ) : (
            <button
              className="btn-secondary uniform-btn"
              onClick={() => setShowDownloadRequestModal(true)}
              title={fileObj?.download_request_pending ? "Download Request Pending..." : "Request Download Access"}
            >
              📥
            </button>
          )}
        </div>
      </div>

      {dashboardMode === "analytics" ? (
        <Analytics data={filteredData} columns={availableColumns} theme={theme} />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
            <div className="search-bar-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0, paddingBottom: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", marginRight: "5px", color: "var(--color-title-main)" }}>Filter:</span>
                <button
                  className="btn-secondary"
                  style={{ backgroundColor: activeColorFilters.length === 0 ? "var(--primary-color)" : "var(--btn-secondary-bg)", color: activeColorFilters.length === 0 ? "white" : "var(--text-muted)", padding: "4px 12px", fontSize: "0.85rem", borderRadius: "15px" }}
                  onClick={() => toggleColorFilter("all")}
                >
                  All Records
                </button>
                <button
                  className="btn-secondary"
                  style={{ backgroundColor: activeColorFilters.includes("expired") ? "var(--color-status-pending)" : "var(--btn-secondary-bg)", color: activeColorFilters.includes("expired") ? "white" : "var(--color-text-subtitle)", padding: "4px 12px", fontSize: "0.85rem", borderRadius: "15px", borderColor: activeColorFilters.includes("expired") ? "var(--color-status-pending)" : "var(--btn-secondary-border)" }}
                  onClick={() => toggleColorFilter("expired")}
                >
                  🔴 Expired
                </button>
                <button
                  className="btn-secondary"
                  style={{ backgroundColor: activeColorFilters.includes("red") ? "var(--color-status-pending)" : "var(--btn-secondary-bg)", color: activeColorFilters.includes("red") ? "white" : "var(--color-text-subtitle)", padding: "4px 12px", fontSize: "0.85rem", borderRadius: "15px", borderColor: activeColorFilters.includes("red") ? "var(--color-status-pending)" : "var(--btn-secondary-border)" }}
                  onClick={() => toggleColorFilter("red")}
                >
                  🔴 {"0-30 Days"}
                </button>
                <button
                  className="btn-secondary"
                  style={{ backgroundColor: activeColorFilters.includes("yellow") ? "#ecc94b" : "var(--btn-secondary-bg)", color: activeColorFilters.includes("yellow") ? "black" : "var(--color-text-subtitle)", padding: "4px 12px", fontSize: "0.85rem", borderRadius: "15px", borderColor: activeColorFilters.includes("yellow") ? "#ecc94b" : "var(--btn-secondary-border)" }}
                  onClick={() => toggleColorFilter("yellow")}
                >
                  🟡 {"30-60 Days"}
                </button>
                <button
                  className="btn-secondary"
                  style={{ backgroundColor: activeColorFilters.includes("green") ? "var(--color-status-approved)" : "var(--btn-secondary-bg)", color: activeColorFilters.includes("green") ? "white" : "var(--color-text-subtitle)", padding: "4px 12px", fontSize: "0.85rem", borderRadius: "15px", borderColor: activeColorFilters.includes("green") ? "var(--color-status-approved)" : "var(--btn-secondary-border)" }}
                  onClick={() => toggleColorFilter("green")}
                >
                  🟢 {"> 60 Days"}
                </button>
              </div>
              <input
                type="text"
                className="search-input"
                style={{ width: "500px" }}
                placeholder="🔍 Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {hiddenCols.length > 0 && (
            <div className="unhide-panel">
              <span>Hidden Columns:</span>
              {hiddenCols.map((col) => (
                <div key={col} className="unhide-pill" onClick={() => unhideColumn(col)} title="Click to unhide">
                  {col} <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>+</span>
                </div>
              ))}
              <button className="btn-icon" onClick={unhideAll} title="Unhide All" style={{ fontSize: "0.9rem", color: "#0056b3" }}>
                Restore All
              </button>
            </div>
          )}

          <div className="table-container" style={{ maxHeight: "85vh", overflowY: "auto", paddingBottom: "100px" }}>
            <table className="dashboard-table">
              <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                <tr>
                  {sortedVisibleColumns.map((col) => {
                    const isFrozen = frozenCols.includes(col);
                    const leftOffset = isFrozen ? frozenCols.indexOf(col) * 150 : "auto";
                    return (
                      <th
                        key={col}
                        style={{
                          ...(isFrozen
                            ? { position: "sticky", left: leftOffset, zIndex: 21, minWidth: "150px", maxWidth: "150px" }
                            : {}),
                          backgroundColor: "var(--title-color)",
                          cursor: "pointer",
                        }}
                        onClick={() => requestSort && requestSort(col)}
                      >
                        {col}
                        {sortConfig?.key === col ? (sortConfig.direction === "ascending" ? " ▲" : " ▼") : ""}
                        <div style={{ display: "inline-flex", marginLeft: "8px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="hide-col-btn"
                            onClick={() => toggleFreeze(col)}
                            title={isFrozen ? "Unfreeze column" : "Freeze column"}
                            style={{ color: isFrozen ? "#ffc107" : "inherit" }}
                          >
                            ❄️
                          </button>
                          <button className="hide-col-btn" onClick={() => hideColumn(col)} title="Hide column">
                            ✖
                          </button>
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ backgroundColor: "var(--title-color)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const isEditing = editingRowId === row._id;
                  return (
                    <tr key={row._id}>
                      {sortedVisibleColumns.map((col) => {
                        const isFrozen = frozenCols.includes(col);
                        const leftOffset = isFrozen ? frozenCols.indexOf(col) * 150 : "auto";
                        const cellStyle = isFrozen
                          ? { position: "sticky", left: leftOffset, zIndex: 10, minWidth: "150px", maxWidth: "150px", backgroundColor: "var(--panel-bg)" }
                          : {};

                        if (col === "Days Left") {
                          const daysLeft = enddateKey ? calculateDaysLeft(row[enddateKey]) : null;
                          return (
                            <td key={col} style={cellStyle}>
                              {daysLeft !== null ? (
                                <span className={`days-left-badge ${getDaysLeftClass(daysLeft)}`}>
                                  {daysLeft < 0 ? "Expired" : `${daysLeft} days`}
                                </span>
                              ) : (
                                "N/A"
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={col} style={cellStyle}>
                            {isEditing && col !== "Days Left" ? (
                              <input
                                className="edit-input"
                                value={editFormData[col] !== undefined ? editFormData[col] : row[col]}
                                onChange={(e) => handleEditChange(col, e.target.value)}
                              />
                            ) : (
                              row[col]
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <div className="actions-cell">
                          {isEditing ? (
                            <>
                              <button className="btn-icon" onClick={saveEdit} title="Save">💾</button>
                              <button className="btn-icon" onClick={cancelEditing} title="Cancel">❌</button>
                            </>
                          ) : (
                            <>
                              {(currentFilePermission === "edit" || currentUser?.role === "admin") ? (
                                <>
                                  <button className="btn-icon" onClick={() => startEditing(row)} title="Edit">✏️</button>
                                  <button className="btn-icon" onClick={() => deleteRow(row._id)} title="Delete">🗑️</button>
                                </>
                              ) : (
                                <span style={{ color: "var(--color-text-empty-desc)", fontSize: "0.85rem" }}>View Only</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} style={{ textAlign: "center", padding: "30px" }}>
                      No data matches your search or empty dataset. Add a row to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {dashboardMode === "table" && (currentFilePermission === "edit" || currentUser?.role === "admin") && (
            <button className="fab-add-row" onClick={addRow} title="Add Row">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Reminders Modal (User) ──────────────────────────────────────────────────
export function RemindersModal({ show, onClose, reminders, getReminderClass }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title"> Upcoming End Dates Reminder</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {reminders.length > 0 ? (
            <>
              <p style={{ marginTop: 0, marginBottom: "15px", color: "var(--color-status-pending)", fontWeight: "bold" }}>
                The following contractors have an end date in 30 days or less:
              </p>
              {reminders.map((rem) => (
                <div key={rem.id} className={`reminder-item ${getReminderClass(rem.daysLeft)}`}>
                  <span>{rem.name}</span>
                  <span>{rem.daysLeft} days left (Ends: {rem.enddate.split(" ")[0]})</span>
                </div>
              ))}
            </>
          ) : (
            <p style={{ textAlign: "center", padding: "20px", color: "var(--color-text-subtitle)" }}>
              No upcoming end dates found in this file.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Request Access Modal (User) ─────────────────────────────────────────────
export function AccessRequestModal({ show, onClose, selectedFile, onRequest }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Request Access</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <p>
            You do not have access to <strong>{selectedFile?.filename}</strong>.
          </p>
          <p>Would you like to send an access request to the ADMIN?</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              className="btn-primary"
              onClick={() => {
                onRequest(selectedFile);
                onClose();
              }}
            >
              Send Request
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Logout Confirm Modal (User) ──────────────────────────────────────────────
export function LogoutModal({ show, onClose, onConfirm, currentUser }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Confirm Logout</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ textAlign: "center", padding: "20px 0" }}>
          {currentUser && (
            <div className="user-logout-preview" style={{ marginBottom: "20px" }}>
              {currentUser.profile_image ? (
                <img 
                  src={currentUser.profile_image} 
                  alt={currentUser.name} 
                  style={{ width: "60px", height: "60px", borderRadius: "50%", marginBottom: "10px" }}
                />
              ) : (
                <div style={{ 
                  width: "60px", height: "60px", borderRadius: "50%", background: "var(--primary-color)", 
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                  fontSize: "1.5rem", fontWeight: "bold", margin: "0 auto 10px" 
                }}>
                  {currentUser.name ? currentUser.name[0] : (currentUser.username ? currentUser.username[0] : "?")}
                </div>
              )}
              <h4 style={{ margin: "0", color: "var(--color-title-main)" }}>{currentUser.name || currentUser.username}</h4>
              <p style={{ margin: "5px 0 0 0", color: "var(--color-text-subtitle)", fontSize: "0.9rem" }}>{currentUser.email}</p>
            </div>
          )}
          <p style={{ fontSize: "1.1rem", marginBottom: "25px" }}>
            Are you sure you want to log out of your account?
          </p>
          <div className="logout-popover-btns">
            <button
              className="btn-logout-yes"
              style={{ padding: "10px 30px" }}
              onClick={() => { onConfirm(); onClose(); }}
            >
              Yes, Logout
            </button>
            <button className="btn-logout-no" style={{ padding: "10px 30px" }} onClick={onClose}>
              No, Stay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Download Modal (User) ───────────────────────────────────────────
export function DownloadRequestModal({ show, onClose, selectedFile, onRequest }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Request Download Access</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <p>
            You do not have permission to download <strong>{selectedFile?.filename}</strong> to Excel.
          </p>
          <p>Would you like to send a download access request to the ADMIN?</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              className="btn-primary"
              onClick={() => {
                if (selectedFile?.download_request_pending) {
                  alert("Download request already pending.");
                } else {
                  onRequest(selectedFile);
                }
                onClose();
              }}
            >
              Send Request
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inbox / Broadcast Modal ────────────────────────────────────────────────
export function InboxModal({
  show,
  onClose,
  currentUser,
  usersList = [],
  messages = [],
  onSendMessage,
  onSendReply,
  onMarkAsRead,
}) {
  const [activeTab, setActiveTab] = React.useState("inbox"); // "inbox" | "compose"
  const [selectedMessage, setSelectedMessage] = React.useState(null);
  
  // Compose state
  const [recipientType, setRecipientType] = React.useState("global"); // "global" | "role" | "individual"
  const [recipientRole, setRecipientRole] = React.useState("user"); // "admin" | "super_admin" | "user"
  const [recipientId, setRecipientId] = React.useState("");
  const [composeContent, setComposeContent] = React.useState("");
  
  // Reply state
  const [replyContent, setReplyContent] = React.useState("");

  if (!show) return null;

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    // Mark as read if not already read
    if (!msg.read_by.includes(currentUser.id)) {
      onMarkAsRead(msg._id);
    }
  };

  const handleComposeSubmit = (e) => {
    e.preventDefault();
    if (!composeContent.trim()) return;

    onSendMessage({
      sender_id: currentUser.id,
      recipient_type: recipientType,
      recipient_role: recipientType === "role" ? recipientRole : null,
      recipient_id: recipientType === "individual" ? recipientId : null,
      content: composeContent.trim(),
    });

    // Reset compose form
    setComposeContent("");
    setRecipientId("");
    setRecipientType("global");
    setActiveTab("inbox");
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedMessage) return;

    onSendReply(selectedMessage._id, replyContent.trim());
    setReplyContent("");
  };

  // Filter individual recipient options (excluding self)
  const otherUsers = usersList.filter((u) => u._id !== currentUser?.id);

  // Auto-refresh the selected message in active viewing state to see new replies instantly
  const currentMsgObj = selectedMessage ? messages.find((m) => m._id === selectedMessage._id) : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2500 }}>
      <div 
        className="modal-content inbox-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: "950px", 
          width: "90%", 
          height: "80vh", 
          display: "flex", 
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: "20px", borderBottom: "1px solid var(--border-light)" }}>
          <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <span>📥</span> CMRL Communication Hub
          </h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tab Controls for Admins */}
        {isAdmin && (
          <div className="inbox-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border-light)", backgroundColor: "var(--hover-bg)" }}>
            <button 
              className={`inbox-tab-btn ${activeTab === "inbox" ? "active" : ""}`}
              onClick={() => setActiveTab("inbox")}
              style={{
                flex: 1, padding: "15px", border: "none", background: "none", cursor: "pointer",
                fontWeight: activeTab === "inbox" ? "bold" : "normal",
                color: activeTab === "inbox" ? "var(--primary-color)" : "var(--color-text-subtitle)",
                borderBottom: activeTab === "inbox" ? "3px solid var(--primary-color)" : "none",
                fontSize: "1rem", transition: "all 0.2s"
              }}
            >
              📥 Received Broadcasts & Chats
            </button>
            <button 
              className={`inbox-tab-btn ${activeTab === "compose" ? "active" : ""}`}
              onClick={() => setActiveTab("compose")}
              style={{
                flex: 1, padding: "15px", border: "none", background: "none", cursor: "pointer",
                fontWeight: activeTab === "compose" ? "bold" : "normal",
                color: activeTab === "compose" ? "var(--primary-color)" : "var(--color-text-subtitle)",
                borderBottom: activeTab === "compose" ? "3px solid var(--primary-color)" : "none",
                fontSize: "1rem", transition: "all 0.2s"
              }}
            >
              📢 Broadcast New Message
            </button>
          </div>
        )}

        {/* Body Area */}
        <div className="inbox-body" style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {activeTab === "inbox" ? (
            <>
              {/* Left Panel: Threads List */}
              <div 
                className="inbox-threads-panel" 
                style={{ 
                  width: "35%", 
                  borderRight: "1px solid var(--border-light)", 
                  overflowY: "auto",
                  backgroundColor: "var(--panel-bg)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-empty-desc)" }}>
                    <p style={{ fontSize: "2rem", margin: "0 0 10px 0" }}>✉️</p>
                    <p>No messages found in your inbox.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUnread = !msg.read_by.includes(currentUser?.id);
                    const isSelected = selectedMessage?._id === msg._id;
                    return (
                      <div
                        key={msg._id}
                        onClick={() => handleSelectMessage(msg)}
                        className={`thread-item-card ${isUnread ? "unread-thread" : ""} ${isSelected ? "selected-thread" : ""}`}
                        style={{
                          padding: "15px",
                          borderBottom: "1px solid var(--border-light)",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                          position: "relative",
                          backgroundColor: isSelected ? "var(--hover-bg)" : "transparent"
                        }}
                      >
                        {isUnread && (
                          <span 
                            style={{ 
                              position: "absolute", top: "18px", right: "15px", 
                              width: "8px", height: "8px", borderRadius: "50%", 
                              backgroundColor: "#ef4444" 
                            }} 
                          />
                        )}
                        <div style={{ fontWeight: "bold", fontSize: "0.95rem", color: "var(--color-title-main)", marginBottom: "4px", paddingRight: "15px" }}>
                          {msg.sender_name} 
                          <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--primary-color)", marginLeft: "6px", textTransform: "capitalize", background: "var(--hover-bg)", padding: "2px 6px", borderRadius: "10px" }}>
                            {msg.sender_role.replace("_", " ")}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--color-text-subtitle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "6px" }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-empty-desc)" }}>
                          {msg.created_at.split(" ")[0]} at {msg.created_at.split(" ")[1]}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Panel: Chat Thread Window */}
              <div className="inbox-chat-panel" style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--panel-bg)", overflow: "hidden" }}>
                {currentMsgObj ? (
                  <>
                    {/* Chat Header */}
                    <div style={{ padding: "15px 20px", borderBottom: "1px solid var(--border-light)", backgroundColor: "var(--hover-bg)" }}>
                      <h4 style={{ margin: "0 0 5px 0", color: "var(--color-title-main)" }}>
                        From: {currentMsgObj.sender_name} ({currentMsgObj.sender_email})
                      </h4>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-subtitle)" }}>
                        Recipient Scope: <strong style={{ color: "var(--primary-color)", textTransform: "capitalize" }}>{currentMsgObj.recipient_type}</strong> 
                        {currentMsgObj.recipient_type === "role" && ` (${currentMsgObj.recipient_role.replace("_", " ")})`}
                        {currentMsgObj.recipient_type === "individual" && ` (${currentMsgObj.recipient_name})`}
                      </div>
                    </div>

                    {/* Chat Messages Log */}
                    <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px" }}>
                      
                      {/* Original Message Bubble */}
                      <div className="chat-bubble-container" style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", maxWidth: "80%" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-subtitle)", marginBottom: "4px", marginLeft: "8px" }}>
                          {currentMsgObj.sender_name} • {currentMsgObj.created_at}
                        </div>
                        <div 
                          style={{ 
                            padding: "12px 16px", borderRadius: "18px 18px 18px 4px", 
                            backgroundColor: "var(--hover-bg)", color: "var(--color-title-main)",
                            lineHeight: "1.4", border: "1px solid var(--border-light)"
                          }}
                        >
                          {currentMsgObj.content}
                        </div>
                      </div>

                      {/* Replies Loop */}
                      {currentMsgObj.replies && currentMsgObj.replies.map((reply, index) => {
                        const isOwnReply = reply.sender_id === currentUser.id;
                        return (
                          <div 
                            key={index} 
                            className="chat-bubble-container" 
                            style={{ 
                              display: "flex", flexDirection: "column", 
                              alignSelf: isOwnReply ? "flex-end" : "flex-start", 
                              maxWidth: "80%" 
                            }}
                          >
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-subtitle)", marginBottom: "4px", marginRight: isOwnReply ? "8px" : "0", marginLeft: isOwnReply ? "0" : "8px", alignSelf: isOwnReply ? "flex-end" : "flex-start" }}>
                              {reply.sender_name} • {reply.created_at}
                            </div>
                            <div 
                              style={{ 
                                padding: "12px 16px", 
                                borderRadius: isOwnReply ? "18px 18px 4px 18px" : "18px 18px 18px 4px", 
                                backgroundColor: isOwnReply ? "var(--primary-color)" : "var(--hover-bg)", 
                                color: isOwnReply ? "white" : "var(--color-title-main)",
                                lineHeight: "1.4",
                                border: isOwnReply ? "none" : "1px solid var(--border-light)"
                              }}
                            >
                              {reply.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Input / Footer */}
                    <div style={{ padding: "15px 20px", borderTop: "1px solid var(--border-light)", backgroundColor: "var(--panel-bg)" }}>
                      {isAdmin ? (
                        <form onSubmit={handleReplySubmit} style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Type a reply to this broadcast thread..."
                            className="search-input"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            style={{ flex: 1, margin: 0, padding: "12px" }}
                          />
                          <button type="submit" className="btn-primary" style={{ padding: "0 25px" }}>
                            Send Reply
                          </button>
                        </form>
                      ) : (
                        <div 
                          style={{ 
                            padding: "12px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.05)",
                            border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", 
                            textAlign: "center", fontSize: "0.9rem", fontWeight: "bold"
                          }}
                        >
                          🔒 Contractors are in view-only mode and cannot reply to broadcasts.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "var(--color-text-empty-desc)" }}>
                    <p style={{ fontSize: "3rem", margin: "0 0 10px 0" }}>💬</p>
                    <p>Select a message thread from the left panel to read and participate.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Compose Broadcast Tab (Admins Only) */
            <div style={{ flex: 1, padding: "30px", overflowY: "auto", backgroundColor: "var(--panel-bg)" }}>
              <h4 style={{ margin: "0 0 20px 0", color: "var(--color-title-main)" }}>📢 Draft New Broadcast / Direct Message</h4>
              <form onSubmit={handleComposeSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" }}>
                
                {/* Recipient Type */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontWeight: "bold", color: "var(--color-title-main)" }}>Select Audience Target:</label>
                  <select 
                    className="search-criteria-select" 
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                  >
                    <option value="global">🌐 Global (All Users & Admins)</option>
                    <option value="role">👥 By User Role (Admins, Contractors, etc.)</option>
                    <option value="individual">👤 Specific Individual User</option>
                  </select>
                </div>

                {/* Recipient Role details */}
                {recipientType === "role" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontWeight: "bold", color: "var(--color-title-main)" }}>Target Role:</label>
                    <select 
                      className="search-criteria-select" 
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}
                      value={recipientRole}
                      onChange={(e) => setRecipientRole(e.target.value)}
                    >
                      <option value="user">Contractors Only</option>
                      <option value="admin">Admins Only</option>
                      <option value="super_admin">Super Admins Only</option>
                    </select>
                  </div>
                )}

                {/* Recipient Individual selection */}
                {recipientType === "individual" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontWeight: "bold", color: "var(--color-title-main)" }}>Select Recipient User:</label>
                    <select 
                      className="search-criteria-select" 
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose User --</option>
                      {otherUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.username} ({u.email} - {u.role.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Content Message */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontWeight: "bold", color: "var(--color-title-main)" }}>Broadcast Message Content:</label>
                  <textarea
                    placeholder="Type your broadcast message content here..."
                    rows="6"
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    required
                    style={{ 
                      width: "100%", padding: "12px", borderRadius: "6px", 
                      border: "1px solid var(--border-light)", fontSize: "1rem",
                      backgroundColor: "var(--panel-bg)", color: "var(--color-title-main)",
                      fontFamily: "inherit", resize: "vertical"
                    }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="submit" className="btn-primary" style={{ padding: "12px 30px" }}>
                    🚀 Broadcast Message
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      setComposeContent("");
                      setActiveTab("inbox");
                    }} 
                    style={{ padding: "12px 30px" }}
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
