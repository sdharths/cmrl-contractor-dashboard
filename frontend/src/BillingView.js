import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// 12 Months mapping — keys match exact MongoDB field names (sanitized from Excel: only '.' → '_')
// Spaces in column names are PRESERVED as-is from the original Excel
const MONTHS_MAPPING = [
  { label: "Jan'26", key: "Jan'26",   remarksKey: "Remarks" },
  { label: "Feb'26", key: "Feb'26",   remarksKey: "Remarks_1" },
  { label: "Mar'26", key: "Mar'26",   remarksKey: "Remarks_2" },
  { label: "Apr'26", key: "Apr'26",   remarksKey: "Remarks_3" },
  { label: "May'26", key: "May'26",   remarksKey: "Remarks_4" },
  { label: "June'26", key: "June'26", remarksKey: "Remarks_5" },
  { label: "July'26", key: "July'26", remarksKey: "Remarks_6" },
  { label: "Aug'26", key: "Aug'26",   remarksKey: "Remarks_7" },
  { label: "Sep'26", key: "Sep'26",   remarksKey: "Remarks_8" },
  { label: "Oct'26", key: "Oct'6",    remarksKey: "Remarks_9" }, // Excel has "Oct'6" not "Oct'26"
  { label: "Nov'26", key: "Nov'26",   remarksKey: "Remarks_10" },
  { label: "Dec'26", key: "Dec'26",   remarksKey: "Remarks_11" }
];

