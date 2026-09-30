/**
 * Shared layout: demo banner, navbar, footer, notifications bell and user menu.
 * ---------------------------------------------------------------------------
 * The navbar and footer are defined ONCE here and inserted into every page:
 *   <header class="site-header" id="siteHeader"></header>
 *   <footer class="site-footer" id="siteFooter"></footer>
 * <body data-page="browse"> tells the navbar which link to highlight.
 * Dashboard pages use data-layout="dashboard" and get the bell + user menu
 * inside their own top bar instead of the full navbar.
 */

const NAV_LINKS = [
  { page: 'home', href: 'index.html', label: 'Home', icon: 'fa-house' },
  { page: 'browse', href: 'browse-events.html', label: 'Browse Events', icon: 'fa-magnifying-glass' },
  { page: 'pricing', href: 'pricing.html', label: 'Pricing', icon: 'fa-tags' },
  { page: 'about', href: 'about.html', label: 'About Us', icon: 'fa-circle-info' }
];

const ROLE_LABELS = { VENDOR: 'Vendor', ORGANIZER: 'Organizer', ADMIN: 'Admin' };

// ---------- Demo banner ----------
function renderDemoBanner() {
  if (!APP_CONFIG.DEMO_MODE || document.querySelector('.demo-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'demo-banner';
  banner.innerHTML = `
    <div class="container">
      <span><i class="fa-solid fa-flask" aria-hidden="true"></i>
        <strong>Demo mode:</strong> sample data only<span class="demo-extra">, not connected to Supabase. Changes last until you close this tab</span>.</span>
      <button type="button" id="resetDemoBtn">Reset demo data</button>
    </div>`;
  document.body.prepend(banner);
  banner.querySelector('#resetDemoBtn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset demo data?',
      message: 'This restores the original sample events and applications and logs you out.',
      confirmText: 'Reset demo'
    });
    if (!ok) return;
    resetDemoDb();
    await signOut();
    window.location.href = 'index.html';
  });
}

// ---------- Navbar ----------
function renderSiteHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const activePage = document.body.dataset.page;
  const session = getSession();

  const desktopLinks = NAV_LINKS.map(link => `
    <a href="${link.href}" class="${link.page === activePage ? 'is-active' : ''}"
       ${link.page === activePage ? 'aria-current="page"' : ''}>${link.label}</a>`).join('');

  const mobileLinks = NAV_LINKS.map(link => `
    <a href="${link.href}" class="${link.page === activePage ? 'is-active' : ''}">
      <i class="fa-solid ${link.icon}" aria-hidden="true"></i> ${link.label}</a>`).join('');

  let desktopActions;
  let mobileActions;

  if (session) {
    desktopActions = `
      <div id="navNotifications"></div>
      <a href="${getDashboardUrl(session.role)}" class="btn btn-primary btn-sm nav-desktop-only">
        <i class="fa-solid fa-gauge" aria-hidden="true"></i> Dashboard</a>
      <div class="nav-desktop-only" id="navUserMenu"></div>`;
    mobileActions = `
      <a href="${getDashboardUrl(session.role)}"><i class="fa-solid fa-gauge" aria-hidden="true"></i> Dashboard</a>
      <a href="${getProfileUrl(session.role)}"><i class="fa-solid fa-user" aria-hidden="true"></i> Profile</a>
      <a href="${notificationsPageUrl(session.role)}"><i class="fa-solid fa-bell" aria-hidden="true"></i> Notifications</a>
      <button type="button" class="mobile-link" data-action="logout"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Log out</button>`;
  } else {
    desktopActions = `
      <a href="login.html" class="btn btn-ghost nav-desktop-only ${activePage === 'login' ? 'is-active' : ''}">Login</a>
      <a href="register.html" class="btn btn-primary nav-desktop-only">Register</a>`;
    mobileActions = `
      <a href="login.html" class="btn btn-secondary">Login</a>
      <a href="register.html" class="btn btn-primary">Register</a>`;
  }

  header.innerHTML = `
    <div class="container navbar">
      <a href="index.html" class="logo" aria-label="VendorLink home">Vendor<span>Link</span></a>
      <nav class="nav-links" aria-label="Main">${desktopLinks}</nav>
      <div class="nav-actions">
        ${desktopActions}
        <button type="button" class="icon-button nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu">
          <i class="fa-solid fa-bars" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <div class="container">
        <nav aria-label="Main (mobile)">${mobileLinks}</nav>
        <div class="mobile-auth">${mobileActions}</div>
      </div>
    </div>`;

  // Mobile menu toggle
  const toggle = header.querySelector('#navToggle');
  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    toggle.innerHTML = `<i class="fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}" aria-hidden="true"></i>`;
  });

  // Close the mobile menu if the window becomes wide again
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
    if (e.matches && header.classList.contains('menu-open')) toggle.click();
  });

  header.querySelectorAll('[data-action="logout"]').forEach(btn => btn.addEventListener('click', logOutAndLeave));

  if (session) {
    mountNotificationBell(header.querySelector('#navNotifications'));
    mountUserMenu(header.querySelector('#navUserMenu'));
  }
}

