// Global variables
let rowCounter = 0;
let savedData = [];
const STORAGE_KEY = 'dashboardData';

// Undo/Redo System
let history = [];
let historyIndex = -1;
const MAX_HISTORY_SIZE = 50;

// Bulk operations global variables
let selectedRows = new Set();
let editMode = false;
let auditTrail = {};

// Update bulk operations UI
function updateBulkUI() {
    const selectedCount = document.getElementById('selectedCount');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkEditBtn = document.getElementById('bulkEditBtn');
    const editModeIndicator = document.getElementById('editModeIndicator');
    const count = selectedRows.size;
    
    if (count > 0) {
        if (selectedCount) {
            selectedCount.textContent = `${count} selected`;
            selectedCount.style.display = 'inline-block';
        }
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = 'flex';
        }
        if (bulkEditBtn) {
            bulkEditBtn.style.display = 'flex';
        }
    } else {
        // Hide all bulk operation elements
        if (selectedCount) {
            selectedCount.style.display = 'none';
        }
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = 'none';
        }
        if (bulkEditBtn) {
            bulkEditBtn.style.display = 'none';
        }
        
        // Hide edit mode indicator and exit edit mode when no rows selected
        if (editModeIndicator) {
            editModeIndicator.classList.remove('show');
        }
        
        // Exit edit mode and remove edit-mode class from all rows
        if (editMode) {
            editMode = false;
            document.querySelectorAll('.edit-mode').forEach(row => {
                row.classList.remove('edit-mode');
            });
        }
    }
}

