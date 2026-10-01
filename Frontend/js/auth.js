/**
 * VendorLink Authentication & Session Controller
 * Manages user credentials, navbar session state, and form interactions.
 */

// Fallback toast function in case ui.js hasn't loaded yet
function showToast(message, type = 'info') {
    if (window.ui && typeof window.ui.toast === 'function') {
        window.ui.toast(message, type);
    } else if (typeof window.showToastNotification === 'function') {
        window.showToastNotification(message, type);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

const authService = {
    getToken() {
        return localStorage.getItem('vendorlink_token') || localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('vendorlink_token', token);
        localStorage.setItem('token', token);
    },

    getUser() {
        try {
            const userStr = localStorage.getItem('vendorlink_user') || localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    setUser(user) {
        const serialized = JSON.stringify(user);
        localStorage.setItem('vendorlink_user', serialized);
        localStorage.setItem('user', serialized);
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    logout() {
        localStorage.removeItem('vendorlink_token');
        localStorage.removeItem('token');
        localStorage.removeItem('vendorlink_user');
        localStorage.removeItem('user');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 800);
    },

    updateNavbar() {
        const buttonContainers = document.querySelectorAll('.navbar .buttons');
        const user = this.getUser();

        buttonContainers.forEach(container => {
            if (this.isLoggedIn() && user) {
                const isOrganizer = user.role === 'ORGANIZER';
                const dashboardHref = isOrganizer ? 'organizer-dashboard.html' : 'browse-events.html';
                const dashboardLabel = isOrganizer ? 'Dashboard' : 'Browse Events';

                container.innerHTML = `
                    <div class="nav-user-badge">
                        <span class="nav-user-name">👤 ${user.fullName || user.email}</span>
                        <a href="${dashboardHref}" class="nav-dashboard-link">${dashboardLabel}</a>
                        <button class="nav-logout-btn" onclick="authService.logout()">Logout</button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <a href="login.html" class="login-btn">Login</a>
                    <a href="register.html" class="register-btn">Join as Vendor</a>
                `;
            }
        });
    }
};

// ============================================================================
// Global functions required by layout.js and page scripts
// ============================================================================
function getSession() {
    const token = authService.getToken();
    const user = authService.getUser();
    if (!token || !user) return null;

    return {
        token,
        user,
        role: user.role,
        fullName: user.fullName || user.email,
        email: user.email,
        isOrganizer: user.role === 'ORGANIZER',
        isVendor: user.role === 'VENDOR',
        isAuthenticated: true,
        ...user
    };
}

function getCurrentUser() {
    return authService.getUser();
}

function isAuthenticated() {
    return authService.isLoggedIn();
}

function logout() {
    return authService.logout();
}

window.authService = authService;
window.getSession = getSession;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.logout = logout;
window.showToast = showToast;

// ============================================================================
// DOM Initialization & Form Handlers
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    authService.updateNavbar();

    const loginForm = document.getElementById('login-form') || document.querySelector('.auth form');
    if (loginForm && window.location.pathname.includes('login.html')) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('login-email') || loginForm.querySelector('input[type="email"]');
            const passwordInput = document.getElementById('login-password') || loginForm.querySelector('input[type="password"]');
            const submitBtn = loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                showToast('Please enter both email and password', 'warning');
                return;
            }

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

            try {
                const response = await authAPI.login({ email, password });

                authService.setToken(response.token);
                authService.setUser(response.user);

                showToast(`Welcome back, ${response.user.fullName || 'User'}!`, 'success');

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');

                setTimeout(() => {
                    if (redirect) {
                        window.location.href = redirect;
                    } else if (response.user.role === 'ORGANIZER') {
                        window.location.href = 'organizer-dashboard.html';
                    } else {
                        window.location.href = 'browse-events.html';
                    }
                }, 1000);
            } catch (err) {
                showToast(err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // 3. Attach Register Form Listener (if on register.html)
    const registerForm = document.getElementById('register-form') || (window.location.pathname.includes('register.html') ? document.querySelector('.auth form') : null);
    if (registerForm && window.location.pathname.includes('register.html')) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullNameInput = document.getElementById('reg-fullname') || registerForm.querySelector('input[placeholder*="Full Name"]');
            const emailInput = document.getElementById('reg-email') || registerForm.querySelector('input[type="email"]');
            const businessNameInput = document.getElementById('reg-business') || registerForm.querySelector('input[placeholder*="Business Name"]');
            const passwordInput = document.getElementById('reg-password') || registerForm.querySelector('input[placeholder="Password"]');
            const confirmInput = document.getElementById('reg-confirm-password') || registerForm.querySelector('input[placeholder*="Confirm"]');
            const roleSelect = document.getElementById('reg-role');
            const phoneInput = document.getElementById('reg-phone');
            const submitBtn = registerForm.querySelector('button');

            const fullName = fullNameInput ? fullNameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const businessName = businessNameInput ? businessNameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmInput ? confirmInput.value : '';
            const role = roleSelect ? roleSelect.value : 'VENDOR';
            const phone = phoneInput ? phoneInput.value.trim() : '';

            if (!fullName || !email || !password) {
                showToast('Please fill in all required fields', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'warning');
                return;
            }

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';

            try {
                const response = await authAPI.register({
                    fullName,
                    email,
                    password,
                    role,
                    phone: phone || undefined,
                    businessName: businessName || undefined
                });

                authService.setToken(response.token);
                authService.setUser(response.user);

                showToast('Account created successfully!', 'success');

                setTimeout(() => {
                    if (role === 'ORGANIZER') {
                        window.location.href = 'organizer-dashboard.html';
                    } else {
                        window.location.href = 'browse-events.html';
                    }
                }, 1000);
            } catch (err) {
                showToast(err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
});