function notificationsPageUrl(role) {
  return role === Role.VENDOR ? 'vendor-dashboard.html#notifications' : 'organizer-dashboard.html#overview';
}

async function logOutAndLeave() {
  await signOut();
  window.location.href = 'index.html?signedout=1';
}

// ---------- User menu (avatar + dropdown) ----------
function mountUserMenu(container) {
  const session = getSession();
  if (!container || !session) return;
  container.innerHTML = `
    <div class="dropdown" data-dropdown>
      <button type="button" class="user-chip" data-dropdown-toggle aria-haspopup="true" aria-expanded="false">
        ${avatarHtml(session.fullName, '', 'avatar-sm')}
        <span class="user-chip-name">${escapeHtml(session.fullName)}</span>
        <i class="fa-solid fa-chevron-down text-muted text-small" aria-hidden="true"></i>
      </button>
      <div class="dropdown-menu">
        <div class="dropdown-header">
          <strong>${escapeHtml(session.fullName)}</strong>
          <span>${escapeHtml(session.email)}</span>
          <div class="mt-8"><span class="badge badge-primary">${escapeHtml(ROLE_LABELS[session.role])}</span></div>
        </div>
        <a class="dropdown-item" href="${getDashboardUrl(session.role)}"><i class="fa-solid fa-gauge" aria-hidden="true"></i> Dashboard</a>
        <a class="dropdown-item" href="${getProfileUrl(session.role)}"><i class="fa-solid fa-user" aria-hidden="true"></i> Profile</a>
        <a class="dropdown-item" href="browse-events.html"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Browse events</a>
        <button type="button" class="dropdown-item is-danger" data-action="logout"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Log out</button>
      </div>
    </div>`;
  container.querySelector('[data-action="logout"]').addEventListener('click', logOutAndLeave);
}

// ---------- Notifications bell ----------
function mountNotificationBell(container) {
  const session = getSession();
  if (!container || !session) return;
  container.innerHTML = `
    <div class="dropdown" data-dropdown>
      <button type="button" class="icon-button" data-dropdown-toggle aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
        <i class="fa-regular fa-bell" aria-hidden="true"></i>
        <span class="count-badge" hidden></span>
      </button>
      <div class="dropdown-menu notif-menu">
        <div class="notif-menu-head">
          <h3>Notifications</h3>
          <button type="button" class="link-button" data-action="mark-all-read">Mark all as read</button>
        </div>
        <div class="notif-list"></div>
        <div class="notif-menu-foot"><a href="${notificationsPageUrl(session.role)}">View all notifications</a></div>
      </div>
    </div>`;

  const list = container.querySelector('.notif-list');
  const badge = container.querySelector('.count-badge');
  const toggleButton = container.querySelector('[data-dropdown-toggle]');

  async function refresh() {
    renderLoading(list, 'Loading notifications…');
    try {
      const notifications = await getMyNotifications();
      const unread = notifications.filter(n => !n.isRead).length;
      badge.hidden = unread === 0;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      toggleButton.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');

      if (!notifications.length) {
        renderEmpty(list, { icon: 'fa-bell-slash', title: 'No notifications yet', message: 'Updates about your events and applications will appear here.', boxed: false });
        return;
      }
      list.innerHTML = notifications.slice(0, 8).map(n => notificationItemHtml(n, session.role)).join('');
    } catch (err) {
      renderError(list, { title: 'Unable to load notifications', message: err.message });
    }
  }

  list.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-notification-id]');
    if (!item) return;
    e.preventDefault();
    await markNotificationRead(item.dataset.notificationId);
    window.location.href = item.getAttribute('href');
  });

  container.querySelector('[data-action="mark-all-read"]').addEventListener('click', async () => {
    await markAllNotificationsRead();
    await refresh();
    document.dispatchEvent(new CustomEvent('notifications:changed', { detail: 'bell' }));
  });

  // Dashboards fire this event after they mark notifications as read
  document.addEventListener('notifications:changed', (e) => {
    if (e.detail !== 'bell') refresh();
  });

  refresh();
}