// Bulk delete selected rows
function bulkDeleteSelected() {
    if (selectedRows.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedRows.size} selected row(s)?`)) {
        selectedRows.forEach(row => {
            // Add to audit trail
            const sno = row.querySelector('.sno-input')?.value || 'Unknown';
            addAuditEntry('bulk_delete', sno, 'Row deleted', 'Bulk delete operation');
            
            // Remove row
            row.remove();
        });
        
        selectedRows.clear();
        updateBulkUI();
        updateTotalCount();
        saveState();
    }
}

// Toggle bulk edit mode
function toggleBulkEditMode() {
    editMode = !editMode;
    const editModeIndicator = document.getElementById('editModeIndicator');
    
    if (editMode) {
        selectedRows.forEach(row => {
            row.classList.add('edit-mode');
            // Enable all inputs in the row
            const inputs = row.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            });
        });
        
        if (editModeIndicator) {
            editModeIndicator.classList.add('show');
        }
    } else {
        document.querySelectorAll('.edit-mode').forEach(row => {
            row.classList.remove('edit-mode');
        });
        
        if (editModeIndicator) {
            editModeIndicator.classList.remove('show');
        }
    }
}

// Add audit trail entry
function addAuditEntry(action, identifier, details, user) {
    const timestamp = new Date().toISOString();
    const currentUser = user || getCurrentUser();
    
    if (!auditTrail[identifier]) {
        auditTrail[identifier] = [];
    }
    
    auditTrail[identifier].push({
        action,
        details,
        user: currentUser,
        timestamp,
        originalValue: details
    });
    
    // Keep only last 10 entries per identifier
    if (auditTrail[identifier].length > 10) {
        auditTrail[identifier] = auditTrail[identifier].slice(-10);
    }
}

// Get current user (simplified)
function getCurrentUser() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userNameDropdown');
    return userName?.textContent || userAvatar?.textContent || 'Unknown User';
}

// Setup right-click audit trail context menu
function setupAuditTrailContextMenu() {
    const auditMenu = document.getElementById('auditMenu');
    
    // Add context menu to all input fields
    document.addEventListener('contextmenu', function(e) {
        const target = e.target;
        if (target.matches('input, select')) {
            e.preventDefault();
            showAuditMenu(e, target);
        }
    });
    
    // Hide menu when clicking outside
    document.addEventListener('click', function(e) {
        if (auditMenu && !auditMenu.contains(e.target)) {
            auditMenu.classList.remove('show');
        }
    });
}

// Show audit trail context menu
function showAuditMenu(e, element) {
    const auditMenu = document.getElementById('auditMenu');
    const row = element.closest('tr');
    const sno = row?.querySelector('.sno-input')?.value || 'Unknown';
    
    // Update audit menu content
    const auditField = document.getElementById('auditField');
    const auditValue = document.getElementById('auditValue');
    const auditTime = document.getElementById('auditTime');
    const auditUser = document.getElementById('auditUser');
    const auditModified = document.getElementById('auditModified');
    const auditOriginal = document.getElementById('auditOriginal');
    const auditOriginalTime = document.getElementById('auditOriginalTime');
    
    // Get field name from element
    const fieldClass = element.className;
    let fieldName = 'Unknown Field';
    if (fieldClass.includes('sno')) fieldName = 'S.NO';
    else if (fieldClass.includes('efile')) fieldName = 'E-FILE';
    else if (fieldClass.includes('contractor')) fieldName = 'CONTRACTOR';
    else if (fieldClass.includes('description')) fieldName = 'DESCRIPTION';
    else if (fieldClass.includes('value')) fieldName = 'VALUE';
    else if (fieldClass.includes('gst')) fieldName = 'GST';
    else if (fieldClass.includes('start-date')) fieldName = 'START DATE';
    else if (fieldClass.includes('end-date')) fieldName = 'END DATE';
    
    // Update display
    if (auditField) auditField.textContent = fieldName;
    if (auditValue) auditValue.textContent = element.value || 'Empty';
    if (auditTime) auditTime.textContent = new Date().toLocaleString();
    
    // Get audit trail data
    const trail = auditTrail[sno] || [];
    const latestEntry = trail[trail.length - 1];
    
    if (latestEntry) {
        if (auditUser) auditUser.textContent = latestEntry.user;
        if (auditModified) auditModified.textContent = new Date(latestEntry.timestamp).toLocaleString();
        if (auditOriginal) auditOriginal.textContent = latestEntry.originalValue;
        if (auditOriginalTime) auditOriginalTime.textContent = new Date(latestEntry.timestamp).toLocaleString();
    }
    
    // Position and show menu
    if (auditMenu) {
        auditMenu.style.left = e.pageX + 'px';
        auditMenu.style.top = e.pageY + 'px';
        auditMenu.classList.add('show');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize table filters
    initializeTableFilters();
    
    // Initialize bulk operations
    initializeBulkOperations();
    
    // Setup audit trail context menu
    setupAuditTrailContextMenu();
    
    // Add refresh warning
    window.addEventListener('beforeunload', function (e) {
        const hasUnsavedChanges = document.getElementById('tableBody').children.length > 0;
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
    
    loadData();
    setupEventListeners();
    updateTotalCount();
    setupMobileMenu();
    setupKeyboardShortcuts(); // Add keyboard shortcuts
    setupArrowKeyNavigation(); // Add arrow key navigation

    // Check for duration warnings after data loads
    setTimeout(() => {
        checkAllDurations();
        updateAllDurations(); // Update all durations to show current days left
        startRealTimeDurationUpdates(); // Start real-time updates
    }, 500);
    
    // Listen for cross-page data sync events
    window.addEventListener('storage', function(e) {
        if (e.key === 'crossPageDataSync' && e.newValue) {
            try {
                const syncData = JSON.parse(e.newValue);
                console.log('Received cross-page data sync');
                // Apply synced data if current page is empty
                if (document.getElementById('tableBody').children.length === 0) {
                    loadSyncedData(syncData);
                }
            } catch (error) {
                console.error('Error parsing cross-page sync data:', error);
            }
        }
    });
    
    // Listen for custom data sync events
    window.addEventListener('dataSync', function(e) {
        console.log('Data sync event received');
    });
});

// Setup keyboard shortcuts for Ctrl+Z and Ctrl+Y
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
            return;
        }
        
        // Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
            return;
        }
        
        // Also support Ctrl+Shift+Z for redo (alternative)
        if (e.ctrlKey && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            redo();
            return;
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addRowBtn').addEventListener('click', addRow);
    document.getElementById('importBtn').addEventListener('click', importFromExcel);
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('refreshBtn').addEventListener('click', refreshPage);
    document.getElementById('printBtn').addEventListener('click', printTable);
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    
    // Undo/Redo buttons
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            filterTable(e.target.value);
        });
    }

    // Notification bell button - open notification modal
    const notificationBellBtn = document.getElementById('notificationBellBtn');
    if (notificationBellBtn) {
        notificationBellBtn.addEventListener('click', function () {
            openNotificationModal();
        });
    }

    // Notification close button
    const closeNotificationBtn = document.getElementById('closeNotification');
    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', closeNotification);
    }

    // Close notification on overlay click
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.addEventListener('click', function (e) {
            if (e.target === notificationModal) {
                closeNotification();
            }
        });
    }

    // Close notification on Escape key
    // Close notification on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeNotification();
        }
    });

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            const user = Auth.getUser();
            if (user) {
                const currentTheme = user.theme || 'light';
                const newTheme = (currentTheme === 'light') ? 'dark' : 'light';
                Auth.updateTheme(newTheme);
            }
        });
    }
}

// Mobile menu functionality
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    if (mobileMenuToggle && sidebar) {
        // Toggle menu
        mobileMenuToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
            mobileMenuToggle.classList.toggle('active');
            overlay.classList.toggle('active');

            // Change icon
            const icon = mobileMenuToggle.querySelector('i');
            if (sidebar.classList.contains('mobile-open')) {
                icon.className = 'fas fa-times';
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            } else {
                icon.className = 'fas fa-bars';
                document.body.style.overflow = '';
            }
        });

        // Close menu when clicking overlay
        overlay.addEventListener('click', function () {
            sidebar.classList.remove('mobile-open');
            mobileMenuToggle.classList.remove('active');
            overlay.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            icon.className = 'fas fa-bars';
            document.body.style.overflow = '';
        });

        // Close sidebar when clicking a nav item on mobile
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    mobileMenuToggle.classList.remove('active');
                    overlay.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.className = 'fas fa-bars';
                    document.body.style.overflow = '';
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('mobile-open');
                mobileMenuToggle.classList.remove('active');
                overlay.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                icon.className = 'fas fa-bars';
                document.body.style.overflow = '';
            }
        });
    }
}

// Get the current contractor value, preferring the visible element
function getContractorValue(row) {
    const contractorLink = row.querySelector('.contractor-link');
    if (contractorLink && contractorLink.style.display !== 'none' && contractorLink.textContent) {
        return contractorLink.textContent.trim();
    }
    const contractorInput = row.querySelector('.contractor-input');
    return contractorInput ? contractorInput.value.trim() : '';
}

// Add row function (updated with checkbox)
function addRow() {
    return addRowWithCheckbox();
}

// Update bulk operations to work with S.NO checkboxes (no select all)
function initializeBulkOperations() {
    // Individual checkbox functionality only
    document.addEventListener('change', function(e) {
        if (e.target.matches('.sno-checkbox')) {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                selectedRows.add(row);
                row.classList.add('selected');
            } else {
                selectedRows.delete(row);
                row.classList.remove('selected');
            }
            updateBulkUI();
        }
    });
    
    // Bulk delete button
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteSelected);
    }
    
    // Bulk edit button
    const bulkEditBtn = document.getElementById('bulkEditBtn');
    if (bulkEditBtn) {
        bulkEditBtn.addEventListener('click', toggleBulkEditMode);
    }
}

// Calculate duration between start and end date
function calculateDuration(event) {
    const row = event.target.closest('tr');
    const startDateInput = row.querySelector('.start-date-input');
    const endDateInput = row.querySelector('.end-date-input');
    const durationDisplay = row.querySelector('.duration-display');
    const durationCell = durationDisplay.parentElement;

    if (startDateInput.value && endDateInput.value) {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation

        if (endDate >= startDate) {
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                durationDisplay.textContent = 'Expired';
                durationDisplay.classList.remove('duration-safe');
                durationDisplay.classList.add('duration-left');
            } else if (diffDays === 0) {
                durationDisplay.textContent = 'Expires today';
                durationDisplay.classList.remove('duration-safe');
                durationDisplay.classList.add('duration-left');
            } else {
                durationDisplay.textContent = `${diffDays} days left`;
                durationDisplay.classList.remove('duration-left', 'duration-safe');

                // Color coding: red if <= 60 days
                if (diffDays <= 60) {
                    durationDisplay.classList.add('duration-left');
                    // Show notification pop-up
                    showDurationNotification(row, diffDays);
                } else {
                    durationDisplay.classList.add('duration-safe');
                }
            }
        } else {
            durationDisplay.textContent = 'Invalid dates';
            durationDisplay.classList.remove('duration-safe');
            durationDisplay.classList.add('duration-left');
        }
    } else {
        durationDisplay.textContent = '-';
        durationDisplay.classList.remove('duration-left', 'duration-safe');
    }

    // Auto-save after calculation
    saveDataToStorage();
    // Update notification badge
    updateNotificationCount();
}

// Update all durations to show current days left from today
function updateAllDurations() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const startDateInput = row.querySelector('.start-date-input');
        const endDateInput = row.querySelector('.end-date-input');
        const durationDisplay = row.querySelector('.duration-display');

        if (startDateInput && endDateInput && durationDisplay && 
            startDateInput.value && endDateInput.value) {
            
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation

            if (endDate >= startDate) {
                const diffTime = endDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    durationDisplay.textContent = 'Expired';
                    durationDisplay.classList.remove('duration-safe');
                    durationDisplay.classList.add('duration-left');
                } else if (diffDays === 0) {
                    durationDisplay.textContent = 'Expires today';
                    durationDisplay.classList.remove('duration-safe');
                    durationDisplay.classList.add('duration-left');
                } else {
                    durationDisplay.textContent = `${diffDays} days left`;
                    durationDisplay.classList.remove('duration-left', 'duration-safe');

                    // Color coding: red if <= 60 days
                    if (diffDays <= 60) {
                        durationDisplay.classList.add('duration-left');
                    } else {
                        durationDisplay.classList.add('duration-safe');
                    }
                }
            } else {
                durationDisplay.textContent = 'Invalid dates';
                durationDisplay.classList.remove('duration-safe');
                durationDisplay.classList.add('duration-left');
            }
        }
    });
    
    // Update notification badge after updating all durations
    updateNotificationCount();
}

// Start real-time duration updates based on current date
function startRealTimeDurationUpdates() {
    let lastUpdateDate = new Date().toDateString(); // Track the last update date
    
    // Create real-time status indicator
    createRealTimeStatusIndicator();
    
    // Function to calculate time until next midnight
    function getTimeUntilMidnight() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime() - now.getTime();
    }
    
    // Function to schedule next update
    function scheduleNextUpdate() {
        const timeUntilMidnight = getTimeUntilMidnight();
        
        // Schedule update for midnight
        setTimeout(() => {
            const currentDate = new Date();
            const currentDateString = currentDate.toDateString();
            
            if (lastUpdateDate !== currentDateString) {
                console.log('Midnight reached, updating durations for new day...');
                lastUpdateDate = currentDateString;
                
                // Update all durations for the new day
                updateAllDurations();
                
                // Check for new warnings
                checkAllDurations();
                
                // Show notification about the update
                showDateChangeNotification();
                
                // Update status indicator
                updateRealTimeStatusIndicator();
            }
            
            // Schedule next midnight check
            scheduleNextUpdate();
        }, timeUntilMidnight);
        
        // Also update every minute for real-time accuracy during the day
        setInterval(() => {
            updateAllDurations();
            updateRealTimeStatusIndicator();
        }, 60000); // Check every minute
    }
    
    // Start the scheduling
    scheduleNextUpdate();
    
    // Initial update
    updateAllDurations();
    updateRealTimeStatusIndicator();
}

// Create real-time status indicator
function createRealTimeStatusIndicator() {
    // Disabled - removed "Last updated" text
    return;
}

// Update real-time status indicator
function updateRealTimeStatusIndicator() {
    const statusText = document.getElementById('lastUpdateText');
    if (!statusText) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    statusText.textContent = `Last updated: ${timeString}`;
}

// Show subtle notification when date changes and durations are updated
function showDateChangeNotification() {
    // Create a subtle notification that durations have been updated
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2ecc71, #27ae60);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-sync-alt" style="margin-right: 8px;"></i>
        Durations updated for new day
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Show notification pop-up for duration <= 60 days
function showDurationNotification(row, days) {
    // Get row data
    const sno = row.querySelector('.sno-input')?.value || '';
    const efile = row.querySelector('.efile-input')?.value || '';
    const contractorInput = row.querySelector('.contractor-input');
    const contractorLink = row.querySelector('.contractor-link');
    const contractor = contractorInput ? contractorInput.value : (contractorLink ? contractorLink.textContent : '');
    const description = row.querySelector('.description-input')?.value || '';
    const value = row.querySelector('.value-input')?.value || '';
    const startDate = row.querySelector('.start-date-input')?.value || '';
    const endDate = row.querySelector('.end-date-input')?.value || '';

    // Create notification item
    const notificationItem = `
        <div class="notification-item">
            <div class="notification-item-title">
                <i class="fas fa-exclamation-circle"></i>
                Warning: Only ${days} days remaining!
            </div>
            <div class="notification-item-details">
                <div>
                    <strong>S.NO</strong>
                    <span>${sno || 'N/A'}</span>
                </div>
                <div>
                    <strong>E-FILE</strong>
                    <span>${efile || 'N/A'}</span>
                </div>
                <div>
                    <strong>CONTRACTOR</strong>
                    <span>${contractor || 'N/A'}</span>
                </div>
                <div>
                    <strong>DESCRIPTION</strong>
                    <span>${description || 'N/A'}</span>
                </div>
                <div>
                    <strong>VALUE</strong>
                    <span>${value || 'N/A'}</span>
                </div>
                <div>
                    <strong>START DATE</strong>
                    <span>${startDate || 'N/A'}</span>
                </div>
                <div>
                    <strong>END DATE</strong>
                    <span>${endDate || 'N/A'}</span>
                </div>
                <div>
                    <strong>DURATION</strong>
                    <span style="color: #ff4444; font-weight: bold;">${days} days left</span>
                </div>
            </div>
        </div>
    `;

    // Get or create notification modal
    let modal = document.getElementById('notificationModal');
    if (!modal) {
        // Create modal if it doesn't exist (for dynamic creation)
        modal = document.createElement('div');
        modal.className = 'notification-modal';
        modal.id = 'notificationModal';
        modal.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Duration Warning</h3>
                    <button class="notification-close" id="closeNotification">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-body" id="notificationBody"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add close button event
        const closeBtn = modal.querySelector('#closeNotification');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeNotification);
        }

        // Close on overlay click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeNotification();
            }
        });
    }

    const notificationBody = document.getElementById('notificationBody');
    if (notificationBody) {
        // Check if this notification already exists (avoid duplicates)
        const existingNotifications = notificationBody.querySelectorAll('.notification-item');
        let isDuplicate = false;

        existingNotifications.forEach(item => {
            // Find S.NO in the notification item
            const details = item.querySelectorAll('.notification-item-details div');
            details.forEach(detail => {
                const strong = detail.querySelector('strong');
                if (strong && strong.textContent.trim() === 'S.NO') {
                    const snoText = detail.querySelector('span')?.textContent.trim();
                    if (snoText === sno) {
                        isDuplicate = true;
                    }
                }
            });
        });

        if (!isDuplicate) {
            // Add new notification
            notificationBody.insertAdjacentHTML('afterbegin', notificationItem);
        }

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Open notification modal and show all duration warnings
function openNotificationModal() {
    // Check if we're on contractor list page (has duration column)
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
        // Not on contractor list page
        showNotificationMessage('This feature is available on the Contractor List page.');
        return;
    }

    // First, check all rows for duration warnings
    checkAllDurations();
    // Update badge to reflect current warnings
    updateNotificationCount();

    // Get or create notification modal
    let modal = document.getElementById('notificationModal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.className = 'notification-modal';
        modal.id = 'notificationModal';
        modal.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Duration Warning</h3>
                    <button class="notification-close" id="closeNotification">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-body" id="notificationBody"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add close button event
        const closeBtn = modal.querySelector('#closeNotification');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeNotification);
        }

        // Close on overlay click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeNotification();
            }
        });
    }

    const notificationBody = document.getElementById('notificationBody');

    // If no warnings found, show empty message
    if (!notificationBody || notificationBody.children.length === 0) {
        if (notificationBody) {
            notificationBody.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #00d4ff; margin-bottom: 15px; display: block;"></i>
                    <p>No duration warnings found!</p>
                    <p style="font-size: 14px; margin-top: 10px; color: rgba(255, 255, 255, 0.5);">All contracts have more than 60 days remaining.</p>
                </div>
            `;
        }
    }

    // Show modal
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Show a simple notification message
function showNotificationMessage(message) {
    let modal = document.getElementById('notificationModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'notification-modal';
        modal.id = 'notificationModal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <h3><i class="fas fa-info-circle"></i> Information</h3>
                <button class="notification-close" id="closeNotification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-body">
                <div class="notification-empty">
                    <i class="fas fa-info-circle" style="font-size: 48px; color: #00d4ff; margin-bottom: 15px; display: block;"></i>
                    <p>${message}</p>
                </div>
            </div>
        </div>
    `;

    // Add close button event
    const closeBtn = modal.querySelector('#closeNotification');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeNotification);
    }

    // Close on overlay click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeNotification();
        }
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close notification modal
function closeNotification() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Update notification badge count (duration <= 60)
function updateNotificationCount() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const count = getWarningCount();

    if (count > 0) {
        badge.textContent = count;
        badge.classList.add('active');
    } else {
        badge.textContent = '0';
        badge.classList.remove('active');
    }
}

// Get count of rows with duration <= 60
function getWarningCount() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return 0;

    let count = 0;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const startDateInput = row.querySelector('.start-date-input');
        const endDateInput = row.querySelector('.end-date-input');
        const durationCell = row.querySelector('.duration-cell');
        const durationDisplay = row.querySelector('.duration-display');

        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
            
            if (endDate >= startDate) {
                const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= 60 && diffDays >= 0) {
                    count++;
                }
            }
        } else if (durationCell && durationCell.classList.contains('warning')) {
            // Fallback: use existing warning class
            count++;
        } else if (durationDisplay && durationDisplay.textContent.includes('days')) {
            const match = durationDisplay.textContent.match(/(\d+)\s*days/);
            if (match) {
                const days = parseInt(match[1], 10);
                if (days <= 60) count++;
            }
        }
    });

    return count;
}

// Check all rows on page load for duration warnings
function checkAllDurations(showNotifications = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const startDateInput = row.querySelector('.start-date-input');
        const endDateInput = row.querySelector('.end-date-input');
        const durationDisplay = row.querySelector('.duration-display');

        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation

            if (endDate >= startDate) {
                const diffTime = endDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 60 && diffDays >= 0 && durationDisplay && showNotifications) {
                    // Show notification for this row only if showNotifications is true
                    showDurationNotification(row, diffDays);
                }
            }
        }
    });
    // Update badge after scanning
    updateNotificationCount();
}

// Validate file size (max 10MB)
function validateFileSize(input) {
    const file = input.files[0];
    const fileNameSpan = input.parentElement.querySelector('.file-name');

    if (file) {
        const fileSizeMB = file.size / (1024 * 1024);

        if (fileSizeMB > 10) {
            alert('File size exceeds 10MB. Please select a smaller file.');
            input.value = '';
            fileNameSpan.textContent = '';
            return false;
        } else {
            fileNameSpan.textContent = file.name;
            fileNameSpan.style.color = '#00d4ff';
            fileNameSpan.style.fontSize = '12px';
            return true;
        }
    }
    return false;
}

// Update contractor cell to show hyperlink when file is attached
function updateContractorHyperlink(row) {
    const contractorInput = row.querySelector('.contractor-input');
    const contractorLink = row.querySelector('.contractor-link');
    const attachmentInput = row.querySelector('.attachment-input');
    const file = attachmentInput?.files[0];

    if (!contractorInput || !contractorLink) return;

    // Get contractor name from input (input is always visible now)
    let contractorName = contractorInput.value.trim();

    // Check if file changed - if so, clean up old URL
    const currentFileName = contractorLink.dataset.fileName;
    if (currentFileName && file && file.name !== currentFileName) {
        if (contractorLink.dataset.objectUrl) {
            URL.revokeObjectURL(contractorLink.dataset.objectUrl);
            delete contractorLink.dataset.objectUrl;
        }
    }

    if (file) {
        // Get or create object URL for the file
        let fileUrl = contractorLink.dataset.objectUrl;
        if (!fileUrl) {
            fileUrl = URL.createObjectURL(file);
            contractorLink.dataset.objectUrl = fileUrl;
            contractorLink.dataset.fileName = file.name;
        }

        contractorLink.href = '#';
        contractorLink.textContent = contractorName || contractorLink.textContent || 'Contractor';
        contractorLink.style.display = contractorName ? 'block' : 'none';
        contractorLink.style.color = '#00d4ff';
        contractorLink.style.textDecoration = 'underline';
        contractorLink.style.cursor = 'pointer';
        contractorLink.style.marginTop = '5px';
        contractorLink.style.fontSize = '12px';
        contractorLink.style.textAlign = 'center';

        // Remove existing click listener if any
        contractorLink.replaceWith(contractorLink.cloneNode(true));
        const newLink = row.querySelector('.contractor-link');

        // Add click handler to open file visually
        newLink.addEventListener('click', function (e) {
            e.preventDefault();
            const currentFileUrl = newLink.dataset.objectUrl;
            if (currentFileUrl) {
                openFileVisually(currentFileUrl, newLink.dataset.fileName, file.type);
            }
        });

        // Always sync link text with input value
        newLink.textContent = contractorName || newLink.textContent || 'Contractor';
        newLink.style.display = contractorName ? 'block' : 'none';

        // Keep input visible
        contractorInput.style.display = '';
    } else {
        contractorLink.style.display = 'none';
        contractorLink.removeAttribute('href');
    }
}

// Convert file to base64 string
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convert base64 string back to file
function base64ToFile(base64String, fileName) {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
}

// Open file visually in browser (not download)
function openFileVisually(fileUrl, fileName, fileType) {
    // Check if file type can be displayed inline
    const displayableTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'text/plain', 'text/html', 'text/css', 'text/javascript',
        'application/json', 'application/xml'
    ];

    const isDisplayable = displayableTypes.some(type => fileType && fileType.includes(type.split('/')[1])) ||
        displayableTypes.includes(fileType);

    if (isDisplayable) {
        // Open in new window/tab for inline viewing
        const newWindow = window.open(fileUrl, '_blank');
        if (!newWindow) {
            alert('Please allow pop-ups to view the file.');
        }
    } else {
        // For other file types, try to open in new window
        const newWindow = window.open(fileUrl, '_blank');
        if (!newWindow) {
            alert('Please allow pop-ups to view the file.');
        }
    }
}

// Renumber serial numbers to be sequential
function renumberSerialNumbers() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        const snoInput = row.querySelector('.sno-input');
        if (snoInput) {
            snoInput.value = index + 1;
        }
    });
    
    updateTotalCount();
    saveDataToStorage();
}

// Delete row
function deleteRow(button) {
    if (confirm('Are you sure you want to delete this row?')) {
        const row = button.closest('tr');
        row.remove();
        renumberSerialNumbers(); // Renumber all serial numbers after deletion
        saveState(); // Save state for undo/redo
    }
}

// Save data
async function saveData() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    savedData = [];

    rows.forEach((row, index) => {
        const sno = row.querySelector('.sno-input')?.value || '';
        const efile = row.querySelector('.efile-input')?.value || '';
        let contractor = '';
        const contractorInput = row.querySelector('.contractor-input');
        const contractorLink = row.querySelector('.contractor-link');

        if (contractorInput) {
            contractor = contractorInput.value || '';
        } else if (contractorLink) {
            contractor = contractorLink.textContent || '';
        }

        const description = row.querySelector('.description-input')?.value || '';
        const gst = row.querySelector('.gst-select')?.value || '';
        const value = row.querySelector('.value-input')?.value || '';
        const startDate = row.querySelector('.start-date-input')?.value || '';
        const endDate = row.querySelector('.end-date-input')?.value || '';
        const attachmentInput = row.querySelector('.attachment-input');
        const file = attachmentInput?.files[0];
        
        // DEBUG: Log data collection
        console.log(`Save Row ${index}: Value="${value}", GST="${gst}", Description="${description}"`);

        // Update contractor hyperlink if needed
        updateContractorHyperlink(row);

        // Store data
        const rowData = {
            sno,
            efile,
            contractor,
            description,
            value,  // Value before GST to match backend
            gst,    // GST after Value to match backend
            startDate,
            endDate,
            duration: row.querySelector('.duration-display')?.textContent || '-',
            fileName: file ? file.name : '',
            fileSize: file ? file.size : 0
        };

        savedData.push(rowData);
    });

    // Save to API or localStorage
    try {
        await saveDataToStorage();
        alert('Data saved successfully!');
    } catch (error) {
        alert('Error saving data. Please try again.');
        console.error('Save error:', error);
    }
}

// Save data to API (with localStorage fallback)
async function saveDataToStorage() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    const dataToSave = [];

    for (const row of rows) {
        const sno = row.querySelector('.sno-input')?.value || '';
        const efile = row.querySelector('.efile-input')?.value || '';
        const contractorInput = row.querySelector('.contractor-input');
        const contractorLink = row.querySelector('.contractor-link');
        const contractor = contractorInput && contractorInput.style.display !== 'none'
            ? contractorInput.value
            : (contractorLink?.textContent || '');
        const description = row.querySelector('.description-input')?.value || '';
        const gst = row.querySelector('.gst-select')?.value || '';
        const value = row.querySelector('.value-input')?.value || '';
        const startDate = row.querySelector('.start-date-input')?.value || '';
        const endDate = row.querySelector('.end-date-input')?.value || '';
        const duration = row.querySelector('.duration-display')?.textContent || '-';
        const attachmentInput = row.querySelector('.attachment-input');
        const file = attachmentInput?.files[0];

        let fileBase64 = '';
        let fileName = '';
        let fileType = '';

        if (file) {
            fileName = file.name;
            fileType = file.type;
            try {
                fileBase64 = await fileToBase64(file);
            } catch (error) {
                console.error('Error converting file to base64:', error);
            }
        }

        dataToSave.push({
            sno,
            efile,
            contractor,
            description,
            value,      // Value before GST to match backend
            gst,        // GST after Value to match backend
            startDate,
            endDate,
            duration,
            fileName,
            fileBase64,
            fileType
        });
    }

    // Try to save to API, fallback to localStorage
    try {
        if (typeof contractorListAPI !== 'undefined') {
            await contractorListAPI.save(dataToSave);
            console.log('Data saved to API successfully');
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            console.log('Data saved to localStorage (API not available)');
        }
    } catch (error) {
        console.error('Failed to save to API, using localStorage:', error);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
    
    // Sync data across pages using localStorage
    localStorage.setItem('crossPageDataSync', JSON.stringify(dataToSave));
    
    // Trigger storage event for other pages
    window.dispatchEvent(new CustomEvent('dataSync', { detail: dataToSave }));
}

// Load synced data from other pages
function loadSyncedData(syncData) {
    try {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        syncData.forEach((rowData, index) => {
            const row = document.createElement('tr');
            const snoValue = rowData.sno || (index + 1);
            rowCounter = Math.max(rowCounter, parseInt(snoValue) || index + 1);
            
            // Create row HTML with synced data
            row.innerHTML = `
                <td>
                    <div class="sno-cell">
                        <input type="checkbox" class="sno-checkbox" data-row="${snoValue}">
                        <input type="text" class="sno-input" value="${snoValue}" readonly>
                    </div>
                </td>
                <td><input type="text" class="efile-input" value="${rowData.efile || ''}"></td>
                <td><input type="text" class="contractor-input" value="${rowData.contractor || ''}"></td>
                <td><input type="text" class="description-input" value="${rowData.description || ''}"></td>
                <td><input type="text" class="value-input" value="${rowData.value || ''}"></td>
                <td>
                    <select class="gst-select">
                        <option value="">Select GST</option>
                        <option value="0%" ${rowData.gst === '0%' ? 'selected' : ''}>0%</option>
                        <option value="5%" ${rowData.gst === '5%' ? 'selected' : ''}>5%</option>
                        <option value="12%" ${rowData.gst === '12%' ? 'selected' : ''}>12%</option>
                        <option value="18%" ${rowData.gst === '18%' ? 'selected' : ''}>18%</option>
                        <option value="28%" ${rowData.gst === '28%' ? 'selected' : ''}>28%</option>
                        <option value="with gst" ${rowData.gst === 'with gst' ? 'selected' : ''}>With GST</option>
                        <option value="without gst" ${rowData.gst === 'without gst' ? 'selected' : ''}>Without GST</option>
                    </select>
                </td>
                <td><input type="date" class="start-date-input" value="${rowData.startDate || ''}"></td>
                <td><input type="date" class="end-date-input" value="${rowData.endDate || ''}"></td>
                <td><span class="duration-display">${rowData.duration || '-'}</span></td>
                <td>
                    <input type="file" class="attachment-input" id="attachment-${rowCounter}" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display: none;">
                    <button type="button" class="attachment-btn" onclick="document.getElementById('attachment-${rowCounter}').click()">
                        <i class="fas fa-paperclip"></i>
                        <span class="btn-text">Attach</span>
                    </button>
                    <span class="file-name">No file selected</span>
                </td>
                <td><button class="delete-btn" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>
            `;
            
            tbody.appendChild(row);
            
            // Setup event listeners for the new row
            setupRowEventListeners(row);
            
            // Calculate duration if dates are available
            if (rowData.startDate && rowData.endDate) {
                calculateDuration({ target: row.querySelector('.end-date-input') });
            }
        });
        
        updateTotalCount();
        console.log('Synced data loaded successfully');
    } catch (error) {
        console.error('Error loading synced data:', error);
    }
}

// Setup event listeners for a row
function setupRowEventListeners(row) {
    // Setup contractor input listener
    const contractorInput = row.querySelector('.contractor-input');
    contractorInput.addEventListener('input', function () {
        updateContractorHyperlink(row);
        saveState();
    });
    
    // Add input listeners for undo/redo
    const inputs = row.querySelectorAll('input[type="text"], input[type="date"], select');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            saveState();
        });
        input.addEventListener('change', function() {
            saveState();
        });
    });
}

// Load data from API (with localStorage fallback)
async function loadData() {
    let data = [];

    // Try to load from API first
    try {
        if (typeof contractorListAPI !== 'undefined') {
            data = await contractorListAPI.load();
            console.log('Data loaded from API successfully');
        } else {
            // Fallback to localStorage if API is not available
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                data = JSON.parse(savedData);
                console.log('Data loaded from localStorage (API not available)');
            }
        }
    } catch (error) {
        console.error('Failed to load from API, trying localStorage:', error);
        // Fallback to localStorage
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                data = JSON.parse(savedData);
                console.log('Data loaded from localStorage fallback');
            } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
            }
        }
    }

    if (data && data.length > 0) {
        try {
            const tbody = document.getElementById('tableBody');
            // Only proceed if tableBody exists (not on contract-renewal page)
            if (tbody) {
                tbody.innerHTML = '';

                data.forEach((rowData, index) => {
                    const row = document.createElement('tr');
                    // Map database field names to frontend field names
                const snoValue = rowData.sno || rowData.SNO || (index + 1);
                rowCounter = Math.max(rowCounter, parseInt(snoValue) || index + 1);

                // Extract days from duration string for color coding
                let isWarning = false;
                const duration = rowData.duration || rowData.DURATION || '';
                if (duration && duration.includes('days')) {
                    const daysMatch = duration.match(/(\d+)\s*days/);
                    if (daysMatch) {
                        const days = parseInt(daysMatch[1]);
                        isWarning = days <= 60;
                    }
                }

                // Create contractor cell with both input and link
                const contractorValue = rowData.contractor || rowData.CONTRACTOR || '';
                const loadedFileName = rowData.fileName || rowData.file_name || rowData.FILE_NAME || '';
                const fileBase64 = rowData.fileBase64 || rowData.file_base64 || rowData.FILE_BASE64 || '';
                const hasFile = loadedFileName && fileBase64;

                row.innerHTML = `
                    <td>
                        <div class="sno-cell">
                            <input type="checkbox" class="sno-checkbox" data-row="${snoValue}">
                            <input type="text" class="sno-input" value="${snoValue}" readonly>
                        </div>
                    </td>
                    <td>
                        <input type="text" class="efile-input" placeholder="Enter E-File" value="${rowData.efile || rowData.EFILE || ''}">
                    </td>
                    <td>
                        <input type="text" class="contractor-input" placeholder="Enter Contractor" value="${contractorValue}">
                        <a href="#" class="contractor-link" ${hasFile ? 'style="display: block; color: #00d4ff; text-decoration: underline; cursor: pointer; margin-top: 5px; font-size: 12px; text-align: center;"' : 'style="display: none;"'}">${contractorValue}</a>
                    </td>
                    <td>
                        <input type="text" class="description-input" placeholder="Enter Description" value="${rowData.description || rowData.DESCRIPTION || ''}">
                    </td>
                    <td>
                        <input type="text" class="value-input" placeholder="Enter Value" value="${rowData.value || rowData.VALUE || ''}">
                    </td>
                    <td>
                        <select class="gst-select">
                            <option value="">Select GST</option>
                            <option value="0%" ${rowData.gst === '0%' ? 'selected' : ''}>0%</option>
                            <option value="5%" ${rowData.gst === '5%' ? 'selected' : ''}>5%</option>
                            <option value="12%" ${rowData.gst === '12%' ? 'selected' : ''}>12%</option>
                            <option value="18%" ${rowData.gst === '18%' ? 'selected' : ''}>18%</option>
                            <option value="28%" ${rowData.gst === '28%' ? 'selected' : ''}>28%</option>
                            <option value="with gst" ${rowData.gst === 'with gst' ? 'selected' : ''}>With GST</option>
                            <option value="without gst" ${rowData.gst === 'without gst' ? 'selected' : ''}>Without GST</option>
                        </select>
                    </td>
                    <td>
                        <input type="date" class="start-date-input" value="${rowData.startDate || rowData.start_date || rowData.START_DATE || ''}">
                    </td>
                    <td>
                        <input type="date" class="end-date-input" value="${rowData.endDate || rowData.end_date || rowData.END_DATE || ''}">
                    </td>
                    <td class="duration-cell">
                        <span class="duration-display ${isWarning ? 'duration-left' : 'duration-safe'}">${duration || '-'}</span>
                    </td>
                    <td>
                        <input type="file" class="attachment-input" id="attachment-${index}" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display: none;">
                        <button type="button" class="attachment-btn" onclick="document.getElementById('attachment-${index}').click()">
                            <i class="fas fa-paperclip"></i>
                            <span class="btn-text">Attach</span>
                        </button>
                        <span class="file-name" style="color: #00d4ff; font-size: 9px;">${loadedFileName || 'No file selected'}</span>
                    </td>
                    <td>
                        <button class="delete-btn" onclick="deleteRow(this)">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;

                tbody.appendChild(row);

                // Restore file if it exists
                if (hasFile && fileBase64) {
                    try {
                        const file = base64ToFile(fileBase64, loadedFileName);
                        const fileInput = row.querySelector('.attachment-input');
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;

                        // Update contractor link
                        const contractorLink = row.querySelector('.contractor-link');
                        const fileUrl = URL.createObjectURL(file);
                        contractorLink.href = '#';
                        contractorLink.dataset.objectUrl = fileUrl;
                        contractorLink.dataset.fileName = file.name;

                        // Remove existing click listener if any
                        contractorLink.replaceWith(contractorLink.cloneNode(true));
                        const newLink = row.querySelector('.contractor-link');

                        // Add click handler to open file visually
                        newLink.addEventListener('click', function (e) {
                            e.preventDefault();
                            openFileVisually(fileUrl, file.name, file.type);
                        });
                    } catch (error) {
                        console.error('Error restoring file:', error);
                    }
                }

                // Add event listeners
                const startDateInput = row.querySelector('.start-date-input');
                const endDateInput = row.querySelector('.end-date-input');

                if (startDateInput && endDateInput) {
                    startDateInput.addEventListener('change', calculateDuration);
                    endDateInput.addEventListener('change', calculateDuration);
                }

                const fileInput = row.querySelector('.attachment-input');
                const attachmentBtn = row.querySelector('.attachment-btn');
                const attachmentFileName = row.querySelector('.file-name');
                const contractorInput = row.querySelector('.contractor-input');

                if (fileInput && attachmentBtn && attachmentFileName) {
                    fileInput.addEventListener('change', function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Update UI
                            attachmentBtn.style.background = 'rgba(46, 204, 113, 0.1)';
                            attachmentBtn.style.borderColor = '#2ecc71';
                            attachmentBtn.style.color = '#2ecc71';
                            attachmentFileName.textContent = file.name;
                            attachmentFileName.style.color = '#2ecc71';
                        } else {
                            // Reset UI
                            attachmentBtn.style.background = 'rgba(74, 144, 226, 0.1)';
                            attachmentBtn.style.borderColor = '#4a90e2';
                            attachmentBtn.style.color = '#4a90e2';
                            attachmentFileName.textContent = 'No file selected';
                            attachmentFileName.style.color = '#00d4ff';
                        }
                        
                        validateFileSize(e.target);
                        updateContractorHyperlink(row);
                    });
                }

                if (contractorInput) {
                    contractorInput.addEventListener('input', function () {
                        updateContractorHyperlink(row);
                    });
                }
            });

            updateTotalCount();
            renumberSerialNumbers(); // Ensure serial numbers are sequential after loading
            saveState(); // Initialize history with loaded data

            // Check for duration warnings after loading
            setTimeout(() => {
                checkAllDurations();
            }, 300);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
}

