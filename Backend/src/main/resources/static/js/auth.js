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
                if (isOrganizer) {
                    container.innerHTML = `
                        <div class="nav-user-badge">
                            <span class="nav-user-name">👤 ${escapeHtml(user.fullName || user.email)}</span>
                            <a href="organizer-dashboard.html" class="nav-dashboard-link">Dashboard</a>
                            <button class="nav-logout-btn" onclick="authService.logout()">Logout</button>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="nav-user-badge">
                            <span class="nav-user-name">🏪 ${escapeHtml(user.fullName || user.email)}</span>
                            <button class="nav-dashboard-link" style="border:none; cursor:pointer;" onclick="authService.showMyApplications()">My Applications</button>
                            <button class="nav-logout-btn" onclick="authService.logout()">Logout</button>
                        </div>
                    `;
                }
            } else {
                container.innerHTML = `
                    <a href="login.html" class="login-btn">Login</a>
                    <a href="register.html" class="register-btn">Join as Vendor</a>
                `;
            }
        });
    },

    // View submitted applications and track status
    async showMyApplications() {
        let modal = document.getElementById('my-applications-modal');
        if (!modal) {
            const modalHtml = `
                <div id="my-applications-modal" class="modal-overlay">
                    <div class="modal-card" style="max-width: 650px; max-height: 85vh; overflow-y: auto;">
                        <div class="modal-header">
                            <h2>My Event Applications</h2>
                            <button type="button" class="modal-close-btn" id="my-apps-close">&times;</button>
                        </div>
                        <div id="my-apps-list" style="display:flex; flex-direction:column; gap:14px;">
                            <div style="text-align:center; padding: 25px; color: #64748b;">
                                <div class="spinner" style="border-top-color:#2563eb; width:28px; height:28px; margin-bottom:10px;"></div>
                                <p>Loading your applications...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('my-applications-modal');
            document.getElementById('my-apps-close').onclick = () => modal.classList.remove('active');
            modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
        }

        modal.classList.add('active');
        const listEl = document.getElementById('my-apps-list');

        try {
            const apps = await applicationsAPI.getMyApplications();
            if (!apps || apps.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 35px 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                        <p style="font-size: 1.1rem; color: #475569; font-weight: 500; margin-bottom: 6px;">No applications submitted yet</p>
                        <p style="color: #94a3b8; font-size: 0.9rem;">Browse open events to apply for stalls.</p>
                        <a href="browse-events.html" class="primary-btn" style="display:inline-block; margin-top:14px; text-decoration:none; padding:8px 18px; font-size:0.9rem;">Browse Events</a>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = apps.map(app => {
                const statusColor = app.status === 'APPROVED' ? '#10b981' : (app.status === 'REJECTED' ? '#ef4444' : '#f59e0b');
                const cancelBtn = app.status === 'PENDING' 
                    ? `<button onclick="authService.cancelApplication(${app.id})" style="background:transparent; border:1px solid #cbd5e1; color:#ef4444; border-radius:6px; padding:4px 10px; font-size:0.8rem; cursor:pointer;">Cancel Application</button>` 
                    : '';

                return `
                    <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #ffffff;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 1.05rem; color: #1e293b;">
                                    <a href="event-details.html?id=${app.eventId}" style="color: inherit; text-decoration: none;">${escapeHtml(app.eventTitle || 'Event')}</a>
                                </h3>
                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Business: <strong>${escapeHtml(app.businessName)}</strong></p>
                            </div>
                            <span style="font-weight: 600; padding: 4px 10px; border-radius: 6px; background: ${statusColor}18; color: ${statusColor}; font-size: 0.8rem;">
                                ${app.status}
                            </span>
                        </div>
                        <p style="font-size: 0.85rem; color: #475569; margin: 6px 0;">${escapeHtml(app.productsDescription)}</p>
                        ${app.reviewNotes ? `<p style="font-size: 0.85rem; color: #0284c7; background: #f0f9ff; padding: 8px 12px; border-radius: 6px; margin: 8px 0;"><strong>Organizer Note:</strong> ${escapeHtml(app.reviewNotes)}</p>` : ''}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 0.8rem; color: #94a3b8;">
                            <span>Applied: ${formatDate(app.appliedAt)}</span>
                            ${cancelBtn}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            listEl.innerHTML = `<p style="color: #ef4444; text-align:center;">Failed to load applications: ${escapeHtml(err.message)}</p>`;
        }
    },

    async cancelApplication(appId) {
        if (!confirm('Are you sure you want to cancel this application?')) return;
        try {
            await applicationsAPI.cancelApplication(appId);
            showToast('Application cancelled successfully', 'info');
            this.showMyApplications();
        } catch (err) {
            showToast(err.message, 'error');
        }
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

                // Check for redirect param safely
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = safeRedirect(urlParams.get('redirect'), null);

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

            if (password.length < 8) {
                showToast('Password must be at least 8 characters', 'warning');
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
