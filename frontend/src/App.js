import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import "./App.css";

// User components
import {
  AuthScreen,
  FilesPage,
  DashboardView,
  RemindersModal,
  AccessRequestModal,
  LogoutModal,
  DownloadRequestModal,
  ArchivesPage,
  InboxModal,
} from "./UserDashboard";

// Admin components
import {
  AccessModal,
  DeleteRequestsModal,
  AllAccessRequestsModal,
  DownloadRequestsModal,
  UserManagementModal,
} from "./AdminModals";
import BillingView from "./BillingView";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

export default function App() {
  // ─── View & Auth State ────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState("welcome"); // "welcome" | "auth" | "files" | "dashboard"
  const [dashboardMode, setDashboardMode] = useState("table"); // "table" | "analytics"
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileSearchCriteria, setFileSearchCriteria] = useState("filename"); // "filename" | "author"
  const [fileDateRange, setFileDateRange] = useState({ start: "", end: "" });
  const [fileViewMode, setFileViewMode] = useState("grid"); // "grid" | "list"
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const showNotify = (msg, type = "success") => {
    setNotification({ show: true, message: msg, type });
  };

  // ─── File & Data State ────────────────────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [currentFilePermission, setCurrentFilePermission] = useState("edit");
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [hiddenCols, setHiddenCols] = useState([]);
  const [frozenCols, setFrozenCols] = useState([]);
  const [fileFilter, setFileFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [activeColorFilters, setActiveColorFilters] = useState([]); // Empty array means "All Records"

  // ─── Row Editing State ────────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // ─── Reminder State ───────────────────────────────────────────────────────
  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);

  // ─── Modal State ──────────────────────────────────────────────────────────
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedFileForAccess, setSelectedFileForAccess] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [fileAccessList, setFileAccessList] = useState([]);

  const [showDeleteRequestsModal, setShowDeleteRequestsModal] = useState(false);
  const [deleteRequestsList, setDeleteRequestsList] = useState([]);

  const [showAccessRequestModal, setShowAccessRequestModal] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState([]);
  const [showAllAccessRequestsModal, setShowAllAccessRequestsModal] = useState(false);

  const [showDownloadRequestModal, setShowDownloadRequestModal] = useState(false);
  const [showDownloadRequestsModal, setShowDownloadRequestsModal] = useState(false);
  const [downloadRequestsList, setDownloadRequestsList] = useState([]);

  const [showUserManagementModal, setShowUserManagementModal] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [requestCounts, setRequestCounts] = useState({ delete: 0, access: 0, download: 0 });
  const [userApprovedCount, setUserApprovedCount] = useState(0);
  const [userRejectedCount, setUserRejectedCount] = useState(0);
  const [newlyGrantedFiles, setNewlyGrantedFiles] = useState([]);
  const [newlyRejectedFiles, setNewlyRejectedFiles] = useState([]);

  // Inbox & Messaging States
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [messagesList, setMessagesList] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const closeAllModals = () => {
    setShowAccessModal(false);
    setShowDeleteRequestsModal(false);
    setShowAccessRequestModal(false);
    setShowAllAccessRequestsModal(false);
    setShowDownloadRequestModal(false);
    setShowDownloadRequestsModal(false);
    setShowUserManagementModal(false);
    setShowReminders(false);
    setShowLogoutModal(false);
    setShowInboxModal(false);
  };

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const themeToggleBtn = (
    <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );

  // ─── Reminder Helpers ─────────────────────────────────────────────────────
  const calculateDaysLeft = (endDateStr) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    if (isNaN(end.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  const getDaysLeftClass = (days) => {
    if (days === null) return "";
    if (days < 0) return "days-left-red"; // Red for expired
    if (days <= 30) return "days-left-red"; // Red for 0-30
    if (days <= 60) return "days-left-yellow"; // Yellow for 30-60
    return "days-left-green"; // Green for > 60
  };

  const getReminderClass = (days) => {
    if (days <= 30) return "reminder-red";
    if (days <= 60) return "reminder-yellow";
    return "";
  };

  const checkReminders = (tableData) => {
    if (!tableData || tableData.length === 0) return;
    const enddateKey = Object.keys(tableData[0]).find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === "enddate"
    );
    const nameKey = Object.keys(tableData[0]).find((k) => {
      const n = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n === "contractorname" || n === "contractor" || n === "name";
    });

    const current = [];
    if (enddateKey) {
      tableData.forEach((row) => {
        const daysLeft = calculateDaysLeft(row[enddateKey]);
        if (daysLeft !== null && daysLeft <= 30) {
          current.push({
            id: row._id || Math.random().toString(),
            name: nameKey && row[nameKey] ? row[nameKey] : "Unknown Contractor",
            daysLeft,
            enddate: row[enddateKey],
          });
        }
      });
    }

    if (current.length > 0) {
      current.sort((a, b) => a.daysLeft - b.daysLeft);
      setReminders(current);
      setShowReminders(true);
    } else {
      setReminders([]);
    }
  };

  // ─── Init & File Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetchFiles();
    fetchMessages();
    if (currentUser?.role === "admin" || currentUser?.role === "super_admin") {
      fetchRequestCounts();
    } else {
      fetchUserNotifications();
    }
    if (currentView === "welcome") {
      const timer = setTimeout(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
            setCurrentView("files");
          } catch {
            setCurrentView("auth");
          }
        } else {
          setCurrentView("auth");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentView, currentUser?.role]);

  useEffect(() => {
    if (currentUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchMessages = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const res = await axios.get(`${API}/messages?user_id=${user.id}`);
      setMessagesList(res.data);
      const unreadCount = res.data.filter(
        (m) => !m.read_by.includes(user.id) && m.sender_id !== user.id
      ).length;
      setUnreadMessagesCount(unreadCount);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const fetchFiles = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const res = await axios.get(`${API}/files?user_id=${user.id}&role=${user.role}`);
      setFiles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequestCounts = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (user.role !== "admin" && user.role !== "super_admin") return;

      const [delRes, accRes, dlRes] = await Promise.all([
        axios.get(`${API}/file/delete_requests`),
        axios.get(`${API}/file/access_requests`),
        axios.get(`${API}/file/download_requests`)
      ]);
      setRequestCounts({
        delete: delRes.data.length,
        access: accRes.data.length,
        download: dlRes.data.length
      });
    } catch (err) {
      console.error("Error fetching request counts:", err);
    }
  };

  const fetchUserNotifications = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (user.role !== "admin" && user.role !== "super_admin") {
        const res = await axios.get(`${API}/file/user_notifications?user_id=${user.id}`);
        setUserApprovedCount(res.data.approved_count);
        setUserRejectedCount(res.data.rejected_count || 0);
        setNewlyGrantedFiles((res.data.newly_granted_access || []).map(g => g.file_id));
        setNewlyRejectedFiles((res.data.rejected_requests || []).map(r => r.file_id));
        
        const approvedCount = res.data.approved_count || 0;
        const rejectedCount = res.data.rejected_count || 0;
        
        if (approvedCount > 0 || rejectedCount > 0) {
          let messages = [];
          
          // 1. Handle Approvals (Grants)
          const newlyGranted = res.data.newly_granted_access || [];
          if (newlyGranted.length > 0) {
            messages.push("🟢 Access Approved:");
            newlyGranted.forEach(grant => {
              messages.push(`  • ${grant.filename || "a document"}`);
            });
          }
          
          // 2. Handle Rejections
          const rejectedRequests = res.data.rejected_requests || [];
          if (rejectedRequests.length > 0) {
            if (messages.length > 0) messages.push(""); // spacer line
            messages.push("❌ Access Rejected:");
            rejectedRequests.forEach(rej => {
              messages.push(`  • ${rej.filename}${rej.reason ? ` (Reason: ${rej.reason})` : ""}`);
            });
          }
          
          if (messages.length > 0) {
            setNotification({
              show: true,
              message: messages.join("\n"),
              type: rejectedCount > 0 ? "danger" : "success"
            });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching user notifications:", err);
    }
  };

  const dismissUserNotifications = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (user.role !== "admin" && user.role !== "super_admin") {
        await axios.post(`${API}/file/user_notifications/dismiss`, { user_id: user.id });
        setUserApprovedCount(0);
        setUserRejectedCount(0);
        setNewlyGrantedFiles([]);
        setNewlyRejectedFiles([]);
        fetchFiles(); // Refresh to clear highlights from file objects
      }
    } catch (err) {
      console.error("Error dismissing user notifications:", err);
    }
  };

  // ─── File Actions ─────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const saveToDb = window.confirm("Do you want to save this file in the database?");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save", saveToDb);
    if (currentUser) {
      formData.append("user_id", currentUser.id);
      formData.append("uploader_email", currentUser.email);
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API}/upload`, formData);
      setData(res.data.data);
      setColumns(res.data.columns || []);
      setCurrentFileId(res.data.file_id);
      setCurrentView("dashboard");
      checkReminders(res.data.data);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Error uploading file";
      alert(errorMsg);
    } finally {
      setLoading(false);
      e.target.value = null;
      if (saveToDb) fetchFiles();
    }
  };

  const openFile = async (file) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/data/${file._id}`);
      setCurrentFilePermission(file.permission || "edit");
      if (res.data.data) {
        setData(res.data.data);
        setColumns(res.data.columns || []);
        setCurrentFileId(file._id);
        setCurrentView("dashboard");
        checkReminders(res.data.data);
      } else {
        setData(res.data);
        setColumns([]);
        setCurrentFileId(file._id);
        setCurrentView("dashboard");
        checkReminders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId) => {
    if (currentUser?.role === "admin" || currentUser?.role === "super_admin") {
      if (window.confirm("Are you sure you want to move this file to the Archives? You can restore it later from the Archives tab.")) {
        try {
          await axios.post(`${API}/delete_file`, { id: fileId });
          fetchFiles();
          showNotify("File moved to Archives successfully!", "success");
        } catch (err) {
          console.error(err);
          showNotify("Error moving file to Archives.", "danger");
        }
      }
    } else {
      if (window.confirm("You don't have permission to delete. Would you like to send a deletion request to the admin?")) {
        try {
          await axios.post(`${API}/file/delete_request`, {
            file_id: fileId,
            user_email: currentUser.email,
          });
          showNotify("Delete request sent successfully!", "success");
        } catch (err) {
          console.error(err);
          showNotify("Error sending delete request.", "danger");
        }
      }
    }
  };

  const renameFile = async (fileId, newName) => {
    try {
      await axios.post(`${API}/file/rename`, { id: fileId, new_name: newName });
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert("Error renaming file");
    }
  };

  // ─── Row Actions ──────────────────────────────────────────────────────────
  const addRow = async () => {
    let newRow = {};
    const colsToUse =
      columns.length > 0
        ? columns
        : data.length > 0
          ? Object.keys(data[0]).filter((k) => k !== "_id" && k !== "file_id")
          : [];
    colsToUse.forEach((key) => (newRow[key] = ""));
    if (currentFileId) {
      newRow.file_id = currentFileId;
      try {
        const res = await axios.post(`${API}/add`, newRow);
        setData([...data, res.data.data]);
      } catch (err) {
        console.error(err);
      }
    } else {
      newRow._id = "temp_" + Date.now();
      setData([...data, newRow]);
    }
  };

  const deleteRow = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      if (currentFileId && !String(id).startsWith("temp_")) {
        try {
          await axios.post(`${API}/delete`, { id });
          setData(data.filter((row) => row._id !== id));
        } catch (err) {
          console.error(err);
        }
      } else {
        setData(data.filter((row) => row._id !== id));
      }
    }
  };

  const startEditing = (row) => {
    setEditingRowId(row._id);
    setEditFormData({ ...row });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleEditChange = (col, value) => {
    setEditFormData({ ...editFormData, [col]: value });
  };

  const saveEdit = async () => {
    if (currentFileId && !String(editingRowId).startsWith("temp_")) {
      try {
        await axios.post(`${API}/update_row`, editFormData);
        updateLocalData(editFormData);
      } catch (err) {
        console.error(err);
        alert("Error saving data");
      }
    } else {
      updateLocalData(editFormData);
    }
  };

  const updateLocalData = (updatedRow) => {
    setData(data.map((row) => (row._id === editingRowId ? updatedRow : row)));
    setEditingRowId(null);
    setEditFormData({});
  };

  // ─── Column Actions ───────────────────────────────────────────────────────
  const hideColumn = (col) => { if (!hiddenCols.includes(col)) setHiddenCols([...hiddenCols, col]); };
  const unhideColumn = (col) => setHiddenCols(hiddenCols.filter((c) => c !== col));
  const unhideAll = () => setHiddenCols([]);
  const toggleFreeze = (col) => {
    if (frozenCols.includes(col)) setFrozenCols(frozenCols.filter((c) => c !== col));
    else setFrozenCols([...frozenCols, col]);
  };

  // ─── Admin: Access Management ─────────────────────────────────────────────
  const openAccessModal = async (file) => {
    try {
      const usersRes = await axios.get(`${API}/users`);
      const accessRes = await axios.get(`${API}/file/access/${file._id}`);
      setUsersList(usersRes.data);
      setFileAccessList(accessRes.data);
      setSelectedFileForAccess(file);
      setShowAccessModal(true);
    } catch (err) {
      console.error(err);
      alert("Error loading access data");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFileAccess = async (fileId) => {
    try {
      const accessRes = await axios.get(`${API}/file/access/${fileId}`);
      setFileAccessList(accessRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const grantAccess = async (user_id, file_id, permission) => {
    try {
      const user_ids = Array.isArray(user_id) ? user_id : [user_id];
      await axios.post(`${API}/file/access`, { user_ids, file_id, permission });
      fetchFileAccess(file_id);
      showNotify(`Access granted successfully!`);
    } catch (err) {
      console.error(err);
      alert("Error granting access");
    }
  };

  const revokeAccess = async (user_id, file_id) => {
    try {
      const user_ids = Array.isArray(user_id) ? user_id : [user_id];
      await axios.delete(`${API}/file/access`, { data: { user_ids, file_id } });
      fetchFileAccess(file_id);
    } catch (err) {
      console.error(err);
      alert("Error revoking access");
    }
  };

  const grantAccessToAll = async (permission) => {
    try {
      await axios.post(`${API}/file/access/all`, {
        file_id: selectedFileForAccess._id,
        permission,
      });
      fetchFileAccess(selectedFileForAccess._id);
      showNotify("Mass access granted successfully!");
    } catch (err) {
      console.error(err);
      alert("Error granting bulk access");
    }
  };

  // ─── Admin: User Management Access ──────────────────────────────────────────
  const grantUserAccess = async (userId, fileId, permission) => {
    try {
      await axios.post(`${API}/file/access`, { user_id: userId, file_id: fileId, permission });
      return true;
    } catch (err) {
      console.error(err);
      alert("Error granting access: " + (err.response?.data?.error || err.message));
      throw err;
    }
  };

  const revokeUserAccess = async (userId, fileId) => {
    try {
      await axios.delete(`${API}/file/access`, { data: { user_id: userId, file_id: fileId } });
      return true;
    } catch (err) {
      console.error(err);
      alert("Error revoking access: " + (err.response?.data?.error || err.message));
      throw err;
    }
  };

  const deleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`);
      fetchUsers();
      showNotify("User deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Error deleting user: " + (err.response?.data?.error || err.message));
    }
  };

  // ─── Admin: Delete Requests ───────────────────────────────────────────────
  const openDeleteRequestsModal = async () => {
    try {
      const res = await axios.get(`${API}/file/delete_requests`);
      setDeleteRequestsList(res.data);
      setShowDeleteRequestsModal(true);
    } catch (err) {
      console.error(err);
      alert("Error loading delete requests");
    }
  };

  const approveDeleteRequest = async (reqId) => {
    try {
      await axios.post(`${API}/file/delete_request/approve`, { request_id: reqId });
      setDeleteRequestsList(deleteRequestsList.filter((r) => r._id !== reqId));
      fetchFiles();
      fetchRequestCounts();
      showNotify("Delete request approved and file removed successfully!", "success");
    } catch (err) {
      console.error(err);
      showNotify("Error approving request.", "danger");
    }
  };

  const rejectDeleteRequest = async (reqId) => {
    try {
      await axios.post(`${API}/file/delete_request/reject`, { request_id: reqId });
      setDeleteRequestsList(deleteRequestsList.filter((r) => r._id !== reqId));
      fetchRequestCounts();
      showNotify("Delete request rejected.", "success");
    } catch (err) {
      console.error(err);
      showNotify("Error rejecting request.", "danger");
    }
  };

  // ─── User: Access Requests ────────────────────────────────────────────────
  const requestFileAccess = async (file) => {
    try {
      await axios.post(`${API}/file/access_request`, {
        file_id: file._id,
        user_id: currentUser.id,
        user_email: currentUser.email,
      });
      showNotify("Access request sent successfully!");
      fetchFiles();
    } catch (err) {
      console.error(err);
      showNotify("Error requesting access.", "danger");
    }
  };

  // ─── Inbox / Broadcast Actions ────────────────────────────────────────────
  const openInbox = () => {
    fetchMessages();
    fetchUsers();
    setShowInboxModal(true);
  };

  const broadcastMessage = async (msgPayload) => {
    try {
      await axios.post(`${API}/messages/send`, msgPayload);
      showNotify("Broadcast message sent successfully!", "success");
      fetchMessages();
    } catch (err) {
      console.error(err);
      showNotify("Error sending broadcast message.", "danger");
    }
  };

  const replyMessageThread = async (messageId, content) => {
    try {
      await axios.post(`${API}/messages/reply`, {
        message_id: messageId,
        sender_id: currentUser.id,
        content: content,
      });
      fetchMessages();
    } catch (err) {
      console.error(err);
      showNotify("Error sending reply.", "danger");
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.post(`${API}/messages/read`, {
        message_id: messageId,
        user_id: currentUser.id,
      });
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const res = await axios.get(`${API}/file/access_requests`);
      setPendingAccessRequests(res.data);
      setShowAllAccessRequestsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccessRequestAction = async (reqId, action, permission = "view") => {
    try {
      let reason = "";
      if (action === "reject") {
        reason = window.prompt("Enter rejection reason (optional):") || "";
      }
      await axios.post(`${API}/file/access_request/action`, { request_id: reqId, action, permission, reason });
      setPendingAccessRequests(pendingAccessRequests.filter((r) => r._id !== reqId));
      fetchFiles();
      fetchRequestCounts();
      if (action === "approve") {
        showNotify("Access request approved!");
      } else {
        showNotify("Request rejected.", "danger");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing request");
    }
  };

  const approveAllAccessRequests = async (permission = "view") => {
    try {
      await axios.post(`${API}/file/access_requests/approve_all`, { permission });
      showNotify("All pending access requests have been approved successfully!");
      fetchFiles();
      fetchRequestCounts();
      setShowAllAccessRequestsModal(false);
    } catch (err) {
      console.error(err);
      alert("Error approving all requests");
    }
  };

  // ─── User: Download Requests ──────────────────────────────────────────────
  const requestDownloadAccess = async (file) => {
    try {
      await axios.post(`${API}/file/download_request`, {
        file_id: file._id,
        user_id: currentUser.id,
        user_email: currentUser.email,
      });
      showNotify("Download request sent successfully!");
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert("Error requesting download access");
    }
  };

  const openDownloadRequestsModal = async () => {
    try {
      const res = await axios.get(`${API}/file/download_requests`);
      setDownloadRequestsList(res.data);
      setShowDownloadRequestsModal(true);
    } catch (err) {
      console.error(err);
      alert("Error loading download requests");
    }
  };

  const handleDownloadRequestAction = async (reqId, action) => {
    try {
      await axios.post(`${API}/file/download_request/action`, { request_id: reqId, action });
      setDownloadRequestsList(downloadRequestsList.filter((r) => r._id !== reqId));
      fetchFiles();
      fetchRequestCounts();
    } catch (err) {
      console.error(err);
      alert("Error processing download request");
    }
  };

  const togglePin = async (fileId) => {
    try {
      await axios.post(`${API}/file/toggle_pin`, { file_id: fileId, user_id: currentUser.id });
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert("Error pinning/unpinning file");
    }
  };

  // ─── Admin: Archives ───────────────────────────────────────────────────────
  const fetchArchives = async () => {
    try {
      const res = await axios.get(`${API}/archives`);
      setArchivedFiles(res.data);
      setCurrentView("archives");
    } catch (err) {
      console.error(err);
      alert("Error loading archives");
    }
  };

  const restoreFile = async (fileId) => {
    try {
      await axios.post(`${API}/archives/restore`, { id: fileId });
      fetchArchives();
      fetchFiles();
      showNotify("File restored successfully!", "success");
    } catch (err) {
      console.error(err);
      showNotify("Error restoring file.", "danger");
    }
  };

  const permanentlyDeleteFile = async (fileId) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this file and ALL its associated data? This action cannot be undone.")) {
      try {
        await axios.delete(`${API}/archives/permanent`, { data: { id: fileId } });
        fetchArchives();
        showNotify("File permanently deleted.", "success");
      } catch (err) {
        console.error(err);
        showNotify("Error deleting file permanently.", "danger");
      }
    }
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === "login" ? "/login" : "/signup";
      const res = await axios.post(`${API}${endpoint}`, authForm);
      if (authMode === "signup") {
        alert("Sign up successful! Please log in.");
        setAuthMode("login");
        setAuthForm({ ...authForm, password: "", email: "" });
      } else {
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setCurrentUser(res.data.user);
        }
        setCurrentView("files");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const res = await axios.post(`${API}/google-login`, {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      setCurrentView("files");
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Google authentication failed on server";
      alert(`Google Login Failed: ${errMsg}`);
    }
  };

  const handleAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    setCurrentView("auth");
    setFiles([]);
    setData([]);
    setColumns([]);
    setSearchQuery("");
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const filteredFiles = files
    .filter((f) => {
      if (fileFilter === "all") return true;
      if (fileFilter === "my_files") return f.uploaded_by === currentUser?.id;
      if (fileFilter === "view_only") return f.permission === "view" && f.uploaded_by !== currentUser?.id;
      if (fileFilter === "edit_access") return f.permission === "edit" && f.uploaded_by !== currentUser?.id;
      return true;
    })
    .filter((f) => {
      // 1. Text Search
      if (fileSearchQuery) {
        const query = fileSearchQuery.toLowerCase();
        if (fileSearchCriteria === "filename") {
          if (!f.filename.toLowerCase().includes(query)) return false;
        } else {
          const author = f.uploader_email || "Unknown";
          if (!author.toLowerCase().includes(query)) return false;
        }
      }

      // 2. Date Range Search
      if (fileDateRange.start || fileDateRange.end) {
        const fileDate = new Date(f.uploaded_at);
        if (fileDateRange.start) {
          const start = new Date(fileDateRange.start);
          start.setHours(0, 0, 0, 0);
          if (fileDate < start) return false;
        }
        if (fileDateRange.end) {
          const end = new Date(fileDateRange.end);
          end.setHours(23, 59, 59, 999);
          if (fileDate > end) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
      
      // 1. New Access (Green) - Only for non-admins
      const aNew = !isAdmin && newlyGrantedFiles.includes(a._id) ? 1 : 0;
      const bNew = !isAdmin && newlyGrantedFiles.includes(b._id) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;

      // 2. New Rejection (Red) - Only for non-admins
      const aRej = !isAdmin && newlyRejectedFiles.includes(a._id) ? 1 : 0;
      const bRej = !isAdmin && newlyRejectedFiles.includes(b._id) ? 1 : 0;
      if (aRej !== bRej) return bRej - aRej;

      // 3. Access Status (Already unlocked files come first)
      const aAccess = a.has_access ? 1 : 0;
      const bAccess = b.has_access ? 1 : 0;
      if (aAccess !== bAccess) return bAccess - aAccess;

      // 4. Regular Pins (Pinned files move to top of their respective access group)
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      // 5. Default: Alphabetical by filename
      return a.filename.localeCompare(b.filename);
    });

  const getFileStatusIcon = (file) => {
    const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
    const isRejected = !isAdmin && (file.request_rejected || newlyRejectedFiles.includes(file._id));
    
    if (isRejected) return <span className="status-lock" style={{ color: "#ef4444", borderColor: "#ef4444" }} title="Rejected">❌ Rejected</span>;
    if (!file.has_access) return <span className="status-lock" title="No Access">🔒 Locked</span>;
    if (file.permission === "edit") return <span className="status-pen" title="Edit Access">✏️ Edit</span>;
    return <span className="status-eye" title="View Access">👁️ View</span>;
  };

  let availableColumns =
    columns.length > 0
      ? [...columns]
      : data.length > 0
        ? Object.keys(data[0]).filter((col) => col !== "_id" && col !== "file_id")
        : [];
  const enddateKey = availableColumns.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === "enddate");
  if (!availableColumns.includes("Days Left")) availableColumns.push("Days Left");
  const visibleColumns = availableColumns.filter((col) => !hiddenCols.includes(col));
  const sortedVisibleColumns = [
    ...frozenCols.filter((col) => visibleColumns.includes(col)),
    ...visibleColumns.filter((col) => !frozenCols.includes(col)),
  ];
  const filteredData = data.filter((row) => {
    // 1. Search Query
    if (searchQuery) {
      const match = visibleColumns.some((col) => {
        const v = row[col];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(searchQuery.toLowerCase());
      });
      if (!match) return false;
    }

    // 2. Color Filter
    if (enddateKey && activeColorFilters.length > 0) {
      const daysLeft = calculateDaysLeft(row[enddateKey]);
      let color = "none";
      if (daysLeft !== null) {
        if (daysLeft < 0) color = "expired";
        else if (daysLeft <= 30) color = "red";
        else if (daysLeft <= 60) color = "yellow";
        else color = "green";
      }

      if (!activeColorFilters.includes(color)) {
        return false;
      }
    }

    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortConfig.key !== null) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "Days Left" && enddateKey) {
        aVal = calculateDaysLeft(a[enddateKey]);
        bVal = calculateDaysLeft(b[enddateKey]);
      }

      // Attempt numeric sort if both values are numbers or strings containing numbers
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB) && aVal !== "" && bVal !== "") {
        aVal = numA;
        bVal = numB;
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const downloadFilteredExcel = () => {
    if (sortedData.length === 0) { alert("No data to export"); return; }
    const exportData = sortedData.map((row) => {
      const newRow = {};
      visibleColumns.forEach((col) => {
        newRow[col] = col === "Days Left" ? (enddateKey ? calculateDaysLeft(row[enddateKey]) : null) : row[col];
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard_Data");
    XLSX.writeFile(workbook, "Dashboard_Export.xlsx");
  };

  // ─── Loading / Welcome Screen ─────────────────────────────────────────────
  if (loading || currentView === "welcome") {
    const text = currentView === "welcome" ? "Welcome" : "Loading...";
    return (
      <div className="full-screen-center">
        <video className="bg-video" autoPlay loop muted>
          <source src="/new_video_dash -new.mp4" type="video/mp4" />
        </video>
        <div className="overlay-content">
          <h1>{text}</h1>
        </div>
      </div>
    );
  }

  // ─── Auth Screen ──────────────────────────────────────────────────────────
  if (currentView === "auth") {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        handleAuthChange={handleAuthChange}
        handleAuth={handleAuth}
        handleGoogleLogin={handleGoogleLogin}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        theme={theme}
        themeToggleBtn={themeToggleBtn}
      />
    );
  }

  // ─── Sidebar ──────────────────────────────────────────────────────────────
  const sideBar = currentUser && (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-profile-area">
          <div className="user-profile-circle tooltip-container" onClick={() => { closeAllModals(); setShowLogoutModal(true); }}>
            {currentUser.profile_image ? (
              <img src={currentUser.profile_image} alt="Profile" className="user-avatar-img" referrerPolicy="no-referrer" />
            ) : (
              <span className="user-avatar">
                {currentUser.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : currentUser.email
                    ? currentUser.email.charAt(0).toUpperCase()
                    : "U"}
              </span>
            )}
            <span className="tooltip-text">Click to Logout</span>
          </div>
          {themeToggleBtn}
        </div>
        <div className="sidebar-nav">
          <button 
            className={`sidebar-btn ${currentView === "files" && fileFilter === "all" ? "active" : ""}`} 
            onClick={async () => { 
              closeAllModals(); 
              await dismissUserNotifications(); 
              setCurrentView("files"); 
              setFileFilter("all"); 
            }} 
            title="Home / All Files" 
            style={{ position: 'relative' }}
          >
            <span className="icon">🏠</span><span className="label">Home</span>
            {userRejectedCount > 0 ? (
              <span className="notification-badge" style={{ backgroundColor: "#ef4444", color: "white" }}>
                {userApprovedCount + userRejectedCount}
              </span>
            ) : (
              userApprovedCount > 0 && (
                <span className="notification-badge-green">{userApprovedCount}</span>
              )
            )}
          </button>
          {currentUser?.role === "user" && (
            <>
              <button className={`sidebar-btn ${currentView === "files" && fileFilter === "my_files" ? "active" : ""}`} onClick={() => { closeAllModals(); setCurrentView("files"); setFileFilter("my_files"); }} title="My Files">
                <span className="icon">📂</span><span className="label">My Files</span>
              </button>
              <button className={`sidebar-btn ${currentView === "files" && fileFilter === "edit_access" ? "active" : ""}`} onClick={() => { closeAllModals(); setCurrentView("files"); setFileFilter("edit_access"); }} title="Edit Access">
                <span className="icon">✏️</span><span className="label">Edit Access</span>
              </button>
              <button className={`sidebar-btn ${currentView === "files" && fileFilter === "view_only" ? "active" : ""}`} onClick={() => { closeAllModals(); setCurrentView("files"); setFileFilter("view_only"); }} title="View Only">
                <span className="icon">👁️</span><span className="label">View Only</span>
              </button>
            </>
          )}
          {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && (
            <>
              <button className="sidebar-btn admin-btn" onClick={() => { closeAllModals(); fetchUsers(); setShowUserManagementModal(true); }} title="User Management">
                <span className="icon">👥</span><span className="label">User Management</span>
              </button>
              <button className="sidebar-btn admin-btn" onClick={() => { closeAllModals(); openDeleteRequestsModal(); }} title="Delete Requests">
                <span className="icon">🗑️</span><span className="label">Delete Requests</span>
                {requestCounts.delete > 0 && <span className="notification-badge">{requestCounts.delete}</span>}
              </button>
              <button className="sidebar-btn admin-btn" onClick={() => { closeAllModals(); fetchAccessRequests(); }} title="Access Requests">
                <span className="icon">🔑</span><span className="label">Access Requests</span>
                {requestCounts.access > 0 && <span className="notification-badge">{requestCounts.access}</span>}
              </button>
              <button className="sidebar-btn admin-btn" onClick={() => { closeAllModals(); openDownloadRequestsModal(); }} title="Download Requests">
                <span className="icon">📥</span><span className="label">Download Requests</span>
                {requestCounts.download > 0 && <span className="notification-badge">{requestCounts.download}</span>}
              </button>
              <button className={`sidebar-btn admin-btn ${currentView === "archives" ? "active" : ""}`} onClick={() => { closeAllModals(); fetchArchives(); }} title="Archives">
                <span className="icon">📦</span><span className="label">Archives</span>
              </button>
            </>
          )}
          {/* Billing Status Navigation (Available to all users) */}
          <button 
            className={`sidebar-btn ${currentView === "billing" ? "active" : ""}`} 
            onClick={() => { closeAllModals(); setCurrentView("billing"); }} 
            title="Billing Status"
          >
            <span className="icon">💳</span><span className="label">Billing Status</span>
          </button>
          {/* Inbox Messaging Navigation (Available to all users) */}
          <button 
            className={`sidebar-btn communication-btn ${showInboxModal ? "active" : ""}`} 
            onClick={openInbox} 
            title="Communication Hub"
            style={{ position: 'relative' }}
          >
            <span className="icon">💬</span><span className="label">Inbox Hub</span>
            {unreadMessagesCount > 0 && <span className="notification-badge" style={{ backgroundColor: "#ef4444", color: "white" }}>{unreadMessagesCount}</span>}
          </button>
        </div>
      </div>
      <div className="sidebar-bottom"></div>
    </div>
  );

  // ─── Main Layout ──────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      {sideBar}
      <div className={`main-content ${currentView === "dashboard" ? "dashboard-content" : ""}`}>

        {/* ── Files Page ── */}
        {currentView === "files" && (
          <FilesPage
            filteredFiles={filteredFiles}
            currentUser={currentUser}
            handleUpload={handleUpload}
            openFile={openFile}
            deleteFile={deleteFile}
            openAccessModal={openAccessModal}
            setSelectedFileForAccess={setSelectedFileForAccess}
            setShowAccessRequestModal={setShowAccessRequestModal}
            getFileStatusIcon={getFileStatusIcon}
            togglePin={togglePin}
            fileViewMode={fileViewMode}
            setFileViewMode={setFileViewMode}
            newlyGrantedFiles={newlyGrantedFiles}
            newlyRejectedFiles={newlyRejectedFiles}
            fileSearchQuery={fileSearchQuery}
            setFileSearchQuery={setFileSearchQuery}
            fileSearchCriteria={fileSearchCriteria}
            setFileSearchCriteria={setFileSearchCriteria}
            fileDateRange={fileDateRange}
            setFileDateRange={setFileDateRange}
          />
        )}

        {/* ── Archives Page ── */}
        {currentView === "archives" && (
          <ArchivesPage
            archivedFiles={archivedFiles}
            restoreFile={restoreFile}
            permanentlyDeleteFile={permanentlyDeleteFile}
            goBack={() => setCurrentView("files")}
          />
        )}

        {/* ── Dashboard ── */}
        {currentView === "dashboard" && (
          <DashboardView
            currentFileId={currentFileId}
            dashboardMode={dashboardMode}
            setDashboardMode={setDashboardMode}
            setShowReminders={setShowReminders}
            files={files}
            openAccessModal={openAccessModal}
            downloadFilteredExcel={downloadFilteredExcel}
            filteredData={sortedData}
            availableColumns={availableColumns}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hiddenCols={hiddenCols}
            unhideColumn={unhideColumn}
            unhideAll={unhideAll}
            sortedVisibleColumns={sortedVisibleColumns}
            frozenCols={frozenCols}
            toggleFreeze={toggleFreeze}
            hideColumn={hideColumn}
            enddateKey={enddateKey}
            calculateDaysLeft={calculateDaysLeft}
            getDaysLeftClass={getDaysLeftClass}
            editingRowId={editingRowId}
            editFormData={editFormData}
            handleEditChange={handleEditChange}
            saveEdit={saveEdit}
            cancelEditing={cancelEditing}
            startEditing={startEditing}
            deleteRow={deleteRow}
            currentFilePermission={currentFilePermission}
            addRow={addRow}
            visibleColumns={visibleColumns}
            renameFile={renameFile}
            currentUser={currentUser}
            setShowDownloadRequestModal={setShowDownloadRequestModal}
            theme={theme}
            goBack={() => setCurrentView("files")}
            requestSort={requestSort}
            sortConfig={sortConfig}
            activeColorFilters={activeColorFilters}
            setActiveColorFilters={setActiveColorFilters}
          />
        )}

        {/* ── Billing Page ── */}
        {currentView === "billing" && (
          <BillingView
            currentUser={currentUser}
            API={API}
            onOpenInbox={(prefillText) => {
              closeAllModals();
              // Prefill email template query since standard inbox limits messages for users
              const email = "support@cmrl.in";
              const subject = "Billing Status Inquiry";
              window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(prefillText)}`;
            }}
            showNotify={showNotify}
          />
        )}
      </div>

      {/* ══ USER MODALS ══════════════════════════════════════════════════════ */}
      <RemindersModal
        show={showReminders}
        onClose={() => setShowReminders(false)}
        reminders={reminders}
        getReminderClass={getReminderClass}
      />

      <AccessRequestModal
        show={showAccessRequestModal}
        onClose={() => setShowAccessRequestModal(false)}
        selectedFile={selectedFileForAccess}
        onRequest={requestFileAccess}
      />

      <LogoutModal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        currentUser={currentUser}
      />

      {/* ══ ADMIN MODALS ═════════════════════════════════════════════════════ */}
      <AccessModal
        show={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        selectedFile={selectedFileForAccess}
        usersList={usersList}
        fileAccessList={fileAccessList}
        onGrant={grantAccess}
        onGrantAll={grantAccessToAll}
        onRevoke={revokeAccess}
        isAdmin={currentUser?.role === "admin" || currentUser?.role === "super_admin"}
      />

      <DeleteRequestsModal
        show={showDeleteRequestsModal}
        onClose={() => setShowDeleteRequestsModal(false)}
        deleteRequestsList={deleteRequestsList}
        onApprove={approveDeleteRequest}
        onReject={rejectDeleteRequest}
      />

      <AllAccessRequestsModal
        show={showAllAccessRequestsModal}
        onClose={() => setShowAllAccessRequestsModal(false)}
        pendingAccessRequests={pendingAccessRequests}
        onAction={handleAccessRequestAction}
        onApproveAll={approveAllAccessRequests}
      />

      <DownloadRequestModal
        show={showDownloadRequestModal}
        onClose={() => setShowDownloadRequestModal(false)}
        selectedFile={files.find(f => f._id === currentFileId)}
        onRequest={requestDownloadAccess}
      />

      <DownloadRequestsModal
        show={showDownloadRequestsModal}
        onClose={() => setShowDownloadRequestsModal(false)}
        downloadRequestsList={downloadRequestsList}
        onAction={handleDownloadRequestAction}
      />

      <UserManagementModal
        show={showUserManagementModal}
        onClose={() => setShowUserManagementModal(false)}
        usersList={usersList}
        files={files}
        onGrant={grantUserAccess}
        onRevoke={revokeUserAccess}
        onDeleteUser={deleteUser}
        fetchUsers={fetchUsers}
        currentUser={currentUser}
        API={API}
      />

      <InboxModal
        show={showInboxModal}
        onClose={() => setShowInboxModal(false)}
        currentUser={currentUser}
        usersList={usersList}
        messages={messagesList}
        onSendMessage={broadcastMessage}
        onSendReply={replyMessageThread}
        onMarkAsRead={markMessageAsRead}
      />

      <NotificationModal
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => {
          setNotification({ ...notification, show: false });
          dismissUserNotifications();
        }}
      />
    </div>
  );
}