// Refresh page (data persists due to localStorage)
function refreshPage() {
    // Clear search and reload
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    location.reload();
}

// Print table
function printTable() {
    // Create a new window with formatted table
    const tbody = document.getElementById('tableBody');
    
    // Only proceed if tableBody exists (not on contract-renewal page)
    if (!tbody) {
        alert('No table data to print!');
        return;
    }
    
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        alert('No data to print!');
        return;
    }

    const printWindow = window.open('', '_blank');
    let tableHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Contractor List - Print</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #333;
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background-color: #7b2cbf;
                    color: white;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                .warning {
                    color: #ff0000;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <h1>Contractor List</h1>
            <table>
                <thead>
                    <tr>
                        <th>S.NO</th>
                        <th>E-FILE</th>
                        <th>CONTRACTOR</th>
                        <th>DESCRIPTION</th>
                        <th>GST</th>
                        <th>VALUE</th>
                        <th>START DATE</th>
                        <th>END DATE</th>
                        <th>DURATION (DAYS)</th>
                        <th>ATTACHMENT</th>
                    </tr>
                </thead>
                <tbody>
    `;

    rows.forEach(row => {
        const sno = row.querySelector('.sno-input')?.value || '';
        const efile = row.querySelector('.efile-input')?.value || '';
        const contractorInput = row.querySelector('.contractor-input');
        const contractorLink = row.querySelector('.contractor-link');
        const contractor = contractorInput ? contractorInput.value : (contractorLink ? contractorLink.textContent : '');
        const description = row.querySelector('.description-input')?.value || '';
        const gst = row.querySelector('.gst-select')?.value || '';
        const value = row.querySelector('.value-input')?.value || '';
        const startDate = row.querySelector('.start-date-input')?.value || '';
        const endDate = row.querySelector('.end-date-input')?.value || '';
        const duration = row.querySelector('.duration-display')?.textContent || '-';
        const fileName = row.querySelector('.file-name')?.textContent.trim() || '';
        const isWarning = row.querySelector('.duration-cell')?.classList.contains('warning');

        tableHTML += `
            <tr>
                <td>${sno}</td>
                <td>${efile}</td>
                <td>${contractor}</td>
                <td>${description}</td>
                <td>${gst}</td>
                <td>${value}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td class="${isWarning ? 'warning' : ''}">${duration}</td>
                <td>${fileName}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Export to Excel
function exportToExcel() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        alert('No data to export!');
        return;
    }

    // Prepare data for export
    const exportData = [];

    // Add headers
    exportData.push([
        'S.NO',
        'E-File',
        'Contractor',
        'Description',
        'Value',
        'GST',
        'Start Date',
        'End Date',
        'Duration (Days)',
        'Attachment File Name'
    ]);

    // Add rows
    rows.forEach(row => {
        const sno = row.querySelector('.sno-input')?.value || '';
        const efile = row.querySelector('.efile-input')?.value || '';
        const contractorInput = row.querySelector('.contractor-input');
        const contractorLink = row.querySelector('.contractor-link');
        const contractor = contractorInput ? contractorInput.value : (contractorLink ? contractorLink.textContent.trim() : '');
        const description = row.querySelector('.description-input')?.value || '';
        const gst = row.querySelector('.gst-select')?.value || '';
        const value = row.querySelector('.value-input')?.value || '';
        const startDate = row.querySelector('.start-date-input')?.value || '';
        const endDate = row.querySelector('.end-date-input')?.value || '';
        const duration = row.querySelector('.duration-display')?.textContent || '-';
        const fileName = row.querySelector('.file-name')?.textContent.trim() || '';

        exportData.push([
            sno,
            efile,
            contractor,
            description,
            value,
            gst,
            startDate,
            endDate,
            duration,
            fileName
        ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
        { wch: 10 }, // S.NO
        { wch: 20 }, // E-File
        { wch: 25 }, // Contractor
        { wch: 30 }, // Description
        { wch: 15 }, // GST
        { wch: 15 }, // Value
        { wch: 15 }, // Start Date
        { wch: 15 }, // End Date
        { wch: 20 }, // Duration
        { wch: 30 }  // Attachment
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Data Table');

    // Generate filename with timestamp
    const filename = `dashboard_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
}

// Update total count
function updateTotalCount() {
    const tbody = document.getElementById('tableBody');
    const totalBadge = document.getElementById('totalBadge');
    
    // Only proceed if both elements exist (for pages that have tables)
    if (tbody && totalBadge) {
        const rowCount = tbody.querySelectorAll('tr').length;
        totalBadge.textContent = `Total: ${rowCount}`;
    }
}


// Update addRow function to include checkbox in S.NO column
function addRowWithCheckbox() {
    const tbody = document.getElementById('tableBody');
    const row = document.createElement('tr');
    const nextSerialNumber = tbody.querySelectorAll('tr').length + 1;
    
    row.innerHTML = `
        <td>
            <div class="sno-cell">
                <input type="checkbox" class="sno-checkbox" data-row="${nextSerialNumber}">
                <input type="text" class="sno-input" value="${nextSerialNumber}" readonly>
            </div>
        </td>
        <td>
            <input type="text" class="efile-input" placeholder="Enter E-File">
        </td>
        <td>
            <input type="text" class="contractor-input" placeholder="Enter Contractor">
            <a href="#" class="contractor-link" style="display: none;" target="_blank"></a>
        </td>
        <td>
            <input type="text" class="description-input" placeholder="Enter Description">
        </td>
        <td>
            <input type="text" class="value-input" placeholder="Enter Value">
        </td>
        <td>
            <select class="gst-select">
                <option value="">Select GST</option>
                <option value="0%">0%</option>
                <option value="5%">5%</option>
                <option value="12%">12%</option>
                <option value="18%">18%</option>
                <option value="28%">28%</option>
                <option value="with gst">With GST</option>
                <option value="without gst">Without GST</option>
            </select>
        </td>
        <td>
            <input type="date" class="start-date-input">
        </td>
        <td>
            <input type="date" class="end-date-input">
        </td>
        <td class="duration-cell">
            <span class="duration-display">-</span>
        </td>
        <td>
            <input type="file" class="attachment-input" id="attachment-${nextSerialNumber}" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display: none;">
            <button type="button" class="attachment-btn" onclick="document.getElementById('attachment-${nextSerialNumber}').click()">
                <i class="fas fa-paperclip"></i>
                <span class="btn-text">Attach File</span>
            </button>
            <span class="file-name">No file selected</span>
        </td>
        <td>
            <button class="delete-btn" onclick="deleteRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // Setup event listeners for the new row
    setupRowEventListeners(row);
    
    // Add audit entry for new row
    addAuditEntry('create', nextSerialNumber, 'New row created', getCurrentUser());
    
    updateTotalCount();
    saveState();
    return row;
}

// ============= TABLE FILTERS - CLEAN REBUILD =============

// Initialize table filters dropdown
function initializeTableFilters() {
    const filterDropdownBtn = document.getElementById('filterDropdownBtn');
    const filterDropdownMenu = document.getElementById('filterDropdownMenu');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    // Toggle dropdown
    if (filterDropdownBtn) {
        filterDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = filterDropdownMenu.classList.contains('show');
            
            // Close all other dropdowns
            document.querySelectorAll('.filter-dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            
            if (!isOpen) {
                filterDropdownMenu.classList.add('show');
                filterDropdownBtn.classList.add('active');
            } else {
                filterDropdownBtn.classList.remove('active');
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const filterDropdownMenu = document.getElementById('filterDropdownMenu');
        const filterDropdownBtn = document.getElementById('filterDropdownBtn');
        
        if (!e.target.closest('.filter-dropdown-container')) {
            if (filterDropdownMenu) { // Check if element exists
                filterDropdownMenu.classList.remove('show');
            }
            if (filterDropdownBtn) { // Check if element exists
                filterDropdownBtn.classList.remove('active');
            }
        }
    });
    
    // Apply filters button
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            applyNewFilters();
            filterDropdownMenu.classList.remove('show');
            filterDropdownBtn.classList.remove('active');
        });
    }
    
    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            clearNewFilters();
            filterDropdownMenu.classList.remove('show');
            filterDropdownBtn.classList.remove('active');
        });
    }
}

