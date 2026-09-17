/**
 * VendorLink Organizer Dashboard Controller
 * Connects statistics, upcoming events table, and recent applications with Axios.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Guard route: Ensure authenticated user is an ORGANIZER or ADMIN
    const user = authService.getUser();
    if (!authService.isLoggedIn() || !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
        showToast('Please log in with an Organizer account to access the dashboard.', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=organizer-dashboard.html';
        }, 1200);
        return;
    }

    // 2. Set Organizer profile in Topbar
    const profileNameEl = document.querySelector('.topbar .profile span');
    if (profileNameEl && user.fullName) {
        profileNameEl.textContent = user.fullName;
    }

    // 3. Connect Sidebar Logout
    const sidebarItems = document.querySelectorAll('.sidebar ul li');
    sidebarItems.forEach(item => {
        if (item.textContent.trim().toLowerCase() === 'logout') {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                authService.logout();
            });
        }
    });

    // 4. Load Dashboard Metrics
    async function loadDashboardStats() {
        try {
            const stats = await eventsAPI.getOrganizerDashboardStats();

            // Populate Statistic Cards
            const statTotalEvents = document.getElementById('stat-total-events');
            const statApplications = document.getElementById('stat-applications');
            const statApproved = document.getElementById('stat-approved');
            const statRevenue = document.getElementById('stat-revenue');

            if (statTotalEvents) statTotalEvents.textContent = stats.totalEvents ?? 0;
            if (statApplications) statApplications.textContent = stats.totalApplications ?? 0;
            if (statApproved) statApproved.textContent = stats.approvedVendors ?? 0;
            if (statRevenue) statRevenue.textContent = formatCurrency(stats.totalRevenue ?? 0);

            // Populate Upcoming Events Table
            const tbody = document.getElementById('upcoming-events-tbody') || document.querySelector('.table-section tbody');
            if (tbody && stats.upcomingEvents) {
                if (stats.upcomingEvents.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">No events created yet.</td></tr>`;
                } else {
                    tbody.innerHTML = stats.upcomingEvents.map(evt => {
                        const statusClass = evt.status === 'OPEN' ? 'open' : 'closed';
                        const statusLabel = evt.status === 'OPEN' ? 'Open' : evt.status;
                        return `
                            <tr>
                                <td><strong>${evt.title}</strong></td>
                                <td>${formatDate(evt.date)}</td>
                                <td>${evt.city || evt.location}</td>
                                <td>${evt.availableStalls ?? '-'} / ${evt.totalStalls ?? '-'}</td>
                                <td><span class="${statusClass}">${statusLabel}</span></td>
                                <td>
                                    <a href="event-details.html?id=${evt.id}" class="primary-btn" style="padding: 6px 14px; font-size: 0.85rem; text-decoration:none; display:inline-block;">
                                        View
                                    </a>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // Populate Recent Applications Section
            const appContainer = document.getElementById('recent-applications-list') || document.querySelector('.applications');
            if (appContainer && stats.recentApplications) {
                // Keep the heading
                const heading = appContainer.querySelector('h2');
                const headingHtml = heading ? heading.outerHTML : '<h2>Recent Vendor Applications</h2>';

                if (stats.recentApplications.length === 0) {
                    appContainer.innerHTML = headingHtml + `
                        <div style="text-align: center; padding: 30px; color: #94a3b8; background: #f8fafc; border-radius: 12px; margin-top: 15px;">
                            <p>No vendor applications received yet.</p>
                        </div>
                    `;
                } else {
                    const appsHtml = stats.recentApplications.map(app => {
                        const status = app.status;
                        let actionsHtml = '';

                        if (status === 'PENDING') {
                            actionsHtml = `
                                <button class="approve" onclick="handleApplicationStatus(${app.id}, 'APPROVED')">Approve</button>
                                <button class="reject" onclick="handleApplicationStatus(${app.id}, 'REJECTED')">Reject</button>
                            `;
                        } else {
                            const badgeColor = status === 'APPROVED' ? '#10b981' : '#ef4444';
                            actionsHtml = `
                                <span style="font-weight: 600; padding: 6px 12px; border-radius: 6px; background: ${badgeColor}15; color: ${badgeColor}; font-size: 0.85rem;">
                                    ${status}
                                </span>
                            `;
                        }

                        return `
                            <div class="application" id="app-card-${app.id}">
                                <div style="width: 50px; height: 50px; border-radius: 50%; background: #e2e8f0; display:flex; align-items:center; justify-content:center; font-size: 1.5rem; flex-shrink: 0;">
                                    🏪
                                </div>
                                <div style="flex: 1;">
                                    <h3>${app.businessName || (app.vendor ? app.vendor.businessName : 'Vendor')}</h3>
                                    <p style="margin-bottom: 2px;"><strong>Event:</strong> ${app.eventTitle || 'Event'}</p>
                                    <p style="font-size: 0.85rem; color: #64748b;">${app.productsDescription || 'No description provided'}</p>
                                </div>
                                <div style="display:flex; gap: 8px; align-items:center;">
                                    ${actionsHtml}
                                </div>
                            </div>
                        `;
                    }).join('');

                    appContainer.innerHTML = headingHtml + appsHtml;
                }
            }

        } catch (err) {
            console.error('Failed to load dashboard metrics:', err);
            showToast('Unable to load dashboard data: ' + err.message, 'error');
        }
    }

    // 5. Handle Approve / Reject Application Actions via Axios
    window.handleApplicationStatus = async (appId, newStatus) => {
        try {
            await applicationsAPI.updateStatus(appId, newStatus, `Updated by organizer to ${newStatus}`);
            showToast(`Application has been ${newStatus.toLowerCase()}!`, 'success');
            // Refresh dashboard
            await loadDashboardStats();
        } catch (err) {
            showToast('Failed to update status: ' + err.message, 'error');
        }
    };

    await loadDashboardStats();
});
