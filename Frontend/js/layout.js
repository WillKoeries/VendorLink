/**
 * Shared layout: demo banner, navbar, footer, notifications bell and user menu.
 * ---------------------------------------------------------------------------
 * Inserts navbar and footer reliably into every page.
 */

// ============================================================================
// Safe Session & Utility Fallbacks
// ============================================================================
function getSession() {
  try {
    const token = localStorage.getItem('vendorlink_token') || localStorage.getItem('token');
    const userStr = localStorage.getItem('vendorlink_user') || localStorage.getItem('user');
    if (!token || !userStr) return null;
    const user = JSON.parse(userStr);
    return {
      token,
      user,
      role: user.role,
      fullName: user.fullName || user.email || 'User',
      email: user.email || '',
      isOrganizer: user.role === 'ORGANIZER',
      isVendor: user.role === 'VENDOR',
      ...user
    };
  } catch (e) {
    return null;
  }
}
window.getSession = getSession;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

function getDashboardUrl(role) {
  return role === 'ORGANIZER' ? 'organizer-dashboard.html' : 'vendor-dashboard.html';
}

function getProfileUrl(role) {
  return role === 'ORGANIZER' ? 'organizer-dashboard.html#profile' : 'vendor-dashboard.html#profile';
}

function notificationsPageUrl(role) {
  return role === 'ORGANIZER' ? 'organizer-dashboard.html#overview' : 'vendor-dashboard.html#notifications';
}