// NEW: Apply filters with clean logic - CORRECTED LOGIC
function applyNewFilters() {
    console.log('=== DEBUGGING FILTER APPLICATION ===');
    
    const selectedColumns = getSelectedColumns();
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    
    console.log('1. Selected columns:', selectedColumns);
    console.log('2. Total rows found:', rows.length);
    
    // Get column indices for selected columns
    const columnIndices = getColumnIndices(selectedColumns);
    console.log('3. Column indices:', columnIndices);
    
    let visibleRowCount = 0;
    let hiddenRowCount = 0;
    
    rows.forEach((row, index) => {
        const checkbox = row.querySelector('.sno-checkbox');
        const isChecked = checkbox && checkbox.checked;
        
        console.log(`4. Row ${index}: checkbox exists = ${!!checkbox}, checked = ${isChecked}`);
        
        // CORRECTED LOGIC: If no columns selected, show all UNCHECKED rows with all columns
        if (selectedColumns.length === 0) {
            if (!isChecked) {
                console.log(`5. Row ${index}: No columns selected, row UNCHECKED - showing all`);
                showAllRowCells(row);
                row.style.display = '';
                visibleRowCount++;
            } else {
                console.log(`6. Row ${index}: No columns selected, row CHECKED - hiding`);
                row.style.display = 'none';
                hiddenRowCount++;
            }
            return;
        }
        
        // CORRECTED LOGIC: If columns selected, show only UNCHECKED rows with selected columns
        if (!isChecked) {
            console.log(`7. Row ${index}: Columns selected, row UNCHECKED - showing selected columns`);
            row.style.display = '';
            hideAllRowCells(row);
            showSelectedRowCells(row, columnIndices);
            visibleRowCount++;
        } else {
            console.log(`8. Row ${index}: Columns selected, row CHECKED - hiding`);
            row.style.display = 'none';
            hiddenRowCount++;
        }
    });
    
    // Show/hide table headers based on selected columns
    updateTableHeaders(selectedColumns);
    
    console.log('9. Final counts - Visible:', visibleRowCount, 'Hidden:', hiddenRowCount);
    console.log('=== DEBUGGING COMPLETE ===');
    
    // Update status
    updateFilterStatus(selectedColumns.length > 0);
}

