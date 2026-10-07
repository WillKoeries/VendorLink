/**
 * Vendor dashboard
 * ----------------
 * Overview · My applications · Notifications · Profile
 * Data comes from getMyApplications(), getMyNotifications(),
 * getMyVendorProfile() and getCategories().
 */

const VENDOR_TABS = {
  overview: { title: 'Dashboard overview', subtitle: 'Your applications, upcoming markets and latest updates.' },
  applications: { title: 'My applications', subtitle: 'Track every stall application and its status.' },
  notifications: { title: 'Notifications', subtitle: 'Decisions and updates from event organisers.' },
  profile: { title: 'Profile', subtitle: 'The business details organisers see when you apply.' }
};

const state = {
  session: null,
  applications: [],
  notifications: [],
  user: null,
  profile: null,
  categories: [],
  statusFilter: 'all'
};

document.addEventListener('DOMContentLoaded', () => {
  state.session = requireRole([Role.VENDOR]);
  if (!state.session) return;

  document.getElementById('footerYear').textContent = new Date().getFullYear();
  setupDashboardShell({ tabs: VENDOR_TABS, defaultTab: 'overview' });
  setupListeners();
  showArrivalMessages();
  loadDashboard();
});

function showArrivalMessages() {
  if (getQueryParam('welcome')) {
    showToast('Welcome to VendorLink! Complete your business profile so organisers know who you are.', 'success', 7000);
  }
  if (getQueryParam('reason') === 'role') {
    showToast('That page is for organisers, so you’ve been brought to your vendor dashboard.', 'info', 6000);
  }
  if (getQueryParam('welcome') || getQueryParam('reason')) {
    history.replaceState(null, '', `vendor-dashboard.html${window.location.hash}`);
  }
}

// ============ Loading ============
async function loadDashboard() {
  ['upcomingApproved', 'latestNotifications', 'applicationsList', 'notificationsList'].forEach(id =>
    renderLoading(document.getElementById(id)));

  try {
    const [applications, notifications, account, categories] = await Promise.all([
      getMyApplications(),
      getMyNotifications().catch(err => {
        console.warn('Failed to load notifications:', err);
        return [];
      }),
      getMyVendorProfile().catch(err => {
        console.warn('Failed to load vendor profile:', err);
        return { user: state.session, profile: null };
      }),
      getCategories().catch(err => {
        console.warn('Failed to load categories:', err);
        return [];
      })
    ]);
    Object.assign(state, {
      applications: applications || [],
      notifications: notifications || [],
      categories: categories || [],
      user: account?.user || state.session,
      profile: account?.profile || null
    });
    renderAll();
  } catch (err) {
    console.error('Critical failure loading vendor dashboard:', err);
    document.querySelectorAll('[data-view]').forEach(v => { v.hidden = true; });
    renderError(document.getElementById('dashboardError'), {
      title: 'Unable to load your dashboard',
      message: err.message || 'Please check your connection and try again.',
      onRetry: () => window.location.reload()
    });
  }
}

function renderAll() {
  renderOverview();
  renderApplications();
  renderNotifications();
  renderProfileForm();
}

function countByStatus(status) {
  return state.applications.filter(a => a.status === status).length;
}

