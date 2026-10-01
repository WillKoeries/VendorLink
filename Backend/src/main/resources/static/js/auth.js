/**
 * VendorLink Authentication & Session Controller
 * Manages user credentials, navbar session state, and form interactions.
 */

const authService = {
    getToken() {
        return localStorage.getItem('vendorlink_token');
    },

    setToken(token) {
        localStorage.setItem('vendorlink_token', token);
    },

    getUser() {
        try {
            const userStr = localStorage.getItem('vendorlink_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem('vendorlink_user', JSON.stringify(user));
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    logout() {
        localStorage.removeItem('vendorlink_token');
        localStorage.removeItem('vendorlink_user');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 800);
    },

    // Sync navbar across all pages depending on authentication state
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

window.authService = authService;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // 1. Synchronize Navbar across pages
    authService.updateNavbar();

    // 2. Attach Login Form Listener (if on login.html)
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
                
                // Save authentication data
                authService.setToken(response.token);
                authService.setUser(response.user);

                showToast(`Welcome back, ${response.user.fullName || 'User'}!`, 'success');

                // Check for redirect param
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