// NEW: Clear all filters
function clearNewFilters() {
    // Uncheck all filter checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Show all rows and all cells
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        showAllRowCells(row);
        row.style.display = '';
    });
    
    // Show all headers
    updateTableHeaders([]);
    
    updateFilterStatus(false);
    showNotification('All filters cleared', 'info');
}

// Show/hide table headers based on selected columns
function updateTableHeaders(selectedColumns) {
    const table = document.querySelector('.data-table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    const columnMap = {
        'sno': 0,
        'efile': 1, 
        'contractor': 2,
        'description': 3,
        'value': 4,
        'gst': 5,
        'startDate': 6,
        'endDate': 7,
        'duration': 8,
        'attachment': 9,
        'action': 10
    };
    
    // If no columns selected, show all headers
    if (selectedColumns.length === 0) {
        headers.forEach(header => {
            header.style.display = '';
        });
        return;
    }
    
    // Hide all headers first
    headers.forEach(header => {
        header.style.display = 'none';
    });
    
    // Show only selected column headers
    selectedColumns.forEach(columnName => {
        const index = columnMap[columnName];
        if (index !== undefined && headers[index]) {
            headers[index].style.display = '';
        }
    });
    
    // Always show S.NO and ACTION columns for usability
    if (headers[0]) headers[0].style.display = ''; // S.NO
    if (headers[10]) headers[10].style.display = ''; // ACTION
}