// ============ Overview ============
function renderOverview() {
  // Nudge vendors to finish their profile
  const p = state.profile || {};
  const missing = [!p.description && 'a description', !p.category && 'a category', !p.city && 'your city'].filter(Boolean);
  document.getElementById('profilePrompt').innerHTML = missing.length ? `
    <div class="alert alert-warning">
      <i class="fa-solid fa-user-pen" aria-hidden="true"></i>
      <span>Your profile is missing ${escapeHtml(missing.join(', '))}. Organisers see your profile when you apply.
        <a href="#profile">Complete your profile</a></span>
    </div>` : '';

  const unread = state.notifications.filter(n => !n.isRead).length;
  const stat = (label, value, note, icon, tone) => `
    <div class="stat-card">
      <div class="stat-card-head">
        <span class="stat-label">${label}</span>
        <span class="stat-icon tone-${tone}"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
      </div>
      <div class="stat-value">${value}</div>
      <p class="stat-note">${note}</p>
    </div>`;

  document.getElementById('overviewStats').innerHTML = [
    stat('Applications', state.applications.length, 'Sent in total', 'fa-file-signature', 'primary'),
    stat('Pending', countByStatus(ApplicationStatus.PENDING), 'Waiting for organisers', 'fa-hourglass-half', 'warning'),
    stat('Approved', countByStatus(ApplicationStatus.APPROVED), 'Stalls secured', 'fa-circle-check', 'success'),
    stat('Unread', unread, `Notification${unread === 1 ? '' : 's'}`, 'fa-bell', 'neutral')
  ].join('');

  // Approved applications for events that haven't happened yet
  const upcomingEl = document.getElementById('upcomingApproved');
  const upcoming = state.applications
    .filter(a => a.status === ApplicationStatus.APPROVED && a.event && isUpcoming(a.event) && a.event.status !== EventStatus.CANCELLED)
    .sort((x, y) => x.event.date.localeCompare(y.event.date));

  if (!upcoming.length) {
    renderEmpty(upcomingEl, {
      icon: 'fa-calendar-check',
      title: 'No upcoming markets yet',
      message: 'Approved stalls for upcoming events will show here.',
      action: { label: 'Find an event', href: 'browse-events.html', icon: 'fa-magnifying-glass' }
    });
  } else {
    upcomingEl.innerHTML = `<div class="feed">${upcoming.map(a => `
      <div class="feed-item">
        <img class="avatar" src="${escapeHtml(eventImageUrl(a.event))}" alt="" data-fallback="event">
        <div class="feed-body">
          <h3><a href="event-details.html?id=${a.event.id}">${escapeHtml(a.event.title)}</a></h3>
          <p>${escapeHtml(formatEventDates(a.event))}${a.event.time ? ' · ' + escapeHtml(a.event.time) : ''} · ${escapeHtml(a.event.city)}</p>
        </div>
        ${applicationStatusBadge(a.status)}
      </div>`).join('')}</div>`;
  }

  // Latest three notifications
  const latestEl = document.getElementById('latestNotifications');
  if (!state.notifications.length) {
    renderEmpty(latestEl, { icon: 'fa-bell-slash', title: 'No notifications yet', boxed: false });
  } else {
    latestEl.innerHTML = `<div class="notif-panel-list">${state.notifications.slice(0, 3).map(n => notificationItemHtml(n, Role.VENDOR)).join('')}</div>`;
  }

  const navCount = document.getElementById('navUnreadCount');
  navCount.hidden = unread === 0;
  navCount.textContent = unread;
}

// ============ My applications ============
function renderApplications() {
  const statuses = ['all', ...Object.values(ApplicationStatus)];
  document.getElementById('applicationStatusTabs').innerHTML = statuses.map(status => {
    const count = status === 'all' ? state.applications.length : countByStatus(status);
    const label = status === 'all' ? 'All' : APPLICATION_STATUS_UI[status].label;
    const active = status === state.statusFilter;
    return `<button type="button" class="pill ${active ? 'is-active' : ''}" data-status="${status}" aria-pressed="${active}">${label} <span class="pill-count">${count}</span></button>`;
  }).join('');

  const listEl = document.getElementById('applicationsList');
  const rows = state.statusFilter === 'all'
    ? state.applications
    : state.applications.filter(a => a.status === state.statusFilter);

  if (!rows.length) {
    const none = state.applications.length === 0;
    renderEmpty(listEl, {
      icon: 'fa-file-signature',
      title: none ? 'You haven’t applied for any events yet' : `No ${APPLICATION_STATUS_UI[state.statusFilter].label.toLowerCase()} applications`,
      message: none ? 'Browse open events and apply for a stall in a few minutes.' : 'Choose another status above to see more.',
      action: none ? { label: 'Browse events', href: 'browse-events.html', icon: 'fa-magnifying-glass' } : null
    });
    return;
  }

  listEl.innerHTML = `<div class="application-list">${rows.map(applicationCardHtml).join('')}</div>`;
}