export default function BillingView({ currentUser, API, onOpenInbox, showNotify }) {
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [activeCompanyId, setActiveCompanyId] = useState(null); // Admin expanded visual timeline row
  
  // Inline cell editing states (Admin only)
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // useCallback so useEffect dependency is stable
  const fetchBilling = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/billing/status?user_id=${currentUser.id}`);
      setBillingData(res.data);
      // Default: auto-select first record + current month for contractors
      if (res.data.length > 0 && currentUser.role === "user") {
        setActiveCompanyId(res.data[0]._id);
        const currentMonthData = MONTHS_MAPPING.find(m => m.label.startsWith("May")) || MONTHS_MAPPING[0];
        setSelectedMonth(currentMonthData);
      }
    } catch (err) {
      console.error("Error fetching billing status:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, API]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!window.confirm("Are you sure you want to synchronize and merge the current database billing records with this Excel sheet?")) {
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await axios.post(`${API}/billing/upload`, formData);
      showNotify(res.data.msg || "Billing records synchronized successfully!", "success");
      fetchBilling();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Error uploading billing spreadsheet";
      alert(errMsg);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const startEditing = (row) => {
    setEditingRowId(row._id);
    setEditFormData({ ...row });
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    try {
      setLoading(true);
      // Update each changed field
      const originalRow = billingData.find(r => r._id === editingRowId);
      const updatePromises = Object.keys(editFormData).map(async (key) => {
        if (editFormData[key] !== originalRow[key] && key !== "_id") {
          return axios.post(`${API}/billing/update`, {
            id: editingRowId,
            field: key,
            value: editFormData[key]
          });
        }
      });
      await Promise.all(updatePromises);
      showNotify("Billing cell updated successfully!", "success");
      setEditingRowId(null);
      fetchBilling();
    } catch (err) {
      console.error("Error saving edits:", err);
      alert("Error saving edits");
    } finally {
      setLoading(false);
    }
  };

  // Smart calculations for Contractor view
  const activeRecord = billingData.find(r => r._id === activeCompanyId);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const getDaysLeftClass = (days) => {
    const d = Number(days);
    if (isNaN(d)) return "days-left-green";
    if (d < 0) return "days-left-red";
    if (d <= 30) return "days-left-red";
    if (d <= 60) return "days-left-yellow";
    return "days-left-green";
  };

  const getStatusColor = (status) => {
    if (!status) return "gray";
    const s = String(status).toUpperCase();
    if (s.includes("PAID")) return "green";
    if (s.includes("PENDING")) return "yellow";
    if (s.includes("PROCESS") || s.includes("HOLD")) return "orange";
    return "gray";
  };

  const handleQueryHandler = (handler, companyName, monthLabel) => {
    if (!handler) return;
    // Set a prompt content for direct messaging
    const promptText = `Hello Admin,\n\nRegarding the billing status of ${companyName} for ${monthLabel}, we have a inquiry. Please check and let us know.\n\nThank you.`;
    // Trigger existing communication hub
    onOpenInbox(promptText);
  };

  const filteredData = billingData.filter(row => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (row.Company && row.Company.toLowerCase().includes(query)) ||
      (row.Description && row.Description.toLowerCase().includes(query)) ||
      (row["Contract No"] && String(row["Contract No"]).toLowerCase().includes(query)) ||
      (row["Handle By"] && String(row["Handle By"]).toLowerCase().includes(query)) ||
      (row["Efile No"] && String(row["Efile No"]).toLowerCase().includes(query))
    );
  });

  return (
    <div className="billing-status-panel files-page-container">
      <header className="files-header">
        <div className="header-content">
          <h1 className="title">💳 Billing & Payment Status</h1>
          <p className="subtitle">Track contractual values, active lifespans, and monthly billing pipelines.</p>
        </div>

        {isAdmin && (
          <div className="upload-wrapper">
            <label className="btn-primary upload-btn-professional">
              <span className="upload-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              Bulk Sync Excel
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}
      </header>

      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--color-text-main)" }}>
          <span style={{ fontSize: "1.2rem" }}>🔄 Syncing billing data...</span>
        </div>
      )}

      {/* contractor specific view */}
      {!isAdmin && (
        <>
          {billingData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <h3>No billing status found</h3>
              <p>Your contractor account is not associated with any active billing metadata. Please request the administrator to map your username or company.</p>
            </div>
          ) : (
            activeRecord && (
              <div className="contractor-billing-layout">
                {/* 0. Multi-Project Selector Tabs */}
                {billingData.length > 1 && (
                  <div className="project-selector-tabs" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    {billingData.map((project) => (
                      <button 
                        key={project._id}
                        className={`btn-primary ${activeCompanyId === project._id ? 'active' : ''}`}
                        style={{ 
                          backgroundColor: activeCompanyId === project._id ? 'var(--primary-color)' : 'var(--btn-secondary-bg)', 
                          color: activeCompanyId === project._id ? 'white' : 'var(--primary-color)',
                          border: `1px solid ${activeCompanyId === project._id ? 'transparent' : 'var(--btn-secondary-border)'}`,
                          padding: '8px 16px', borderRadius: '20px', whiteSpace: 'nowrap', transition: 'all 0.2s ease', cursor: 'pointer', fontSize: '0.9rem'
                        }}
                        onClick={() => setActiveCompanyId(project._id)}
                      >
                        {project["Efile No"] || "Project"} - {String(project.Description).slice(0, 25)}...
                      </button>
                    ))}
                  </div>
                )}

                {/* 1. Meta Details and KPI row */}
                <div className="billing-meta-section">
                  <div className="billing-company-header">
                    <h2>{activeRecord.Company}</h2>
                    <span className="billing-desc">{activeRecord.Description}</span>
                    <div className="billing-sub-meta">
                      <span><strong>Efile No:</strong> {activeRecord["Efile No"] || "N/A"}</span>
                      <span><strong>Contract No:</strong> {activeRecord["Contract No"] || "N/A"}</span>
                      <span><strong>Frequency:</strong> {activeRecord.Frequency || "MONTHLY"}</span>
                      <span><strong>Start:</strong> {activeRecord["Start Date"] ? String(activeRecord["Start Date"]).slice(0,10) : "N/A"}</span>
                      <span><strong>End:</strong> {activeRecord["End Date"] ? String(activeRecord["End Date"]).slice(0,10) : "N/A"}</span>
                    </div>
                  </div>

                  <div className="billing-kpi-row">
                    <div className="billing-kpi-card value-card">
                      <div className="kpi-label">Total Contract Value</div>
                      <div className="kpi-value">{activeRecord.Value || "N/A"}</div>
                      <div className="kpi-sub">Subject to contract terms</div>
                    </div>

                    <div className="billing-kpi-card days-card">
                      <div className="kpi-label">Days Left / Duration</div>
                      <div className="kpi-value">
                        <span className={`days-badge ${getDaysLeftClass(activeRecord["Days Left"])}`}>
                          {activeRecord["Days Left"] !== "" && activeRecord["Days Left"] !== undefined
                            ? `${Math.round(activeRecord["Days Left"])} Days`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="kpi-sub">Duration: {activeRecord.Duration || "N/A"}</div>
                    </div>

                    <div className="billing-kpi-card handler-card">
                      <div className="kpi-label">Contract Handler</div>
                      <div className="kpi-value handler-name">{activeRecord["Handle By"] || "N/A"}</div>
                      <div className="kpi-sub">CMRL Support Officer</div>
                    </div>
                  </div>
                </div>

                {/* 2. Horizontal Payment Milestone Timeline Pipeline */}
                <div className="billing-timeline-section">
                  <h3>📅 Monthly Payment Milestone Pipeline (2026)</h3>
                  <div className="timeline-pipeline-container">
                    <div className="timeline-connecting-line"></div>
                    <div className="timeline-nodes-wrapper">
                      {MONTHS_MAPPING.map((m) => {
                        const status = activeRecord[m.key];
                        const colorClass = getStatusColor(status);
                        const isSelected = selectedMonth?.key === m.key;

                        return (
                          <div 
                            key={m.key} 
                            className={`timeline-node ${colorClass} ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedMonth(m)}
                          >
                            <div className="node-circle" title={`${m.label}: ${status || "No record"}`}>
                              {colorClass === "green" && "✓"}
                              {colorClass === "yellow" && "⏳"}
                              {colorClass === "orange" && "⚙️"}
                            </div>
                            <span className="node-label">{m.label}</span>
                            <span className="node-status-sub">{status || "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Milestone Detail Remarks and Support query triggers */}
                {selectedMonth && (
                  <div className="billing-details-footer-row">
                    <div className="billing-details-box glass-panel">
                      <h4>Milestone: {selectedMonth.label}</h4>
                      <div className="details-grid">
                        <div className="details-col">
                          <strong>Payment Status:</strong>
                          <span className={`status-badge-inline ${getStatusColor(activeRecord[selectedMonth.key])}`}>
                            {activeRecord[selectedMonth.key] || "No Data / Uninvoiced"}
                          </span>
                        </div>
                        <div className="details-col remarks-col">
                          <strong>Amounts / Remarks:</strong>
                          <p className="remarks-text">
                            {activeRecord[selectedMonth.remarksKey] || "No associated invoices or statements available for this month."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="billing-escalation-box glass-panel">
                      <h4>Escalation Matrix & CMRL Help</h4>
                      <p>If there is any outstanding dispute or delay with this month's payments, query the designated support officer:</p>
                      <div className="support-officer-info">
                        <span><strong>Officer:</strong> {activeRecord["Handle By"] || "CMRL Admin"}</span>
                        {activeRecord["Escalation Metrix"] && (
                          <span><strong>Details:</strong> {activeRecord["Escalation Metrix"]}</span>
                        )}
                      </div>
                      <button 
                        className="btn-primary query-hub-btn"
                        onClick={() => handleQueryHandler(activeRecord["Handle By"], activeRecord.Company, selectedMonth.label)}
                      >
                        💬 Raise Query in Inbox Hub
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* admin / super_admin view */}
      {isAdmin && (
        <div className="admin-billing-layout">
          <div className="files-search-row">
            <div className="search-bar-wrapper main-search">
              <span className="search-icon-inside">🔍</span>
              <input
                type="text"
                placeholder="Search contractor, efile, handling officer..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "35px" }}
              />
            </div>
          </div>

          <div className="table-container" style={{ overflowX: "auto", marginTop: "20px" }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Efile No</th>
                  <th>Company Name</th>
                  <th style={{ minWidth: "200px" }}>Description</th>
                  <th>Contract No</th>
                  <th>Total Value</th>
                  <th>Days Left</th>
                  <th>Freq</th>
                  <th>Handle By</th>
                  <th>Timeline (Jan–Dec)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(row => {
                  const isEditing = editingRowId === row._id;
                  const isExpanded = activeCompanyId === row._id;
                  
                  return (
                    <React.Fragment key={row._id}>
                      <tr className={isExpanded ? "expanded-row-highlight" : ""}>
                        <td>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData["Efile No"] !== undefined ? editFormData["Efile No"] : row["Efile No"]}
                              onChange={(e) => handleEditChange("Efile No", e.target.value)}
                            />
                          ) : row["Efile No"]}
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData.Company !== undefined ? editFormData.Company : row.Company}
                              onChange={(e) => handleEditChange("Company", e.target.value)}
                            />
                          ) : row.Company}
                        </td>
                        <td style={{ maxWidth: "220px", whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData.Description !== undefined ? editFormData.Description : row.Description}
                              onChange={(e) => handleEditChange("Description", e.target.value)}
                            />
                          ) : row.Description}
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData["Contract No"] !== undefined ? editFormData["Contract No"] : row["Contract No"]}
                              onChange={(e) => handleEditChange("Contract No", e.target.value)}
                            />
                          ) : (row["Contract No"] || "—")}
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData.Value !== undefined ? editFormData.Value : row.Value}
                              onChange={(e) => handleEditChange("Value", e.target.value)}
                            />
                          ) : row.Value}
                        </td>
                        <td>
                          {row["Days Left"] !== "" && row["Days Left"] !== undefined ? (
                            <span className={`days-badge ${getDaysLeftClass(row["Days Left"])}`} style={{ fontSize: "0.8rem", padding: "3px 8px" }}>
                              {Math.round(row["Days Left"])}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData.Frequency !== undefined ? editFormData.Frequency : row.Frequency}
                              onChange={(e) => handleEditChange("Frequency", e.target.value)}
                            />
                          ) : (row.Frequency || "—")}
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              className="edit-input"
                              value={editFormData["Handle By"] !== undefined ? editFormData["Handle By"] : row["Handle By"]}
                              onChange={(e) => handleEditChange("Handle By", e.target.value)}
                            />
                          ) : row["Handle By"]}
                        </td>
                        
                        {/* payment dots representation */}
                        <td>
                          <div className="payment-dots-grid" onClick={() => setActiveCompanyId(isExpanded ? null : row._id)} title="Click to view details timeline">
                            {MONTHS_MAPPING.map(m => {
                              const color = getStatusColor(row[m.key]);
                              return <span key={m.key} className={`dot ${color}`} title={`${m.label}: ${row[m.key] || "No Data"}`}></span>;
                            })}
                          </div>
                        </td>

                        <td>
                          <div className="actions-cell">
                            {isEditing ? (
                              <>
                                <button className="btn-icon" onClick={saveEdit} title="Save">💾</button>
                                <button className="btn-icon" onClick={() => setEditingRowId(null)} title="Cancel">❌</button>
                              </>
                            ) : (
                              <>
                                <button className="btn-icon" onClick={() => startEditing(row)} title="Edit Row">✏️</button>
                                <button 
                                  className="btn-icon" 
                                  onClick={() => setActiveCompanyId(isExpanded ? null : row._id)}
                                  title="Toggle pipeline timeline"
                                >
                                  {isExpanded ? "🔼" : "👁️"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* expanded visual timeline for admin inline inspector */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="9" className="admin-expanded-timeline-cell">
                            <div className="admin-expanded-timeline-wrapper">
                              <h4>Payment Pipeline Timeline for {row.Company}</h4>
                              <div className="timeline-pipeline-container admin-pipeline">
                                <div className="timeline-connecting-line"></div>
                                <div className="timeline-nodes-wrapper">
                                  {MONTHS_MAPPING.map((m) => {
                                    const status = row[m.key];
                                    const remarks = row[m.remarksKey];
                                    const colorClass = getStatusColor(status);

                                    return (
                                      <div key={m.key} className={`timeline-node ${colorClass}`}>
                                        {isEditing ? (
                                          <select
                                            className="timeline-status-select"
                                            value={editFormData[m.key] !== undefined ? editFormData[m.key] : status}
                                            onChange={(e) => handleEditChange(m.key, e.target.value)}
                                          >
                                            <option value="">—</option>
                                            <option value="PAID">PAID</option>
                                            <option value="PENDING">PENDING</option>
                                            <option value="PROCESSING">PROCESSING</option>
                                          </select>
                                        ) : (
                                          <div className="node-circle" onClick={() => setSelectedMonth(m)}>
                                            {colorClass === "green" && "✓"}
                                            {colorClass === "yellow" && "⏳"}
                                            {colorClass === "orange" && "⚙️"}
                                          </div>
                                        )}
                                        <span className="node-label">{m.label}</span>
                                        {isEditing ? (
                                          <input 
                                            className="timeline-remarks-input"
                                            placeholder="Remarks..."
                                            value={editFormData[m.remarksKey] !== undefined ? editFormData[m.remarksKey] : remarks}
                                            onChange={(e) => handleEditChange(m.remarksKey, e.target.value)}
                                          />
                                        ) : (
                                          <span className="node-remarks-sub" title={remarks}>{remarks || "—"}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