/** One notification row. Used by the bell dropdown and the dashboards. */
function notificationItemHtml(notification, role) {
  const style = getNotificationStyle(notification.type);
  return `
    <a class="notif-item ${notification.isRead ? '' : 'is-unread'}" href="${escapeHtml(getNotificationLink(notification, role))}"
       data-notification-id="${notification.id}">
      <span class="notif-icon tone-${style.tone}"><i class="fa-solid ${style.icon}" aria-hidden="true"></i></span>
      <span class="notif-body">
        <span class="notif-title">${escapeHtml(notification.title)}${notification.isRead ? '' : '<span class="visually-hidden"> (unread)</span>'}</span>
        <span class="notif-message">${escapeHtml(notification.message)}</span>
        <span class="notif-time">${escapeHtml(timeAgo(notification.createdAt))}</span>
      </span>
    </a>`;
}

// ---------- Dropdown behaviour (any element with data-dropdown) ----------
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-dropdown-toggle]');
  const openDropdowns = document.querySelectorAll('[data-dropdown].is-open');

  if (toggle) {
    const dropdown = toggle.closest('[data-dropdown]');
    const willOpen = !dropdown.classList.contains('is-open');
    openDropdowns.forEach(d => closeDropdown(d));
    if (willOpen) {
      dropdown.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    return;
  }
  // Click outside any open dropdown closes it
  openDropdowns.forEach(d => {
    if (!d.contains(e.target)) closeDropdown(d);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('[data-dropdown].is-open').forEach(closeDropdown);
});

function closeDropdown(dropdown) {
  dropdown.classList.remove('is-open');
  const toggle = dropdown.querySelector('[data-dropdown-toggle]');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

// ---------- Dashboard shell (used by both dashboards) ----------
/**
 * Sets up the parts every dashboard shares:
 *  - bell + user menu in the top bar
 *  - log out button in the sidebar
 *  - tabs driven by the URL hash (#overview, #events…), so links like
 *    "organizer-dashboard.html#settings" open the right tab and Back works.
 *
 * @param {Object} config
 * @param {Object} config.tabs        { tabName: { title, subtitle } }
 * @param {string} config.defaultTab
 * @param {Function} [config.onTabChange]  called with the tab name
 */
function setupDashboardShell({ tabs, defaultTab, onTabChange }) {
  mountNotificationBell(document.getElementById('topbarNotifications'));
  mountUserMenu(document.getElementById('topbarUserMenu'));
  document.querySelectorAll('[data-action="logout"]').forEach(btn => btn.addEventListener('click', logOutAndLeave));

  function showTab() {
    const requested = window.location.hash.replace('#', '');
    const tab = tabs[requested] ? requested : defaultTab;

    document.querySelectorAll('[data-view]').forEach(view => {
      view.hidden = view.dataset.view !== tab;
    });
    document.querySelectorAll('.dash-nav-item[data-tab]').forEach(link => {
      const active = link.dataset.tab === tab;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('pageHeading').textContent = tabs[tab].title;
    document.getElementById('pageSubheading').textContent = tabs[tab].subtitle;
    document.title = `${tabs[tab].title} | VendorLink`;
    if (onTabChange) onTabChange(tab);
  }

  window.addEventListener('hashchange', () => {
    showTab();
    window.scrollTo({ top: 0 });
  });
  showTab();
}

// ---------- Footer ----------
function renderSiteFooter() {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="logo">Vendor<span>Link</span></a>
        <p>Connecting informal traders, market vendors and event organisers across South Africa on one marketplace.</p>
      </div>
      <div>
        <h3>Platform</h3>
        <ul class="footer-links">
          <li><a href="index.html">Home</a></li>
          <li><a href="browse-events.html">Browse Events</a></li>
          <li><a href="pricing.html">Pricing</a></li>
          <li><a href="about.html">About Us</a></li>
        </ul>
      </div>
      <div>
        <h3>Support</h3>
        <ul class="footer-links">
          <li><a href="pricing.html#faq">FAQ</a></li>
          <li><a href="mailto:${APP_CONFIG.SUPPORT_EMAIL}">Contact us</a></li>
          <li><a href="legal.html#privacy">Privacy Policy</a></li>
          <li><a href="legal.html#terms">Terms &amp; Conditions</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; ${new Date().getFullYear()} VendorLink. All rights reserved.</p>
      <p>Made for South African markets and makers.</p>
    </div>`;
}

// ---------- Start-up ----------
document.addEventListener('DOMContentLoaded', () => {
  renderDemoBanner();
  renderSiteHeader();
  renderSiteFooter();

  if (getQueryParam('signedout')) {
    showToast('You have been logged out.', 'success');
    const url = new URL(window.location.href);
    url.searchParams.delete('signedout');
    history.replaceState(null, '', url.pathname.split('/').pop() + url.search + url.hash);
  }
});