function applicationCardHtml(a) {
  const e = a.event;
  const canWithdraw = a.status === ApplicationStatus.PENDING;
  const note = a.reviewNotes
    ? `<div class="review-note"><strong>Organiser’s note:</strong> ${escapeHtml(a.reviewNotes)}</div>` : '';
  const eventCancelled = e && e.status === EventStatus.CANCELLED
    ? '<div class="review-note"><strong>This event was cancelled by the organiser.</strong></div>' : '';

  return `
    <article class="application-card">
      <img class="application-thumb" src="${escapeHtml(e ? eventImageUrl(e) : FALLBACK_IMAGES.event)}" alt="" loading="lazy" data-fallback="event">
      <div class="application-info">
        <h3>${e ? `<a href="event-details.html?id=${e.id}">${escapeHtml(e.title)}</a>` : 'Event no longer available'}</h3>
        <div class="application-meta">
          ${e ? `<span><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(formatEventDates(e))}</span>
                 <span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${escapeHtml(e.city)}</span>
                 <span><i class="fa-solid fa-wallet" aria-hidden="true"></i>${escapeHtml(formatCurrency(e.stallFee))}</span>` : ''}
          <span><i class="fa-regular fa-clock" aria-hidden="true"></i>Applied ${escapeHtml(formatDate(a.appliedAt.slice(0, 10)))}</span>
        </div>
        ${note}${eventCancelled}
      </div>
      <div class="application-side">
        ${applicationStatusBadge(a.status)}
        <div class="application-actions">
          ${e ? `<a class="btn btn-secondary btn-sm" href="event-details.html?id=${e.id}">View event</a>` : ''}
          ${canWithdraw ? `<button type="button" class="btn btn-danger btn-sm" data-withdraw-id="${a.id}">Withdraw</button>` : ''}
        </div>
      </div>
    </article>`;
}

