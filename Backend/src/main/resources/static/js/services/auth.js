/**
 * VendorLink Authentication Service
 * Centralizes all authentication API calls, token persistence, and global hooks.
 */

// 1. Centralized relative API route (works locally and on Render)
const API_BASE_URL = '/api';

export const ROLES = Object.freeze({
    ORGANIZER: 'ORGANIZER',
    VENDOR: 'VENDOR',
    ADMIN: 'ADMIN'
});

// In-memory cache to avoid repeated JSON.parse calls on hot paths
let cachedSession = null;

// ============================================================================
// Core Session Helpers
// ============================================================================
export function saveSession(token, user) {
    if (!token || !user) return null;
    const userStr = JSON.stringify(user);
    
    // Save to both key formats to support legacy and modular scripts
    localStorage.setItem('token', token);
    localStorage.setItem('vendorlink_token', token);
    localStorage.setItem('user', userStr);
    localStorage.setItem('vendorlink_user', userStr);

    cachedSession = {
        token,
        user,
        role: user.role,
        fullName: user.fullName || user.email || 'User',
        email: user.email,
        isOrganizer: user.role === ROLES.ORGANIZER,
        isVendor: user.role === ROLES.VENDOR,
        ...user
    };
    return cachedSession;
}

export function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('vendorlink_token');
    localStorage.removeItem('user');
    localStorage.removeItem('vendorlink_user');
    sessionStorage.removeItem('vendorlink_session');
    localStorage.removeItem('vendorlink_session');
    cachedSession = null;
}

export function getSession() {
    if (cachedSession) return cachedSession;

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
        const userStr = localStorage.getItem('user') || localStorage.getItem('vendorlink_user');
        if (!token || !userStr) return null;

        const user = JSON.parse(userStr);
        cachedSession = {
            token,
            user,
            role: user.role,
            fullName: user.fullName || user.email || 'User',
            email: user.email,
            isOrganizer: user.role === ROLES.ORGANIZER,
            isVendor: user.role === ROLES.VENDOR,
            ...user
        };
        return cachedSession;
    } catch {
        clearSession();
        return null;
    }
}

// Keep the stored name in sync after a profile edit
export function updateSessionName(fullName) {
    const session = getSession();
    if (!session) return;
    session.fullName = fullName;
    if (session.user) session.user.fullName = fullName;
    const userStr = JSON.stringify(session.user || session);
    localStorage.setItem('user', userStr);
    localStorage.setItem('vendorlink_user', userStr);
    cachedSession = {
        ...session,
        fullName
    };
}

// ============================================================================
// Authentication API Handlers
// ============================================================================

/**
 * Logs in a user, stores the session, and returns the authentication response.
 */
export async function signIn(email, password) {
    if (!email || !password) {
        throw new Error('Please enter both your email and password.');
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password })
        });
    } catch (networkErr) {
        throw new Error('Unable to connect to the VendorLink server. Please check your internet connection.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        let msg = data.message || data.error || 'Invalid email or password.';
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
            msg = Object.values(data.fieldErrors).join('. ');
        }
        const err = new Error(msg);
        if (data.fieldErrors) err.fieldErrors = data.fieldErrors;
        throw err;
    }

    // Save session credentials
    saveSession(data.token, data.user);
    return data;
}

/**
 * Registers a new user and automatically logs them in.
 */
export async function registerAccount(userData) {
    const { email, password, fullName, role, businessName, phone } = userData;

    if (!email || !password || !fullName) {
        throw new Error('Please fill in all required registration fields.');
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email.trim(),
                password,
                fullName: fullName.trim(),
                role: role || ROLES.VENDOR,
                businessName: businessName ? businessName.trim() : undefined,
                phone: phone ? phone.trim() : undefined,
                phoneNumber: phone ? phone.trim() : undefined
            })
        });
    } catch (networkErr) {
        throw new Error('Unable to connect to the VendorLink server. Please check your internet connection.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        let msg = data.message || data.error || 'Registration failed. Please try again.';
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
            msg = Object.values(data.fieldErrors).join('. ');
        }
        const err = new Error(msg);
        if (data.fieldErrors) err.fieldErrors = data.fieldErrors;
        throw err;
    }

    // Automatically initialize session on successful registration
    saveSession(data.token, data.user);
    return data;
}

/**
 * Clears session and redirects to the landing page.
 */
export function signOut() {
    clearSession();
    window.location.href = 'index.html?signedout=1';
}

// ---------- Page guard ----------
/**
 * Call at the top of a protected page.
 * Returns the session if the user may view the page, otherwise redirects and returns null.
 */
export function requireRole(allowedRoles) {
    const session = getSession();
    const currentPage = window.location.pathname.split('/').pop() + window.location.hash;

    if (!session) {
        window.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}&reason=auth`);
        return null;
    }
    if (!allowedRoles.includes(session.role)) {
        const getDash = typeof getDashboardUrl === 'function'
            ? getDashboardUrl
            : (r => r === ROLES.ORGANIZER ? 'organizer-dashboard.html' : 'browse-events.html');
        window.location.replace(`${getDash(session.role)}?reason=role`);
        return null;
    }
    return session;
}

// ============================================================================
// Global Attachments (Prevents "is not defined" errors across all scripts)
// ============================================================================
window.ROLES = ROLES;
window.Role = window.Role || ROLES;
window.saveSession = saveSession;
window.clearSession = clearSession;
window.getSession = getSession;
window.signIn = signIn;
window.registerAccount = registerAccount;
window.signUp = registerAccount;
window.signOut = signOut;
window.logout = signOut;
window.getCurrentUser = () => getSession()?.user || null;
window.isAuthenticated = () => !!getSession();
window.requireRole = requireRole;
window.updateSessionName = updateSessionName;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ROLES,
        saveSession,
        clearSession,
        getSession,
        signIn,
        registerAccount,
        signOut,
        requireRole,
        updateSessionName
    };
}