function avatarHtml(name, url, className = 'avatar-sm') {
  const initial = (name && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';
  if (url) {
    return `<img src="${url}" class="avatar ${className}" alt="${escapeHtml(name)}">`;
  }
  return `<span class="avatar ${className}" style="display:inline-flex;align-items:center;justify-content:center;background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;font-weight:bold;">${initial}</span>`;
}

async function logOutAndLeave() {
  if (window.authService && typeof window.authService.logout === 'function') {
    window.authService.logout();
  } else {
    localStorage.removeItem('vendorlink_token');
    localStorage.removeItem('token');
    localStorage.removeItem('vendorlink_user');
    localStorage.removeItem('user');
    window.location.href = 'index.html?signedout=1';
  }
}

const NAV_LINKS = [
  { page: 'home', href: 'index.html', label: 'Home', icon: 'fa-house' },
  { page: 'browse', href: 'browse-events.html', label: 'Browse Events', icon: 'fa-magnifying-glass' },
  { page: 'pricing', href: 'pricing.html', label: 'Pricing', icon: 'fa-tags' },
  { page: 'about', href: 'about.html', label: 'About Us', icon: 'fa-circle-info' }
];

const ROLE_LABELS = { VENDOR: 'Vendor', ORGANIZER: 'Organizer', ADMIN: 'Admin' };

// ============================================================================
// Demo Banner (Safe execution without crashing if APP_CONFIG is missing)
// ============================================================================
function renderDemoBanner() {
  const isDemo = typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.DEMO_MODE;
  if (!isDemo || document.querySelector('.demo-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'demo-banner';
  banner.innerHTML = `
    <div class="container" style="background:#fef3c7;color:#92400e;padding:8px 16px;text-align:center;font-size:14px;">
      <span><strong>Demo mode:</strong> Sample data only.</span>
    </div>`;
  document.body.prepend(banner);
}

// ============================================================================
// Navbar Renderer
// ============================================================================
function renderSiteHeader() {
  // Look for any header container (#siteHeader, #site-header, or tag <header>)
  const header = document.getElementById('siteHeader')
      || document.getElementById('site-header')
      || document.querySelector('header.site-header')
      || document.querySelector('header');

  if (!header) return;

  const activePage = document.body ? document.body.dataset.page : '';
  const session = getSession();

  const desktopLinks = NAV_LINKS.map(link => `
    <a href="${link.href}" class="${link.page === activePage ? 'is-active' : ''}"
       ${link.page === activePage ? 'aria-current="page"' : ''}>${link.label}</a>`).join('');

  const mobileLinks = NAV_LINKS.map(link => `
    <a href="${link.href}" class="${link.page === activePage ? 'is-active' : ''}">
      ${link.label}</a>`).join('');

  let desktopActions;
  let mobileActions;

  if (session) {
    desktopActions = `
      <div id="navNotifications"></div>
      <a href="${getDashboardUrl(session.role)}" class="btn btn-primary btn-sm nav-desktop-only">
        Dashboard
      </a>
      <div class="nav-desktop-only" id="navUserMenu"></div>`;
    mobileActions = `
      <a href="${getDashboardUrl(session.role)}">Dashboard</a>
      <a href="${getProfileUrl(session.role)}">Profile</a>
      <button type="button" class="mobile-link" data-action="logout">Log out</button>`;
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
        <button type="button" class="icon-button nav-toggle" id="navToggle" aria-expanded="false" aria-label="Open menu">
          ☰
        </button>
      </div>
    </div>
    <div class="mobile-menu" id="mobileMenu" style="display:none;">
      <div class="container">
        <nav aria-label="Main (mobile)">${mobileLinks}</nav>
        <div class="mobile-auth" style="margin-top:12px;">${mobileActions}</div>
      </div>
    </div>`;

  // Mobile menu toggle
  const toggle = header.querySelector('#navToggle');
  const mobileMenu = header.querySelector('#mobileMenu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileMenu.style.display === 'block';
      mobileMenu.style.display = isOpen ? 'none' : 'block';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.innerHTML = isOpen ? '☰' : '✕';
    });
  }

  header.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', logOutAndLeave);
  });

  if (session) {
    mountUserMenu(header.querySelector('#navUserMenu'));
  }
}

// ============================================================================
// User Menu
// ============================================================================
function mountUserMenu(container) {
  const session = getSession();
  if (!container || !session) return;

  const roleLabel = (session.role && ROLE_LABELS[session.role]) ? ROLE_LABELS[session.role] : 'Member';

  container.innerHTML = `
    <div class="dropdown" style="position:relative;display:inline-block;">
      <button type="button" class="user-chip" id="userMenuBtn" style="display:inline-flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;">
        ${avatarHtml(session.fullName, session.avatarUrl, 'avatar-sm')}
        <span class="user-chip-name" style="font-weight:600;">${escapeHtml(session.fullName)}</span>
        <span style="font-size:10px;">▼</span>
      </button>
      <div class="dropdown-menu" id="userDropdown" style="display:none;position:absolute;right:0;top:100%;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);padding:8px;min-width:180px;z-index:50;">
        <div style="padding:4px 8px;border-bottom:1px solid #f3f4f6;margin-bottom:6px;">
          <div style="font-weight:bold;font-size:14px;">${escapeHtml(session.fullName)}</div>
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(session.email)}</div>
          <span style="display:inline-block;font-size:10px;background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:4px;margin-top:4px;">${escapeHtml(roleLabel)}</span>
        </div>
        <a class="dropdown-item" href="${getDashboardUrl(session.role)}" style="display:block;padding:6px 8px;text-decoration:none;color:#374151;font-size:13px;">Dashboard</a>
        <a class="dropdown-item" href="${getProfileUrl(session.role)}" style="display:block;padding:6px 8px;text-decoration:none;color:#374151;font-size:13px;">Profile</a>
        <button type="button" class="dropdown-item is-danger" data-action="logout" style="display:block;width:100%;text-align:left;background:none;border:none;padding:6px 8px;color:#dc2626;cursor:pointer;font-size:13px;">Log out</button>
      </div>
    </div>`;

  const btn = container.querySelector('#userMenuBtn');
  const dropdown = container.querySelector('#userDropdown');
  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
  }

  container.querySelector('[data-action="logout"]').addEventListener('click', logOutAndLeave);
}

// ============================================================================
// Footer Renderer
// ============================================================================
function renderSiteFooter() {
  const footer = document.getElementById('siteFooter')
      || document.getElementById('site-footer')
      || document.querySelector('footer');
  if (!footer) return;

  const supportEmail = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.SUPPORT_EMAIL)
      ? APP_CONFIG.SUPPORT_EMAIL
      : 'support@vendorlink.co.za';

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
          <li><a href="mailto:${supportEmail}">Contact us</a></li>
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

// ============================================================================
// Automatic Startup
// ============================================================================
function initLayout() {
  try { renderDemoBanner(); } catch (e) { console.warn('Banner skipped', e); }
  try { renderSiteHeader(); } catch (e) { console.error('Header failed', e); }
  try { renderSiteFooter(); } catch (e) { console.warn('Footer skipped', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}
