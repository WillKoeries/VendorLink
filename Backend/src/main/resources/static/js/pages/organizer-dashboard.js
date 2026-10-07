/**
 * Organizer dashboard
 * -------------------
 * Loads the organiser's events, applications, notifications and profile
 * from the services once, keeps them in `state`, and renders six tabs:
 * Overview · Events · Applications · Vendors · Revenue · Settings.
 * After any change (approve, edit event…) the data is reloaded and every
 * tab is redrawn, so all numbers stay in sync.
 * ADMIN users see every event on the platform.
 */

const ORGANIZER_TABS = {
  overview: { title: 'Dashboard overview', subtitle: 'Your events, stall numbers and applications at a glance.' },
  events: { title: 'Events', subtitle: 'Create, edit and publish your markets and festivals.' },
  applications: { title: 'Applications', subtitle: 'Review vendors who want a stall at your events.' },
  vendors: { title: 'Vendors', subtitle: 'Contact details for every vendor you have approved.' },
  revenue: { title: 'Revenue', subtitle: 'Stall fee totals and occupancy for each event.' },
  settings: { title: 'Settings', subtitle: 'Your organisation profile and account details.' }
};

const state = {
  session: null,
  events: [],
  applications: [],
  notifications: [],
  user: null,
  profile: null,
  categories: [],
  eventsStatusFilter: 'all',
  applicationStatusFilter: 'all',
  applicationEventFilter: 'all',
  editingEventId: null
};

document.addEventListener('DOMContentLoaded', () => {
  state.session = requireRole([Role.ORGANIZER, Role.ADMIN]);
  if (!state.session) return;

  document.getElementById('roleTag').textContent = ROLE_LABELS[state.session.role];
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  if (isAdmin()) {
    ORGANIZER_TABS.events.subtitle = 'Admin view: every event on VendorLink.';
    ORGANIZER_TABS.applications.subtitle = 'Admin view: applications for every event.';
  }

  setupDashboardShell({ tabs: ORGANIZER_TABS, defaultTab: 'overview' });
  setupListeners();
  showArrivalMessages();
  loadDashboard();
});

function isAdmin() {
  return state.session.role === Role.ADMIN;
}

function showArrivalMessages() {
  if (getQueryParam('welcome')) {
    showToast('Your organiser account is ready. Add your organisation details in Settings, then create your first event.', 'success', 7000);
  }
  if (getQueryParam('reason') === 'role') {
    showToast('That page is for vendor accounts, so you’ve been brought to your organiser dashboard.', 'info', 6000);
  }
  if (getQueryParam('welcome') || getQueryParam('reason')) {
    history.replaceState(null, '', `organizer-dashboard.html${window.location.hash}`);
  }
}