// Helper: Get selected column names
function getSelectedColumns() {
    const selectedColumns = [];
    const allFilterCheckboxes = document.querySelectorAll('.filter-checkbox');
    
    console.log('   getSelectedColumns: Total filter checkboxes found:', allFilterCheckboxes.length);
    
    allFilterCheckboxes.forEach((checkbox, index) => {
        console.log(`   Filter ${index}: ${checkbox.dataset.column} = ${checkbox.checked}`);
        if (checkbox.checked) {
            selectedColumns.push(checkbox.dataset.column);
        }
    });
    
    console.log('   getSelectedColumns: Returning:', selectedColumns);
    return selectedColumns;
}

// Helper: Get column indices (0-based)
function getColumnIndices(columnNames) {
    const columnMap = {
        'sno': 0,
        'efile': 1, 
        'contractor': 2,
        'description': 3,
        'value': 4,
        'gst': 5,
        'startDate': 6,
        'endDate': 7,
        'duration': 8,
        'attachment': 9,
        'action': 10
    };
    
    return columnNames.map(name => columnMap[name]).filter(index => index !== undefined);
}

// Helper: Show all cells in a row
function showAllRowCells(row) {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
        cell.style.display = '';
    });
}

// Helper: Hide all cells in a row
function hideAllRowCells(row) {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
        cell.style.display = 'none';
    });
}

