/**
 * VendorLink API Client - Powered by Axios
 * Handles HTTP requests, JWT authentication, and centralized error handling.
 */

// Base API URL configuration
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8080/api';

// Create dedicated Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000
});

// Request Interceptor: Attach JWT Token if available
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('vendorlink_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Global error interception & token expiry handling
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        let errorMessage = 'An unexpected error occurred. Please try again.';

        if (error.response) {
            const data = error.response.data;
            if (data && data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
                errorMessage = Object.values(data.fieldErrors).join('. ');
            } else if (data && data.message) {
                errorMessage = data.message;
            } else if (typeof data === 'string') {
                errorMessage = data;
            }

            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                const hadToken = !!localStorage.getItem('vendorlink_token');
                localStorage.removeItem('vendorlink_token');
                localStorage.removeItem('vendorlink_user');
                
                // If user was logged in and their session expired
                if (hadToken && !window.location.pathname.includes('login.html')) {
                    showToast('Session expired. Please log in again.', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            } else if (error.response.status === 403) {
                errorMessage = 'Access denied. You do not have permission for this action.';
            }
        } else if (error.request) {
            errorMessage = 'Cannot connect to VendorLink server. Ensure the backend is running at ' + API_BASE_URL;
        }

        return Promise.reject(new Error(errorMessage));
    }
);

// ==========================================
// Authentication API
// ==========================================
const authAPI = {
    register: (data) => apiClient.post('/auth/register', data),
    login: (data) => apiClient.post('/auth/login', data),
    getMe: () => apiClient.get('/auth/me')
};

// ==========================================
// Events API
// ==========================================
const eventsAPI = {
    getEvents: (params = {}) => apiClient.get('/events', { params }),
    getEventById: (id) => apiClient.get(`/events/${id}`),
    createEvent: (data) => apiClient.post('/events', data),
    updateEvent: (id, data) => apiClient.put(`/events/${id}`, data),
    deleteEvent: (id) => apiClient.delete(`/events/${id}`),
    getMyEvents: () => apiClient.get('/events/organizer/my-events'),
    getOrganizerDashboardStats: () => apiClient.get('/events/organizer/dashboard-stats')
};

// ==========================================
// Applications API
// ==========================================
const applicationsAPI = {
    applyForEvent: (data) => apiClient.post('/applications', data),
    getMyApplications: () => apiClient.get('/applications/my'),
    getEventApplications: (eventId) => apiClient.get(`/applications/event/${eventId}`),
    getApplicationById: (id) => apiClient.get(`/applications/${id}`),
    updateStatus: (id, status, reviewNotes = '') => 
        apiClient.patch(`/applications/${id}/status`, { status, reviewNotes }),
    cancelApplication: (id) => apiClient.delete(`/applications/${id}`)
};

// ==========================================
// Categories API
// ==========================================
const categoriesAPI = {
    getAll: () => apiClient.get('/categories'),
    getById: (id) => apiClient.get(`/categories/${id}`)
};

// ==========================================
// Vendor Profiles API
// ==========================================
const vendorsAPI = {
    getMyProfile: () => apiClient.get('/vendor/profile'),
    updateMyProfile: (data) => apiClient.put('/vendor/profile', data),
    getAll: () => apiClient.get('/vendors'),
    getById: (id) => apiClient.get(`/vendors/${id}`)
};

// ==========================================
// Notifications API
// ==========================================
const notificationsAPI = {
    getNotifications: () => apiClient.get('/notifications'),
    getUnreadCount: () => apiClient.get('/notifications/unread-count'),
    markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
    markAllAsRead: () => apiClient.patch('/notifications/read-all')
};

// ==========================================
// UI Helpers: Toast Notifications & Formatting
// ==========================================
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const textSpan = document.createElement('span');
    textSpan.innerText = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeToast(toast);

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
}

function removeToast(toast) {
    toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'R0.00';
    const num = Number(amount);
    return `R${num.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
}

// Attach to window object for global script access
window.apiClient = apiClient;
window.authAPI = authAPI;
window.eventsAPI = eventsAPI;
window.applicationsAPI = applicationsAPI;
window.categoriesAPI = categoriesAPI;
window.vendorsAPI = vendorsAPI;
window.notificationsAPI = notificationsAPI;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