async function withdrawApplication(id) {
  const application = state.applications.find(a => a.id === Number(id));
  if (!application) return;
  const ok = await confirmDialog({
    title: 'Withdraw this application?',
    message: `Your application for ${application.event ? application.event.title : 'this event'} will be cancelled and the organiser will be told. You can apply again later if stalls are still available.`,
    confirmText: 'Withdraw application',
    cancelText: 'Keep it',
    danger: true
  });
  if (!ok) return;
  try {
    await cancelApplication(application.id);
    showToast('Your application was withdrawn.', 'success');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============ Notifications ============
function renderNotifications() {
  const listEl = document.getElementById('notificationsList');
  document.getElementById('markAllReadBtn').disabled = !state.notifications.some(n => !n.isRead);

  if (!state.notifications.length) {
    renderEmpty(listEl, { icon: 'fa-bell-slash', title: 'No notifications yet', message: 'You’ll be notified here when an organiser reviews one of your applications.' });
    return;
  }
  listEl.innerHTML = `<div class="notif-panel-list">${state.notifications.map(n => notificationItemHtml(n, Role.VENDOR)).join('')}</div>`;
}

async function refreshNotifications() {
  state.notifications = await getMyNotifications();
  renderNotifications();
  renderOverview();
  document.dispatchEvent(new CustomEvent('notifications:changed'));
}

// ============ Profile ============
function renderProfileForm() {
  const form = document.getElementById('profileForm');
  const p = state.profile || {};
  const user = state.user || {};

  // VendorProfile.category is stored as text (a category name), as in the UML
  const categoryNames = state.categories.map(c => c.name);
  if (p.category && !categoryNames.includes(p.category)) categoryNames.push(p.category);
  fillSelect(form.elements.category, categoryNames.map(name => ({ value: name, label: name })), { placeholder: 'Choose a category', selected: p.category || '' });
  fillSelect(form.elements.province, PROVINCES.map(name => ({ value: name, label: name })), { placeholder: 'Choose a province', selected: p.province || '' });

  form.elements.businessName.value = p.businessName || '';
  form.elements.description.value = p.description || '';
  form.elements.website.value = p.website || '';
  form.elements.profileImageUrl.value = p.profileImageUrl || '';
  form.elements.address.value = p.address || '';
  form.elements.city.value = p.city || '';
  form.elements.fullName.value = user.fullName || '';
  form.elements.phone.value = user.phone || p.phone || '';
  document.getElementById('pfEmail').value = user.email || '';

  renderProfilePreview();
}

/** Live preview of how the profile looks to organisers. */
function renderProfilePreview() {
  const form = document.getElementById('profileForm');
  const name = form.elements.businessName.value.trim() || 'Your business';
  const place = [form.elements.city.value.trim(), form.elements.province.value].filter(Boolean).join(', ');
  document.getElementById('profilePreview').innerHTML = `
    ${avatarHtml(name, form.elements.profileImageUrl.value.trim())}
    <h3>${escapeHtml(name)}</h3>
    ${form.elements.category.value ? `<span class="badge badge-primary">${escapeHtml(form.elements.category.value)}</span>` : ''}
    <p class="text-muted text-small">${escapeHtml(form.elements.description.value.trim() || 'Add a short description of what you sell.')}</p>
    ${place ? `<p class="text-small"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(place)}</p>` : ''}
    <p class="text-small text-muted mt-8">Organisers see this when they review your applications.</p>`;
}

async function saveProfile(e) {
  e.preventDefault();
  const form = e.target;
  const button = document.getElementById('profileSubmitBtn');
  const alert = document.getElementById('profileAlert');
  alert.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  clearFieldErrors(form);
  setButtonLoading(button, true, 'Saving…');
  try {
    const result = await updateMyVendorProfile(data);
    state.user = result.user;
    state.profile = result.profile;
    renderOverview();
    mountUserMenu(document.getElementById('topbarUserMenu'));
    showToast('Your profile has been saved.', 'success');
  } catch (err) {
    if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
    else {
      alert.textContent = err.message;
      alert.hidden = false;
    }
  } finally {
    setButtonLoading(button, false);
  }
}

// ============ Listeners ============
function setupListeners() {
  const form = document.getElementById('profileForm');
  form.addEventListener('submit', saveProfile);
  form.addEventListener('input', debounce(renderProfilePreview, 200));
  form.addEventListener('change', renderProfilePreview);

  document.getElementById('markAllReadBtn').addEventListener('click', async () => {
    await markAllNotificationsRead();
    await refreshNotifications();
    showToast('All notifications marked as read.', 'success');
  });

  // The bell dropdown marks things as read too: keep this page in sync
  document.addEventListener('notifications:changed', async (e) => {
    if (e.detail === 'bell') {
      state.notifications = await getMyNotifications();
      renderNotifications();
      renderOverview();
    }
  });

  document.addEventListener('click', async (e) => {
    const statusPill = e.target.closest('[data-status]');
    if (statusPill) {
      state.statusFilter = statusPill.dataset.status;
      renderApplications();
      return;
    }

    const withdraw = e.target.closest('[data-withdraw-id]');
    if (withdraw) {
      withdrawApplication(withdraw.dataset.withdrawId);
      return;
    }

    // Notification lists on this page: mark as read, then follow the link
    const notification = e.target.closest('.dash-content [data-notification-id]');
    if (notification) {
      e.preventDefault();
      await markNotificationRead(notification.dataset.notificationId);
      await refreshNotifications();
      window.location.href = notification.getAttribute('href');
    }
  });
}