// Helper: Show selected cells in a row
function showSelectedRowCells(row, columnIndices) {
    const cells = row.querySelectorAll('td');
    console.log(`   showSelectedRowCells: Total cells = ${cells.length}, indices to show = ${columnIndices}`);
    
    // Always show S.NO (index 0) and ACTION (index 10) columns
    if (cells[0]) cells[0].style.display = ''; // S.NO
    if (cells[10]) cells[10].style.display = ''; // ACTION
    
    // Show selected columns
    columnIndices.forEach(index => {
        if (cells[index]) {
            cells[index].style.display = '';
            console.log(`   Showing cell ${index}: ${cells[index].textContent.substring(0, 20)}`);
        } else {
            console.log(`   ERROR: Cell ${index} does not exist!`);
        }
    });
}

// OLD FUNCTIONS REMOVED - CLEAN REBUILD COMPLETE

// Test function to verify filtering works
function testFiltering() {
    // Test 1: Check if we can find rows and checkboxes
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    const checkboxes = tbody.querySelectorAll('.sno-checkbox');
    
    console.log('Found rows:', rows.length);
    console.log('Found checkboxes:', checkboxes.length);
    
    // Test 2: Check checkbox states
    checkboxes.forEach((checkbox, index) => {
        console.log(`Checkbox ${index}: checked = ${checkbox.checked}`);
    });
    
    // Test 3: Check filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    console.log('Found filter checkboxes:', filterCheckboxes.length);
    
    filterCheckboxes.forEach((checkbox, index) => {
        console.log(`Filter ${index}: ${checkbox.dataset.column} = ${checkbox.checked}`);
    });
    
    console.log('=== TESTING COMPLETE ===');
}

// Make test function available globally for debugging
window.testFiltering = testFiltering;

// Update filter status UI
function updateFilterStatus(isFiltered) {
    const filterBtn = document.getElementById('filterDropdownBtn');
    const totalBadge = document.getElementById('totalBadge');
    
    // Only proceed if elements exist
    if (filterBtn) {
        if (isFiltered) {
            filterBtn.classList.add('active');
        } else {
            filterBtn.classList.remove('active');
        }
    }
    
    updateTotalCount();
}

// Show notification (helper function)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `filter-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #6e8efb, #a777e3)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const animationStyles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Import Excel using new backend API
async function importFromExcel() {
    try {
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Show loading indicator
            showLoadingIndicator('Processing Excel file...');
            
            try {
                // Determine current page type
                const pageType = getCurrentPageType();
                
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('page_type', pageType);
                
                // Upload to backend for processing
                const response = await fetch('/api/excel-upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Upload failed');
                }
                
                if (result.success) {
                    console.log('Excel processed successfully:', result);
                    console.log('Columns found:', result.columns);
                    console.log('Rows processed:', result.row_count);
                    
                    // Import processed data to table
                    await importProcessedData(result.data, pageType);
                    
                    hideLoadingIndicator();
                    alert(`Excel file imported successfully!\nColumns: ${result.columns.join(', ')}\nRows: ${result.row_count}`);
                } else {
                    throw new Error('Processing failed');
                }
                
            } catch (error) {
                console.error('Error importing Excel:', error);
                hideLoadingIndicator();
                alert(`Error importing Excel file: ${error.message}`);
            }
            
            // Clean up
            document.body.removeChild(fileInput);
        });
        
        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        
    } catch (error) {
        console.error('Error setting up Excel import:', error);
        alert('Error setting up Excel import');
    }
}

// Determine current page type
function getCurrentPageType() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    
    if (filename === 'index' || filename === '') {
        return 'contractor_list';
    } else if (filename === 'bill-tracker') {
        return 'bill_tracker';
    } else if (filename === 'epbg') {
        return 'epbg';
    }
    
    return 'contractor_list'; // Default
}

// Import processed data into table
async function importProcessedData(processedData, pageType) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        throw new Error('Table not found');
    }
    
    // Clear existing data
    tbody.innerHTML = '';
    
    // Add rows based on page type
    for (const rowData of processedData) {
        if (pageType === 'contractor_list') {
            addContractorRow(rowData);
        } else if (pageType === 'bill_tracker') {
            addBillTrackerRow(rowData);
        } else if (pageType === 'epbg') {
            addEPBGRow(rowData);
        }
    }
    
    updateTotalCount();
    saveState();
}

// Add contractor row from processed data
function addContractorRow(data) {
    const tbody = document.getElementById('tableBody');
    const row = document.createElement('tr');
    
    // Get next serial number
    const currentRows = tbody.querySelectorAll('tr');
    const nextSerialNumber = currentRows.length + 1;
    
    row.innerHTML = `
        <td>
            <div class="sno-cell">
                <input type="checkbox" class="sno-checkbox" data-row="${data.sno || nextSerialNumber}">
                <input type="text" class="sno-input" value="${data.sno || nextSerialNumber}" readonly>
            </div>
        </td>
        <td>
            <input type="text" class="efile-input" value="${data.efile || ''}">
        </td>
        <td>
            <input type="text" class="contractor-input" value="${data.contractor || ''}">
            <a href="#" class="contractor-link" style="display: none;" target="_blank"></a>
        </td>
        <td>
            <input type="text" class="description-input" value="${data.description || ''}">
        </td>
        <td>
            <input type="text" class="value-input" value="${data.value || ''}">
        </td>
        <td>
            <select class="gst-select">
                <option value="">Select GST</option>
                <option value="0%" ${data.gst === '0%' ? 'selected' : ''}>0%</option>
                <option value="5%" ${data.gst === '5%' ? 'selected' : ''}>5%</option>
                <option value="12%" ${data.gst === '12%' ? 'selected' : ''}>12%</option>
                <option value="18%" ${data.gst === '18%' ? 'selected' : ''}>18%</option>
                <option value="28%" ${data.gst === '28%' ? 'selected' : ''}>28%</option>
                <option value="with gst" ${data.gst === 'with gst' ? 'selected' : ''}>With GST</option>
                <option value="without gst" ${data.gst === 'without gst' ? 'selected' : ''}>Without GST</option>
            </select>
        </td>
        <td>
            <input type="date" class="start-date-input" value="${data.startDate || ''}">
        </td>
        <td>
            <input type="date" class="end-date-input" value="${data.endDate || ''}">
        </td>
        <td><span class="duration-display">${data.duration || '-'}</span></td>
        <td>
            <input type="file" class="attachment-input" id="attachment-${nextSerialNumber}" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display: none;">
            <button type="button" class="attachment-btn" onclick="document.getElementById('attachment-${nextSerialNumber}').click()">
                <i class="fas fa-paperclip"></i>
                <span class="btn-text">Attach File</span>
            </button>
            <span class="file-name">No file selected</span>
        </td>
        <td><button class="delete-btn" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    
    tbody.appendChild(row);
    
    // Setup event listeners
    setupRowEventListeners(row);
    
    // Calculate duration if dates are available
    if (data.startDate && data.endDate) {
        calculateDuration({ target: row.querySelector('.end-date-input') });
    }
}

// Add bill tracker row from processed data
function addBillTrackerRow(data) {
    // Implementation for bill tracker page
    console.log('Adding bill tracker row:', data);
    // TODO: Implement based on bill tracker table structure
}

// Add EPBG row from processed data
function addEPBGRow(data) {
    // Implementation for EPBG page
    console.log('Adding EPBG row:', data);
    // TODO: Implement based on EPBG table structure
}

// Loading indicator functions
function showLoadingIndicator(message) {
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
    `;
    
    document.body.appendChild(indicator);
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        document.body.removeChild(indicator);
    }
}

// Format date from Excel to HTML input format
function formatDate(dateValue) {
    if (!dateValue) return '';
    // ... (rest of the code remains the same)
    
    // Handle Excel date numbers
    if (typeof dateValue === 'number') {
        const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
        return excelDate.toISOString().split('T')[0];
    }
    
    // Handle date strings
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
}