// ============ Loading ============
async function loadDashboard() {
  const loadingTargets = ['upcomingEvents', 'pendingFeed', 'notificationsList', 'eventsTable', 'applicationsTable', 'vendorsTable', 'revenueTable', 'settingsFormBody'];
  if (!state.events.length) loadingTargets.forEach(id => renderLoading(document.getElementById(id)));

  try {
    const [events, applications, notifications, account, categories] = await Promise.all([
      getOrganizerEvents(),
      getOrganizerApplications(),
      getMyNotifications().catch(err => {
        console.warn('Failed to load notifications:', err);
        return [];
      }),
      getMyOrganizerProfile().catch(err => {
        console.warn('Failed to load organizer profile:', err);
        return { user: state.session, profile: null };
      }),
      getCategories().catch(err => {
        console.warn('Failed to load categories:', err);
        return [];
      })
    ]);
    Object.assign(state, {
      events: events || [],
      applications: applications || [],
      notifications: notifications || [],
      categories: categories || [],
      user: account?.user || state.session,
      profile: account?.profile || null
    });
    document.getElementById('dashboardError').innerHTML = '';
    renderAll();
  } catch (err) {
    console.error('Critical failure loading organizer dashboard:', err);
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
  renderEventsTable();
  renderApplications();
  renderVendors();
  renderRevenue();
  renderSettings();

  const pending = state.applications.filter(a => a.status === ApplicationStatus.PENDING).length;
  const navCount = document.getElementById('navPendingCount');
  navCount.hidden = pending === 0;
  navCount.textContent = pending;
}

// ============ Shared calculations ============
function eventById(id) {
  return state.events.find(e => e.id === id);
}

function approvedApplications() {
  return state.applications.filter(a => a.status === ApplicationStatus.APPROVED);
}

/** Stall fee revenue = stall fee × approved applications (cancelled events excluded). */
function revenueForEvent(event) {
  if (event.status === EventStatus.CANCELLED) return 0;
  const approved = approvedApplications().filter(a => a.eventId === event.id).length;
  return approved * Number(event.stallFee || 0);
}

function statCardHtml({ label, value, note, icon, tone }) {
  return `
    <div class="stat-card">
      <div class="stat-card-head">
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-icon tone-${tone}"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
      </div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <p class="stat-note">${escapeHtml(note)}</p>
    </div>`;
}

// ============ Overview ============
function renderOverview() {
  const openEvents = state.events.filter(e => e.status === EventStatus.OPEN);
  const drafts = state.events.filter(e => e.status === EventStatus.DRAFT).length;
  const pending = state.applications.filter(a => a.status === ApplicationStatus.PENDING);
  const trading = state.events.filter(e => [EventStatus.OPEN, EventStatus.CLOSED].includes(e.status) && isUpcoming(e));
  const booked = trading.reduce((sum, e) => sum + getBookedStalls(e), 0);
  const capacity = trading.reduce((sum, e) => sum + e.totalStalls, 0);
  const revenue = state.events.reduce((sum, e) => sum + revenueForEvent(e), 0);

  document.getElementById('overviewStats').innerHTML = [
    statCardHtml({ label: 'Open events', value: String(openEvents.length), note: `${drafts} draft${drafts === 1 ? '' : 's'} not published yet`, icon: 'fa-calendar-check', tone: 'primary' }),
    statCardHtml({ label: 'Pending applications', value: String(pending.length), note: 'Waiting for your decision', icon: 'fa-hourglass-half', tone: 'warning' }),
    statCardHtml({ label: 'Stalls booked', value: `${booked} / ${capacity}`, note: capacity ? `${Math.round((booked / capacity) * 100)}% of upcoming capacity` : 'No upcoming events', icon: 'fa-store', tone: 'success' }),
    statCardHtml({ label: 'Stall fee revenue', value: formatCurrency(revenue), note: 'From approved applications', icon: 'fa-wallet', tone: 'neutral' })
  ].join('');

  // Upcoming events
  const upcomingEl = document.getElementById('upcomingEvents');
  const upcoming = state.events
    .filter(e => [EventStatus.OPEN, EventStatus.CLOSED].includes(e.status) && isUpcoming(e))
    .slice(0, 5);
  if (!upcoming.length) {
    renderEmpty(upcomingEl, { icon: 'fa-calendar-plus', title: 'No upcoming events', message: 'Create an event to start receiving applications.', action: { label: 'Create event', onClick: () => openEventModal(null), icon: 'fa-plus' } });
  } else {
    upcomingEl.innerHTML = `<div class="feed">${upcoming.map(e => `
      <div class="feed-item">
        <div class="feed-body">
          <h3><a href="event-details.html?id=${e.id}">${escapeHtml(e.title)}</a></h3>
          <p>${escapeHtml(formatEventDates(e))} · ${escapeHtml(e.city)} · ${escapeHtml(formatCurrency(e.stallFee))}</p>
        </div>
        <div class="feed-occupancy">${occupancyBarHtml(e)}${getBookedStalls(e)} of ${e.totalStalls} booked</div>
        ${eventStatusBadge(e)}
      </div>`).join('')}</div>`;
  }

  // Applications waiting for review
  const feedEl = document.getElementById('pendingFeed');
  if (!pending.length) {
    renderEmpty(feedEl, { icon: 'fa-circle-check', title: 'All caught up', message: 'New applications will appear here.' });
  } else {
    feedEl.innerHTML = `<div class="feed">${pending.slice(0, 5).map(a => `
      <div class="feed-item">
        ${avatarHtml(a.businessName, a.vendor?.profile?.profileImageUrl)}
        <div class="feed-body">
          <h3>${escapeHtml(a.businessName)}</h3>
          <p>${escapeHtml(a.event ? a.event.title : 'Event')} · ${escapeHtml(timeAgo(a.appliedAt))}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-review-id="${a.id}">Review</button>
      </div>`).join('')}</div>`;
  }

  renderNotificationsPanel();
}

function renderNotificationsPanel() {
  const listEl = document.getElementById('notificationsList');
  if (!state.notifications.length) {
    renderEmpty(listEl, { icon: 'fa-bell-slash', title: 'No notifications', message: 'You’ll be notified when vendors apply for your events.' });
    return;
  }
  listEl.innerHTML = `<div class="notif-panel-list">${state.notifications.map(n => notificationItemHtml(n, state.session.role)).join('')}</div>`;
}

// ============ Events ============
function renderEventsTable() {
  const container = document.getElementById('eventsTable');
  const events = state.eventsStatusFilter === 'all'
    ? state.events
    : state.events.filter(e => e.status === state.eventsStatusFilter);

  if (!state.events.length) {
    renderEmpty(container, { icon: 'fa-calendar-plus', title: 'You haven’t created any events yet', message: 'Create your first market or festival to start receiving vendor applications.', action: { label: 'Create your first event', onClick: () => openEventModal(null), icon: 'fa-plus' } });
    return;
  }
  if (!events.length) {
    renderEmpty(container, { icon: 'fa-filter', title: 'No events with this status', action: { label: 'Show all events', onClick: () => { document.getElementById('eventsStatusFilter').value = 'all'; state.eventsStatusFilter = 'all'; renderEventsTable(); } } });
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th scope="col">Event</th><th scope="col">Date</th><th scope="col">Location</th>
          <th scope="col">Stalls</th><th scope="col">Fee</th><th scope="col">Status</th><th scope="col">Actions</th>
        </tr></thead>
        <tbody>${events.map(e => {
          const canEdit = e.status !== EventStatus.CANCELLED;
          const canCancel = ![EventStatus.CANCELLED, EventStatus.COMPLETED].includes(e.status);
          const organizerNote = isAdmin() && e.organizer ? ` · ${escapeHtml(e.organizer.profile?.organizationName || e.organizer.fullName)}` : '';
          return `
          <tr>
            <td><span class="cell-title">${escapeHtml(e.title)}</span><span class="cell-sub">${escapeHtml(e.category ? e.category.name : 'Uncategorised')}${organizerNote}</span></td>
            <td class="nowrap">${escapeHtml(formatEventDates(e))}</td>
            <td>${escapeHtml(e.city)}<span class="cell-sub">${escapeHtml(e.province)}</span></td>
            <td class="cell-occupancy">${occupancyBarHtml(e)}<span class="cell-sub">${getBookedStalls(e)} of ${e.totalStalls} booked</span></td>
            <td class="nowrap">${escapeHtml(formatCurrency(e.stallFee))}</td>
            <td>${eventStatusBadge(e)}</td>
            <td><div class="cell-actions">
              <a class="btn btn-secondary btn-sm" href="event-details.html?id=${e.id}" title="View event page" aria-label="View ${escapeHtml(e.title)}"><i class="fa-solid fa-eye" aria-hidden="true"></i></a>
              ${canEdit ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-event="${e.id}" title="Edit event" aria-label="Edit ${escapeHtml(e.title)}"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>` : ''}
              ${canCancel ? `<button type="button" class="btn btn-danger btn-sm" data-cancel-event="${e.id}" title="Cancel event" aria-label="Cancel ${escapeHtml(e.title)}"><i class="fa-solid fa-ban" aria-hidden="true"></i></button>` : ''}
            </div></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============ Applications ============
function renderApplications() {
  // Event filter options
  const eventSelect = document.getElementById('applicationsEventFilter');
  const eventsWithApplications = state.events.filter(e => state.applications.some(a => a.eventId === e.id));
  fillSelect(eventSelect, [{ value: 'all', label: 'All events' }, ...eventsWithApplications.map(e => ({ value: String(e.id), label: e.title }))]);
  eventSelect.value = eventsWithApplications.some(e => String(e.id) === state.applicationEventFilter) ? state.applicationEventFilter : 'all';
  state.applicationEventFilter = eventSelect.value;

  const forEvent = state.applicationEventFilter === 'all'
    ? state.applications
    : state.applications.filter(a => String(a.eventId) === state.applicationEventFilter);

  // Status pills with counts
  const statuses = ['all', ...Object.values(ApplicationStatus)];
  document.getElementById('applicationStatusTabs').innerHTML = statuses.map(status => {
    const count = status === 'all' ? forEvent.length : forEvent.filter(a => a.status === status).length;
    const label = status === 'all' ? 'All' : APPLICATION_STATUS_UI[status].label;
    const active = status === state.applicationStatusFilter;
    return `<button type="button" class="pill ${active ? 'is-active' : ''}" data-app-status="${status}" aria-pressed="${active}">${label} <span class="pill-count">${count}</span></button>`;
  }).join('');

  const container = document.getElementById('applicationsTable');
  const statusOrder = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3 };
  const rows = forEvent
    .filter(a => state.applicationStatusFilter === 'all' || a.status === state.applicationStatusFilter)
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.appliedAt.localeCompare(a.appliedAt));

  if (!rows.length) {
    renderEmpty(container, {
      icon: 'fa-clipboard-list',
      title: state.applications.length ? 'No applications match this filter' : 'No applications yet',
      message: state.applications.length ? 'Try another status or event.' : 'When vendors apply for your events, they’ll appear here.'
    });
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th scope="col">Vendor</th><th scope="col">Event</th><th scope="col">What they sell</th>
          <th scope="col">Applied</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Action</span></th>
        </tr></thead>
        <tbody>${rows.map(a => `
          <tr>
            <td><span class="cell-title">${escapeHtml(a.businessName)}</span><span class="cell-sub">${escapeHtml(a.vendor ? a.vendor.fullName : '')}</span></td>
            <td><span class="cell-title">${escapeHtml(a.event ? a.event.title : '—')}</span><span class="cell-sub">${a.event ? escapeHtml(formatEventDates(a.event)) : ''}</span></td>
            <td><span class="truncate" title="${escapeHtml(a.productsDescription)}">${escapeHtml(a.productsDescription)}</span></td>
            <td class="nowrap">${escapeHtml(formatDate(a.appliedAt.slice(0, 10)))}</td>
            <td>${applicationStatusBadge(a.status)}</td>
            <td><button type="button" class="btn ${a.status === ApplicationStatus.PENDING ? 'btn-primary' : 'btn-secondary'} btn-sm" data-review-id="${a.id}">
              ${a.status === ApplicationStatus.PENDING ? 'Review' : 'View'}</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openReviewModal(applicationId) {
  const a = state.applications.find(app => app.id === Number(applicationId));
  if (!a) return;
  const event = eventById(a.eventId) || a.event;
  const isPending = a.status === ApplicationStatus.PENDING;
  const full = event && event.availableStalls <= 0;

  document.getElementById('reviewModalTitle').textContent = a.businessName;
  document.getElementById('reviewModalSubtitle').textContent = `Application for ${event ? event.title : 'an event'}`;

  const vendor = a.vendor || {};
  document.getElementById('reviewModalBody').innerHTML = `
    <div>${applicationStatusBadge(a.status)}</div>
    <dl class="detail-list">
      <dt>Contact person</dt><dd>${escapeHtml(vendor.fullName || '—')}</dd>
      <dt>Email</dt><dd>${vendor.email ? `<a href="mailto:${escapeHtml(vendor.email)}">${escapeHtml(vendor.email)}</a>` : '—'}</dd>
      <dt>Phone</dt><dd>${escapeHtml(vendor.phone || '—')}</dd>
      <dt>Category</dt><dd>${escapeHtml(vendor.profile?.category || '—')}</dd>
      <dt>What they sell</dt><dd>${escapeHtml(a.productsDescription)}</dd>
      <dt>Special requirements</dt><dd>${escapeHtml(a.specialRequirements || 'None')}</dd>
      <dt>Applied</dt><dd>${escapeHtml(formatDateTime(a.appliedAt))}</dd>
      ${a.reviewedAt ? `<dt>Reviewed</dt><dd>${escapeHtml(formatDateTime(a.reviewedAt))}</dd>` : ''}
      ${!isPending && a.reviewNotes ? `<dt>Your notes</dt><dd>${escapeHtml(a.reviewNotes)}</dd>` : ''}
    </dl>
    ${isPending && event ? `
      <div class="alert ${full ? 'alert-warning' : 'alert-info'}">
        <i class="fa-solid ${full ? 'fa-triangle-exclamation' : 'fa-store'}" aria-hidden="true"></i>
        <span>${full
          ? 'This event is fully booked. Increase the total stalls on the event, or reject this application.'
          : `${event.availableStalls} of ${event.totalStalls} stalls still available. Approving uses one stall.`}</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="reviewNotes">Note to the vendor <span class="text-muted">(optional)</span></label>
        <textarea class="form-control" id="reviewNotes" rows="3" maxlength="500" placeholder="e.g. You're in stall C4 near the entrance."></textarea>
      </div>` : ''}`;

  document.getElementById('reviewModalFooter').innerHTML = isPending
    ? `<button type="button" class="btn btn-danger" data-decision="REJECTED" data-application-id="${a.id}"><i class="fa-solid fa-xmark" aria-hidden="true"></i> Reject</button>
       <button type="button" class="btn btn-success" data-decision="APPROVED" data-application-id="${a.id}" ${full ? 'disabled' : ''}><i class="fa-solid fa-check" aria-hidden="true"></i> Approve</button>`
    : '<button type="button" class="btn btn-secondary" data-close-modal>Close</button>';

  openModal('reviewModal');
}

async function submitDecision(button) {
  const decision = button.dataset.decision;
  const notes = document.getElementById('reviewNotes')?.value || '';
  document.querySelectorAll('[data-decision]').forEach(b => { b.disabled = true; });
  setButtonLoading(button, true, decision === ApplicationStatus.APPROVED ? 'Approving…' : 'Rejecting…');
  try {
    const updated = await reviewApplication(button.dataset.applicationId, decision, notes);
    closeModal('reviewModal');
    showToast(`${updated.businessName} ${decision === ApplicationStatus.APPROVED ? 'approved — one stall allocated' : 'rejected'}. The vendor has been notified.`, 'success');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
    setButtonLoading(button, false);
    document.querySelectorAll('[data-decision]').forEach(b => { b.disabled = false; });
  }
}

// ============ Vendors ============
/** One row per vendor with at least one approved application at these events. */
function approvedVendorRows() {
  const byVendor = new Map();
  approvedApplications().forEach(a => {
    if (!a.vendor) return;
    if (!byVendor.has(a.vendor.id)) byVendor.set(a.vendor.id, { vendor: a.vendor, events: [] });
    byVendor.get(a.vendor.id).events.push(eventById(a.eventId) || a.event);
  });
  return [...byVendor.values()].sort((x, y) =>
    (x.vendor.profile?.businessName || x.vendor.fullName).localeCompare(y.vendor.profile?.businessName || y.vendor.fullName));
}

function renderVendors() {
  const container = document.getElementById('vendorsTable');
  const rows = approvedVendorRows();
  document.getElementById('exportVendorsBtn').disabled = rows.length === 0;

  if (!rows.length) {
    renderEmpty(container, { icon: 'fa-store', title: 'No approved vendors yet', message: 'Vendors appear here once you approve their applications.', action: { label: 'Review applications', href: '#applications' } });
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th scope="col">Business</th><th scope="col">Contact person</th><th scope="col">Phone &amp; email</th>
          <th scope="col">Location</th><th scope="col">Approved for</th>
        </tr></thead>
        <tbody>${rows.map(({ vendor, events }) => {
          const p = vendor.profile || {};
          return `
          <tr>
            <td><span class="cell-title">${escapeHtml(p.businessName || vendor.fullName)}</span><span class="cell-sub">${escapeHtml(p.category || 'No category')}</span></td>
            <td>${escapeHtml(vendor.fullName)}</td>
            <td><span class="nowrap">${escapeHtml(vendor.phone || p.phone || '—')}</span>
                <span class="cell-sub"><a href="mailto:${escapeHtml(vendor.email)}">${escapeHtml(vendor.email)}</a></span></td>
            <td>${escapeHtml([p.city, p.province].filter(Boolean).join(', ') || '—')}</td>
            <td><span class="cell-title">${events.length} event${events.length === 1 ? '' : 's'}</span>
                <span class="cell-sub">${escapeHtml(events.map(e => e.title).join(', '))}</span></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

function exportVendorsCsv() {
  const rows = approvedVendorRows().map(({ vendor, events }) => {
    const p = vendor.profile || {};
    return [p.businessName || '', vendor.fullName, vendor.email, vendor.phone || p.phone || '', p.category || '', p.city || '', p.province || '', events.map(e => e.title).join('; ')];
  });
  downloadCsv(`vendorlink-vendors-${todayIsoDate()}.csv`,
    [['Business name', 'Contact person', 'Email', 'Phone', 'Category', 'City', 'Province', 'Approved events'], ...rows]);
  showToast(`Exported ${rows.length} vendor${rows.length === 1 ? '' : 's'} to CSV.`, 'success');
}

// ============ Revenue ============
function renderRevenue() {
  const counted = state.events.filter(e => ![EventStatus.DRAFT, EventStatus.CANCELLED].includes(e.status));
  const totalRevenue = counted.reduce((sum, e) => sum + revenueForEvent(e), 0);
  const approvedCount = approvedApplications().filter(a => counted.some(e => e.id === a.eventId)).length;
  const avgOccupancy = counted.length ? Math.round(counted.reduce((sum, e) => sum + getOccupancyPercent(e), 0) / counted.length) : 0;
  const reviewed = state.applications.filter(a => [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(a.status)).length;
  const approvalRate = reviewed ? Math.round((approvedApplications().length / reviewed) * 100) : 0;

  document.getElementById('revenueStats').innerHTML = [
    statCardHtml({ label: 'Stall fee revenue', value: formatCurrency(totalRevenue), note: `Across ${counted.length} event${counted.length === 1 ? '' : 's'}`, icon: 'fa-wallet', tone: 'success' }),
    statCardHtml({ label: 'Stalls allocated', value: String(approvedCount), note: 'Approved applications', icon: 'fa-store', tone: 'primary' }),
    statCardHtml({ label: 'Average occupancy', value: `${avgOccupancy}%`, note: 'Booked ÷ total stalls', icon: 'fa-chart-simple', tone: 'neutral' }),
    statCardHtml({ label: 'Applications reviewed', value: String(reviewed), note: `${approvalRate}% approved`, icon: 'fa-clipboard-check', tone: 'warning' })
  ].join('');

  const container = document.getElementById('revenueTable');
  if (!counted.length) {
    renderEmpty(container, { icon: 'fa-chart-line', title: 'No revenue yet', message: 'Publish an event and approve vendors to see stall fee totals here.' });
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th scope="col">Event</th><th scope="col">Status</th><th scope="col">Stall fee</th>
          <th scope="col">Approved stalls</th><th scope="col">Revenue</th><th scope="col">Occupancy</th>
        </tr></thead>
        <tbody>${counted.map(e => {
          const approved = approvedApplications().filter(a => a.eventId === e.id).length;
          return `
          <tr>
            <td><span class="cell-title">${escapeHtml(e.title)}</span><span class="cell-sub">${escapeHtml(formatEventDates(e))}</span></td>
            <td>${eventStatusBadge(e)}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(e.stallFee))}</td>
            <td>${approved} of ${e.totalStalls}</td>
            <td class="nowrap"><strong>${escapeHtml(formatCurrency(revenueForEvent(e)))}</strong></td>
            <td class="cell-occupancy">${occupancyBarHtml(e)}<span class="cell-sub">${getOccupancyPercent(e)}%</span></td>
          </tr>`;
        }).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="3">Total</td><td>${approvedCount}</td><td class="nowrap">${escapeHtml(formatCurrency(totalRevenue))}</td><td>${avgOccupancy}% avg.</td>
        </tr></tfoot>
      </table>
    </div>`;
}

// ============ Settings ============
function renderSettings() {
  const body = document.getElementById('settingsFormBody');
  const user = state.user || {};
  const p = state.profile || {};

  body.innerHTML = `
    <div class="alert alert-error" id="settingsAlert" hidden></div>
    ${isAdmin() ? `
      <div class="alert alert-info"><i class="fa-solid fa-user-shield" aria-hidden="true"></i>
        <span>Admin accounts don't have an organisation profile. You can update your name and phone below.</span></div>` : `
    <div class="form-section">
      <h3>Organisation profile</h3>
      <div class="form-stack">
        <div class="form-group">
          <label class="form-label" for="setOrgName">Organisation name <span class="required">*</span></label>
          <input class="form-control" id="setOrgName" name="organizationName" maxlength="100">
        </div>
        <div class="form-group">
          <label class="form-label" for="setOrgDescription">Description</label>
          <textarea class="form-control" id="setOrgDescription" name="description" rows="3" maxlength="600" placeholder="Tell vendors about the markets you run"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="setWebsite">Website</label>
            <input class="form-control" type="url" id="setWebsite" name="website" placeholder="https://" maxlength="200">
          </div>
          <div class="form-group">
            <label class="form-label" for="setAddress">Office address</label>
            <input class="form-control" id="setAddress" name="address" maxlength="160">
          </div>
        </div>
      </div>
    </div>`}
    <div class="form-section">
      <h3>Your account</h3>
      <div class="form-stack">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="setFullName">Full name <span class="required">*</span></label>
            <input class="form-control" id="setFullName" name="fullName" maxlength="80" autocomplete="name">
          </div>
          <div class="form-group">
            <label class="form-label" for="setPhone">Phone</label>
            <input class="form-control" type="tel" id="setPhone" name="phone" maxlength="20" autocomplete="tel">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="setEmail">Email</label>
          <input class="form-control" id="setEmail" readonly>
          <p class="form-hint">Changing your login email will be handled by Supabase Auth.</p>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary" id="settingsSubmitBtn"><i class="fa-solid fa-check" aria-hidden="true"></i> Save changes</button>
    </div>`;

  // Values are set with .value (never inserted as HTML)
  const form = document.getElementById('settingsForm');
  if (!isAdmin()) {
    form.elements.organizationName.value = p.organizationName || '';
    form.elements.description.value = p.description || '';
    form.elements.website.value = p.website || '';
    form.elements.address.value = p.address || '';
  }
  form.elements.fullName.value = user.fullName || '';
  form.elements.phone.value = user.phone || '';
  document.getElementById('setEmail').value = user.email || '';

  renderSettingsPreview();
}

function renderSettingsPreview() {
  const p = state.profile || {};
  const name = isAdmin() ? (state.user?.fullName || 'Admin') : (p.organizationName || 'Your organisation');
  document.getElementById('settingsPreview').innerHTML = `
    <span class="avatar" aria-hidden="true">${escapeHtml(getInitials(name))}</span>
    <h3>${escapeHtml(name)}</h3>
    <p class="text-muted text-small">${escapeHtml(isAdmin() ? 'VendorLink administrator' : (p.description || 'Add a description so vendors know who you are.'))}</p>
    ${isAdmin() ? '' : '<p class="text-small text-muted mt-8">This is how vendors see you on your event pages.</p>'}`;
}

async function saveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const button = document.getElementById('settingsSubmitBtn');
  const alert = document.getElementById('settingsAlert');
  alert.hidden = true;

  const data = {
    fullName: form.elements.fullName.value,
    phone: form.elements.phone.value,
    organizationName: isAdmin() ? '' : form.elements.organizationName.value,
    description: isAdmin() ? '' : form.elements.description.value,
    website: isAdmin() ? '' : form.elements.website.value,
    address: isAdmin() ? '' : form.elements.address.value
  };

  clearFieldErrors(form);
  setButtonLoading(button, true, 'Saving…');
  try {
    const result = await updateMyOrganizerProfile(data);
    state.user = result.user;
    state.profile = result.profile;
    renderSettingsPreview();
    mountUserMenu(document.getElementById('topbarUserMenu'));
    showToast('Your settings have been saved.', 'success');
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

// ============ Create / edit event ============
function openEventModal(eventId) {
  const event = eventId ? eventById(Number(eventId)) : null;
  state.editingEventId = event ? event.id : null;

  const form = document.getElementById('eventForm');
  form.reset();
  clearFieldErrors(form);
  document.getElementById('eventFormAlert').hidden = true;
  document.getElementById('eventModalTitle').textContent = event ? 'Edit event' : 'New event';
  document.getElementById('eventModalSubtitle').textContent = event ? event.title : 'Fields marked * are required.';

  fillSelect(form.elements.categoryId, state.categories.map(c => ({ value: String(c.id), label: c.name })), { placeholder: 'No category' });
  fillSelect(form.elements.province, PROVINCES.map(p => ({ value: p, label: p })), { placeholder: 'Choose a province' });

  const statuses = event
    ? [EventStatus.DRAFT, EventStatus.OPEN, EventStatus.CLOSED, EventStatus.COMPLETED]
    : [EventStatus.DRAFT, EventStatus.OPEN];
  const statusLabels = { DRAFT: 'Draft (only you can see it)', OPEN: 'Open for applications', CLOSED: 'Applications closed', COMPLETED: 'Completed' };
  fillSelect(form.elements.status, statuses.map(s => ({ value: s, label: statusLabels[s] })));

  // New events can't start in the past
  form.elements.date.min = event ? '' : todayIsoDate();

  if (event) {
    form.elements.title.value = event.title;
    form.elements.categoryId.value = event.categoryId ? String(event.categoryId) : '';
    form.elements.status.value = event.status;
    form.elements.description.value = event.description;
    form.elements.date.value = event.date;
    form.elements.endDate.value = event.endDate || '';
    form.elements.time.value = event.time || '';
    form.elements.expectedVisitors.value = event.expectedVisitors || '';
    form.elements.location.value = event.location;
    form.elements.city.value = event.city;
    form.elements.province.value = event.province;
    form.elements.stallFee.value = event.stallFee;
    form.elements.totalStalls.value = event.totalStalls;
    form.elements.requirements.value = event.requirements || '';
    form.elements.bannerImageUrl.value = event.bannerImageUrl || '';
    updateBannerPreview(event.bannerImageUrl || '');
    const booked = getBookedStalls(event);
    document.getElementById('evStallsHint').textContent = `${booked} already booked, so available stalls = total − ${booked}.`;
  } else {
    form.elements.status.value = EventStatus.DRAFT;
    form.elements.bannerImageUrl.value = '';
    updateBannerPreview('');
    document.getElementById('evStallsHint').textContent = 'Available stalls start at this number.';
  }

  openModal('eventModal');
}

async function saveEvent(e) {
  e.preventDefault();
  const form = e.target;
  const button = document.getElementById('eventSubmitBtn');
  const alert = document.getElementById('eventFormAlert');
  alert.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  const existing = state.editingEventId ? eventById(state.editingEventId) : null;
  const errors = validateEventData(data, existing ? getBookedStalls(existing) : 0);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);

  setButtonLoading(button, true, 'Saving…');
  try {
    const saved = existing ? await updateEvent(existing.id, data) : await createEvent(data);
    closeModal('eventModal');
    showToast(existing ? `“${saved.title}” was updated.` : `“${saved.title}” was created as ${saved.status === EventStatus.OPEN ? 'an open event' : 'a draft'}.`, 'success');
    await loadDashboard();
    if (!existing) window.location.hash = 'events';
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

async function confirmCancelEvent(eventId) {
  const event = eventById(Number(eventId));
  if (!event) return;
  const affected = state.applications.filter(a => a.eventId === event.id && [ApplicationStatus.PENDING, ApplicationStatus.APPROVED].includes(a.status)).length;
  const ok = await confirmDialog({
    title: `Cancel “${event.title}”?`,
    message: affected
      ? `${affected} vendor${affected === 1 ? '' : 's'} with pending or approved applications will be notified. Pending applications will be cancelled. This can’t be undone.`
      : 'The event will be marked as cancelled and hidden from vendors. This can’t be undone.',
    confirmText: 'Cancel event',
    cancelText: 'Keep event',
    danger: true
  });
  if (!ok) return;
  try {
    await cancelEvent(event.id);
    showToast(`“${event.title}” has been cancelled.`, 'success');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============ Listeners ============
function setupListeners() {
  document.getElementById('newEventBtn').addEventListener('click', () => openEventModal(null));
  document.getElementById('eventForm').addEventListener('submit', saveEvent);
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  document.getElementById('exportVendorsBtn').addEventListener('click', exportVendorsCsv);

  document.getElementById('eventsStatusFilter').addEventListener('change', (e) => {
    state.eventsStatusFilter = e.target.value;
    renderEventsTable();
  });

  document.getElementById('applicationsEventFilter').addEventListener('change', (e) => {
    state.applicationEventFilter = e.target.value;
    renderApplications();
  });

  document.getElementById('markAllReadBtn').addEventListener('click', async () => {
    await markAllNotificationsRead();
    state.notifications = await getMyNotifications();
    renderNotificationsPanel();
    document.dispatchEvent(new CustomEvent('notifications:changed'));
  });

  // The bell dropdown marks things as read too: keep the overview panel in sync
  document.addEventListener('notifications:changed', async (e) => {
    if (e.detail === 'bell') {
      state.notifications = await getMyNotifications();
      renderNotificationsPanel();
    }
  });

  // One click handler for all the buttons that are drawn by JavaScript
  document.addEventListener('click', async (e) => {
    const review = e.target.closest('[data-review-id]');
    if (review) return openReviewModal(review.dataset.reviewId);

    const decision = e.target.closest('[data-decision]');
    if (decision) return submitDecision(decision);

    const edit = e.target.closest('[data-edit-event]');
    if (edit) return openEventModal(edit.dataset.editEvent);

    const cancel = e.target.closest('[data-cancel-event]');
    if (cancel) return confirmCancelEvent(cancel.dataset.cancelEvent);

    const statusPill = e.target.closest('[data-app-status]');
    if (statusPill) {
      state.applicationStatusFilter = statusPill.dataset.appStatus;
      return renderApplications();
    }

    // Notifications in the overview panel: mark as read, then follow the link
    const notification = e.target.closest('#notificationsList [data-notification-id]');
    if (notification) {
      e.preventDefault();
      await markNotificationRead(notification.dataset.notificationId);
      state.notifications = await getMyNotifications();
      renderNotificationsPanel();
      document.dispatchEvent(new CustomEvent('notifications:changed'));
      window.location.href = notification.getAttribute('href');
    }
  });

  // Event banner image upload handlers
  const bannerFile = document.getElementById('evBannerFile');
  const dropZone = document.getElementById('evBannerDropZone');
  const removeBtn = document.getElementById('evRemoveBannerBtn');
  const toggleUrlBtn = document.getElementById('evToggleUrlInput');
  const directUrlInput = document.getElementById('evBannerUrlDirect');

  if (bannerFile) {
    bannerFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleBannerFileSelected(e.target.files[0]);
      }
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('is-dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('is-dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleBannerFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bannerInput = document.getElementById('evBanner');
      if (bannerInput) bannerInput.value = '';
      updateBannerPreview('');
    });
  }

  if (toggleUrlBtn && directUrlInput) {
    toggleUrlBtn.addEventListener('click', () => {
      const isHidden = directUrlInput.style.display === 'none';
      directUrlInput.style.display = isHidden ? 'block' : 'none';
      if (isHidden) directUrlInput.focus();
    });

    directUrlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const bannerInput = document.getElementById('evBanner');
      if (bannerInput) bannerInput.value = val;
      updateBannerPreview(val);
    });
  }
}

function updateBannerPreview(url) {
  const previewBox = document.getElementById('evBannerPreviewBox');
  const previewImg = document.getElementById('evBannerPreviewImg');
  const prompt = document.getElementById('evUploadPrompt');
  const fileInput = document.getElementById('evBannerFile');
  const directInput = document.getElementById('evBannerUrlDirect');

  if (url && String(url).trim()) {
    const cleanUrl = String(url).trim();
    if (previewImg) previewImg.src = cleanUrl;
    if (previewBox) previewBox.style.display = 'block';
    if (prompt) prompt.style.display = 'none';
    if (directInput) directInput.value = cleanUrl;
  } else {
    if (previewImg) previewImg.src = '';
    if (previewBox) previewBox.style.display = 'none';
    if (prompt) prompt.style.display = 'flex';
    if (fileInput) fileInput.value = '';
    if (directInput) directInput.value = '';
  }
}

async function handleBannerFileSelected(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size exceeds 5MB limit', 'error');
    return;
  }

  // Instant local visual preview
  const localUrl = URL.createObjectURL(file);
  updateBannerPreview(localUrl);

  try {
    showToast('Uploading image…', 'info');
    const result = typeof uploadEventImage === 'function' 
      ? await uploadEventImage(file)
      : { bannerImageUrl: localUrl };
    const uploadedUrl = result.bannerImageUrl || result.imageUrl || localUrl;
    const bannerInput = document.getElementById('evBanner');
    if (bannerInput) bannerInput.value = uploadedUrl;
    updateBannerPreview(uploadedUrl);
    showToast('Image uploaded successfully!', 'success');
  } catch (err) {
    console.error('Image upload failed:', err);
    showToast(`Upload failed: ${err.message}. You can still paste an image link.`, 'error');
  }
}