function NotificationModal({ show, message, type = "success", onClose }) {
  if (!show) return null;
  const isSuccess = type === "success";
  
  let title = "Success!";
  if (!isSuccess) {
    title = message.toLowerCase().includes("reject") ? "Request Rejected" : "Action Failed";
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className={`modal-content notification-modal-content ${type}`} style={{ maxWidth: "400px", textAlign: "center", padding: "30px" }}>
        {isSuccess ? (
          <div className="success-icon-wrapper">
            <div className="success-checkmark">
              <div className="check-icon">
                <span className="icon-line line-tip"></span>
                <span className="icon-line line-long"></span>
                <div className="icon-circle"></div>
                <div className="icon-fix"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="error-icon-wrapper">
            <div className="error-circle">✕</div>
          </div>
        )}
        <h3 style={{ margin: "20px 0 10px", color: isSuccess ? "var(--color-title-main)" : "#ef4444" }}>
          {title}
        </h3>
        <p style={{ color: "var(--color-text-subtitle)", marginBottom: "25px", whiteSpace: "pre-line", textAlign: "left", padding: "0 10px", lineHeight: "1.5" }}>{message}</p>
        <button 
          className={isSuccess ? "btn-primary" : "btn-secondary"} 
          onClick={onClose}
          style={{ width: "100%", padding: "12px", background: isSuccess ? "" : "#ef4444", color: isSuccess ? "" : "white", border: "none" }}
        >
          {isSuccess ? "Great, thanks!" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}