// Filter table based on search query
function filterTable(searchQuery) {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    const query = searchQuery.toLowerCase().trim();
    let visibleCount = 0;

    if (query === '') {
        // Show all rows if search is empty
        rows.forEach(row => {
            row.style.display = '';
        });
        updateTotalCount();
        // Remove "no results" message if exists
        const noResultsMsg = tbody.querySelector('.no-results-row');
        if (noResultsMsg) {
            noResultsMsg.remove();
        }
        return;
    }

    rows.forEach(row => {
        // Skip the no-results row
        if (row.classList.contains('no-results-row')) {
            return;
        }

        // Get all text content from the row
        const sno = row.querySelector('.sno-input')?.value.toLowerCase() || '';
        const efile = row.querySelector('.efile-input')?.value.toLowerCase() || '';
        const contractorInput = row.querySelector('.contractor-input');
        const contractorLink = row.querySelector('.contractor-link');
        const contractor = (contractorInput ? contractorInput.value : (contractorLink ? contractorLink.textContent : '')).toLowerCase();
        const description = row.querySelector('.description-input')?.value.toLowerCase() || '';
        const gst = row.querySelector('.gst-select')?.value.toLowerCase() || '';
        const value = row.querySelector('.value-input')?.value.toLowerCase() || '';
        const startDate = row.querySelector('.start-date-input')?.value.toLowerCase() || '';
        const endDate = row.querySelector('.end-date-input')?.value.toLowerCase() || '';
        const duration = row.querySelector('.duration-display')?.textContent.toLowerCase() || '';

        // Check if any field matches the search query
        const matches = sno.includes(query) ||
            efile.includes(query) ||
            contractor.includes(query) ||
            description.includes(query) ||
            gst.includes(query) ||
            value.includes(query) ||
            startDate.includes(query) ||
            endDate.includes(query) ||
            duration.includes(query);

        if (matches) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Remove existing "no results" message
    const existingNoResults = tbody.querySelector('.no-results-row');
    if (existingNoResults) {
        existingNoResults.remove();
    }

    // Show "no results" message if no rows are visible
    if (visibleCount === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.className = 'no-results-row';
        noResultsRow.innerHTML = `
            <td colspan="11" style="text-align: center; padding: 40px; font-size: 18px; color: rgba(255, 255, 255, 0.6);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                No results found
            </td>
        `;
        tbody.appendChild(noResultsRow);
    }

    // Update total count badge to show filtered count
    document.getElementById('totalBadge').textContent = `Total: ${visibleCount}`;
}

// Auto-save on input change (optional - saves to localStorage)
document.addEventListener('input', function (e) {
    if (e.target.matches('.sno-input, .efile-input, .contractor-input, .description-input, .value-input, .start-date-input, .end-date-input')) {
        // Debounce auto-save
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            saveDataToStorage();
        }, 1000);
    }
});

// Auto-save on file change
document.addEventListener('change', function (e) {
    if (e.target.matches('.attachment-input')) {
        // Debounce auto-save
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            saveDataToStorage();
        }, 1000);
    }
});

// Arrow Key Navigation Function
function setupArrowKeyNavigation() {
    document.addEventListener('keydown', function (e) {
        // Only handle arrow keys when focus is on an input/select element
        if (!['input', 'select'].includes(e.target.tagName.toLowerCase())) {
            return;
        }

        // Handle Enter key in S.NO field to add new row
        if (e.key === 'Enter' && e.target.classList.contains('sno-input')) {
            e.preventDefault();
            addRow(); // Call the addRow function
            return;
        }

        // Get all focusable elements in the table
        const focusableElements = document.querySelectorAll('.data-table input, .data-table select');
        const currentIndex = Array.from(focusableElements).indexOf(e.target);

        if (currentIndex === -1) return;

        let nextIndex = -1;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                // Move to same column in previous row
                const currentCell = e.target.closest('td');
                const currentRow = e.target.closest('tr');
                const previousRow = currentRow.previousElementSibling;
                if (previousRow && currentCell) {
                    const columnIndex = Array.from(currentRow.cells).indexOf(currentCell);
                    const targetCell = previousRow.cells[columnIndex];
                    if (targetCell) {
                        const targetInput = targetCell.querySelector('input, select');
                        if (targetInput) {
                            targetInput.focus();
                            if (targetInput.select) targetInput.select();
                        }
                    }
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                // Move to same column in next row
                const currentCellDown = e.target.closest('td');
                const currentRowDown = e.target.closest('tr');
                const nextRow = currentRowDown.nextElementSibling;
                if (nextRow && currentCellDown) {
                    const columnIndex = Array.from(currentRowDown.cells).indexOf(currentCellDown);
                    const targetCell = nextRow.cells[columnIndex];
                    if (targetCell) {
                        const targetInput = targetCell.querySelector('input, select');
                        if (targetInput) {
                            targetInput.focus();
                            if (targetInput.select) targetInput.select();
                        }
                    }
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                // Move to previous focusable element
                if (currentIndex > 0) {
                    nextIndex = currentIndex - 1;
                    focusableElements[nextIndex].focus();
                    if (focusableElements[nextIndex].select) focusableElements[nextIndex].select();
                }
                break;

            case 'ArrowRight':
                e.preventDefault();
                // Move to next focusable element
                if (currentIndex < focusableElements.length - 1) {
                    nextIndex = currentIndex + 1;
                    focusableElements[nextIndex].focus();
                    if (focusableElements[nextIndex].select) focusableElements[nextIndex].select();
                }
                break;
        }
    });
}

// Undo/Redo System Functions

// Save current state to history
function saveState() {
    const currentState = getTableData();
    
    // Remove any states after current index (for new actions)
    history = history.slice(0, historyIndex + 1);
    
    // Add new state
    history.push(JSON.stringify(currentState));
    
    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    } else {
        historyIndex++;
    }
    
    updateUndoRedoButtons();
}

// Get current table data
function getTableData() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');
    const data = [];
    
    rows.forEach(row => {
        const rowData = {
            sno: row.querySelector('.sno-input').value,
            efile: row.querySelector('.efile-input').value,
            contractor: row.querySelector('.contractor-input').value,
            description: row.querySelector('.description-input').value,
            value: row.querySelector('.value-input').value,
            gst: row.querySelector('.gst-select').value,
            startDate: row.querySelector('.start-date-input').value,
            endDate: row.querySelector('.end-date-input').value,
            attachment: row.querySelector('.attachment-input').files[0]?.name || ''
        };
        data.push(rowData);
    });
    
    return data;
}

// Restore table from state
function restoreState(stateString) {
    const state = JSON.parse(stateString);
    const tbody = document.getElementById('tableBody');
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Recreate rows from state
    state.forEach(rowData => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="sno-cell">
                    <input type="checkbox" class="sno-checkbox" data-row="${rowData.sno}">
                    <input type="text" class="sno-input" value="${rowData.sno}" readonly>
                </div>
            </td>
            <td>
                <input type="text" class="efile-input" placeholder="Enter E-File" value="${rowData.efile}">
            </td>
            <td>
                <input type="text" class="contractor-input" placeholder="Enter Contractor" value="${rowData.contractor}">
            </td>
            <td>
                <input type="text" class="description-input" placeholder="Enter Description" value="${rowData.description}">
            </td>
            <td>
                <input type="text" class="value-input" placeholder="Enter Value" value="${rowData.value}">
            </td>
            <td>
                <select class="gst-select">
                    <option value="">Select GST</option>
                    <option value="0%" ${rowData.gst === '0%' ? 'selected' : ''}>0%</option>
                    <option value="5%" ${rowData.gst === '5%' ? 'selected' : ''}>5%</option>
                    <option value="12%" ${rowData.gst === '12%' ? 'selected' : ''}>12%</option>
                    <option value="18%" ${rowData.gst === '18%' ? 'selected' : ''}>18%</option>
                    <option value="28%" ${rowData.gst === '28%' ? 'selected' : ''}>28%</option>
                </select>
            </td>
            <td>
                <input type="date" class="start-date-input" value="${rowData.startDate}">
            </td>
            <td>
                <input type="date" class="end-date-input" value="${rowData.endDate}">
            </td>
            <td>
                <span class="duration-display"></span>
            </td>
            <td>
                <input type="file" class="attachment-input" id="attachment-${index}" accept=".pdf,.doc,.docx,.xls,.xlsx" style="display: none;">
                <button type="button" class="attachment-btn" onclick="document.getElementById('attachment-${index}').click()">
                    <i class="fas fa-paperclip"></i>
                    <span class="btn-text">Attach</span>
                </button>
                <span class="file-name">${rowData.attachment || 'No file selected'}</span>
            </td>
            <td>
                <button class="delete-btn" onclick="deleteRow(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateTotalCount();
    updateAllDurations();
    // Skip duration notifications for undo/redo to avoid disturbance
    checkAllDurations(false);
}

// Undo function
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
        updateTotalCount(); // Fix: Update count after undo
        updateUndoRedoButtons();
    }
}

// Redo function
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
        updateTotalCount(); // Fix: Update count after redo
        updateUndoRedoButtons();
    }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    // Only proceed if elements exist
    if (undoBtn && redoBtn) {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }
}

// Add keyboard shortcuts for undo/redo
document.addEventListener('keydown', function (e) {
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Ctrl+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
    }
});
