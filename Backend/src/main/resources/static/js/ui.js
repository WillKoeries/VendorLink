/**
 * UI helpers shared by every page
 * -------------------------------
 * Formatting, safe HTML, toasts, modals, loading/empty/error states,
 * status badges and the event card.
 */

// ============ Safety ============

/** Escape text before putting it inside HTML. Use for ALL data from the database or the user. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow http(s), relative paths and data image links. Returns '' if unsafe. */
function safeUrl(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (trimmed.startsWith('images/') || trimmed.startsWith('./') || trimmed.startsWith('/') || trimmed.startsWith('uploads/')) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed, window.location.href);
    return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href : '';
  } catch (err) {
    return '';
  }
}

// Pages that the ?redirect= parameter is allowed to send people to after login
const REDIRECT_ALLOWED_PAGES = [
  'index.html', 'browse-events.html', 'event-details.html', 'pricing.html', 'about.html',
  'vendor-dashboard.html', 'organizer-dashboard.html', 'legal.html'
];

/** Turns a ?redirect= value into a safe same-site page, or returns the fallback. */
function getSafeRedirect(value, fallback) {
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.href);
    const page = url.pathname.split('/').pop();
    if (url.origin === window.location.origin && REDIRECT_ALLOWED_PAGES.includes(page)) {
      return page + url.search + url.hash;
    }
  } catch (err) {
    // fall through
  }
  return fallback;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

function isValidPhone(value) {
  const digits = String(value).replace(/[\s()-]/g, '');
  return /^\+?\d{9,15}$/.test(digits);
}

// ============ Formatting ============

/** 'YYYY-MM-DD' → Date in local time (avoids the time-zone shift of new Date('YYYY-MM-DD')). */
function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-GB', options) : 'Date to be confirmed';
}

/** "20 Oct 2026" or "20 Oct – 21 Oct 2026" when the event has an end date. */
function formatEventDates(event) {
  if (!event.endDate || event.endDate === event.date) return formatDate(event.date);
  return `${formatDate(event.date, { day: 'numeric', month: 'short' })} – ${formatDate(event.endDate)}`;
}

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDateTime(isoString);
}

function formatCurrency(amount) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return 'R0';
  return 'R' + number.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-ZA');
}

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ============ Images ============
const FALLBACK_IMAGES = {
  event: 'images/marketplace-fallback.jpg',
  avatar: 'images/placeholder-avatar.svg'
};

// If an image with data-fallback fails, swap in the local placeholder ONCE
// (the data-fallback-used flag stops an endless error loop).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.fallback || img.dataset.fallbackUsed) return;
  img.dataset.fallbackUsed = 'true';
  img.src = FALLBACK_IMAGES[img.dataset.fallback] || FALLBACK_IMAGES.event;
}, true);

function eventImageUrl(event) {
  return safeUrl(event.bannerImageUrl) || FALLBACK_IMAGES.event;
}

/** Round avatar: the profile image if there is one, otherwise the person's initials. */
function avatarHtml(name, imageUrl, sizeClass = '') {
  const url = safeUrl(imageUrl);
  if (url) {
    return `<img class="avatar ${sizeClass}" src="${escapeHtml(url)}" alt="" data-fallback="avatar">`;
  }
  return `<span class="avatar ${sizeClass}" aria-hidden="true">${escapeHtml(getInitials(name))}</span>`;
}

// Category icons: use category.iconUrl when it exists, otherwise a Font Awesome icon.
const CATEGORY_ICON_FALLBACKS = {
  'Food & Street Eats': 'fa-utensils',
  'Arts & Crafts': 'fa-palette',
  'Fashion & Vintage': 'fa-shirt',
  'Farmers & Produce': 'fa-seedling',
  'Night Markets': 'fa-moon',
  'Health & Beauty': 'fa-spa',
  'Tech & Pop-Ups': 'fa-laptop'
};

function categoryIconHtml(category) {
  if (!category) return '<i class="fa-solid fa-tag" aria-hidden="true"></i>';
  const url = safeUrl(category.iconUrl);
  if (url) return `<img src="${escapeHtml(url)}" alt="" loading="lazy">`;
  const icon = CATEGORY_ICON_FALLBACKS[category.name] || 'fa-tag';
  return `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
}

// ============ Status badges ============

/** Badge for an event. An OPEN event with no stalls left shows "Fully booked". */
function eventStatusBadge(event) {
  if (isEventFull(event)) {
    return '<span class="badge badge-danger"><i class="fa-solid fa-ban" aria-hidden="true"></i> Fully booked</span>';
  }
  const ui = EVENT_STATUS_UI[event.status] || { label: event.status, tone: 'neutral', icon: 'fa-circle' };
  return `<span class="badge badge-${ui.tone}"><i class="fa-solid ${ui.icon}" aria-hidden="true"></i> ${escapeHtml(ui.label)}</span>`;
}

/** Short availability text used on cards, e.g. "5 of 10 stalls left". */
function availabilityText(event) {
  if (event.status !== EventStatus.OPEN) return (EVENT_STATUS_UI[event.status] || {}).label || event.status;
  if (event.availableStalls <= 0) return 'Fully booked';
  return `${event.availableStalls} of ${event.totalStalls} stall${event.totalStalls === 1 ? '' : 's'} left`;
}

function applicationStatusBadge(status) {
  const ui = APPLICATION_STATUS_UI[status] || { label: status, tone: 'neutral', icon: 'fa-circle' };
  return `<span class="badge badge-${ui.tone}"><i class="fa-solid ${ui.icon}" aria-hidden="true"></i> ${escapeHtml(ui.label)}</span>`;
}

function occupancyBarHtml(event) {
  const percent = getOccupancyPercent(event);
  const tone = percent >= 100 ? 'is-full' : percent >= 80 ? 'is-warning' : '';
  return `<div class="occupancy" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"
    aria-label="${percent}% of stalls booked"><div class="occupancy-bar ${tone}" style="width:${percent}%"></div></div>`;
}

// ============ Event card (home + browse) ============
function eventCardHtml(event) {
  const detailsUrl = `event-details.html?id=${encodeURIComponent(event.id)}`;
  const categoryName = event.category ? event.category.name : 'Uncategorised';
  const place = [event.location, event.city].filter(Boolean).join(', ');
  const canApply = canApplyToEvent(event);

  return `
    <article class="event-card">
      <a class="event-card-media" href="${detailsUrl}" tabindex="-1" aria-hidden="true">
        <img src="${escapeHtml(eventImageUrl(event))}" alt="" loading="lazy" data-fallback="event" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='images/marketplace-fallback.jpg'">
        <span class="badge badge-overlay event-card-tag">${escapeHtml(categoryName)}</span>
        <span class="event-card-status">${eventStatusBadge(event)}</span>
      </a>
      <div class="event-card-body">
        <h3 class="event-card-title"><a href="${detailsUrl}">${escapeHtml(event.title)}</a></h3>
        <div class="event-meta">
          <div class="meta-item"><i class="fa-regular fa-calendar" aria-hidden="true"></i>
            <span>${escapeHtml(formatEventDates(event))}${event.time ? ' · ' + escapeHtml(event.time) : ''}</span></div>
          <div class="meta-item"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${escapeHtml(place)}</span></div>
          <div class="meta-item"><i class="fa-solid fa-store" aria-hidden="true"></i><span>${escapeHtml(availabilityText(event))}</span></div>
        </div>
        <div class="event-card-footer">
          <div class="event-fee"><span>Stall fee</span><strong>${escapeHtml(formatCurrency(event.stallFee))}</strong></div>
          <a class="btn ${canApply ? 'btn-primary' : 'btn-secondary'} btn-sm" href="${detailsUrl}">
            ${canApply ? 'View &amp; apply' : 'View details'} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </article>`;
}

// ============ Loading / empty / error states ============
function renderLoading(container, message = 'Loading…') {
  container.innerHTML = `
    <div class="state state-loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function renderSkeletonCards(container, count = 3) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-line is-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line is-short"></div>
      </div>
    </div>`).join('') + '<span class="visually-hidden" role="status">Loading…</span>';
}

/**
 * Empty state. `action` is optional: { label, href } or { label, onClick }.
 */
function renderEmpty(container, { icon = 'fa-inbox', title, message = '', action = null, boxed = true } = {}) {
  container.innerHTML = `
    <div class="state ${boxed ? 'state-boxed' : ''}">
      <div class="state-icon"><i class="fa-solid ${escapeHtml(icon)}" aria-hidden="true"></i></div>
      <h3>${escapeHtml(title)}</h3>
      ${message ? `<p>${escapeHtml(message)}</p>` : ''}
    </div>`;
  addStateAction(container.querySelector('.state'), action, 'btn-secondary');
}

function renderError(container, { title = 'Something went wrong', message = 'Please try again.', onRetry = null } = {}) {
  container.innerHTML = `
    <div class="state state-boxed state-error" role="alert">
      <div class="state-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
  if (onRetry) {
    addStateAction(container.querySelector('.state'), { label: 'Try again', onClick: onRetry, icon: 'fa-rotate-right' }, 'btn-primary');
  }
}

function addStateAction(stateEl, action, style) {
  if (!action || !stateEl) return;
  const el = document.createElement(action.href ? 'a' : 'button');
  el.className = `btn ${style}`;
  if (action.href) el.href = action.href;
  else el.type = 'button';
  el.innerHTML = `${action.icon ? `<i class="fa-solid ${escapeHtml(action.icon)}" aria-hidden="true"></i> ` : ''}${escapeHtml(action.label)}`;
  if (action.onClick) el.addEventListener('click', action.onClick);
  stateEl.appendChild(el);
}

// ============ Toasts ============
function showToast(message, type = 'info', duration = 4500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}" aria-hidden="true"></i>
    <span class="toast-message"></span>
    <button type="button" class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
  toast.querySelector('.toast-message').textContent = message;
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
  container.appendChild(toast);

  if (duration > 0) setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast.isConnected) return;
  toast.classList.add('is-leaving');
  setTimeout(() => toast.remove(), 250);
}

// ============ Modals ============
// Markup: <div class="modal-overlay" id="myModal"> <div class="modal" role="dialog" ...> … </div></div>
// Any element with data-close-modal inside a modal closes it.
let lastFocusedBeforeModal = null;

function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  lastFocusedBeforeModal = document.activeElement;
  overlay.classList.add('is-open');
  document.body.classList.add('modal-open');
  const firstField = overlay.querySelector('input:not([type=hidden]):not([disabled]), select, textarea, button:not(.modal-close)');
  if (firstField) setTimeout(() => firstField.focus(), 50);
}

function closeModal(id) {
  const overlay = typeof id === 'string' ? document.getElementById(id) : id;
  if (!overlay || !overlay.classList.contains('is-open')) return;
  overlay.classList.remove('is-open');
  if (!document.querySelector('.modal-overlay.is-open')) {
    document.body.classList.remove('modal-open');
  }
  if (lastFocusedBeforeModal && lastFocusedBeforeModal.isConnected) lastFocusedBeforeModal.focus();
}

// One set of listeners handles every modal on every page
document.addEventListener('click', (e) => {
  const overlay = e.target.closest('.modal-overlay');
  if (!overlay) return;
  if (e.target === overlay || e.target.closest('[data-close-modal]')) closeModal(overlay);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openModals = document.querySelectorAll('.modal-overlay.is-open');
  if (openModals.length) closeModal(openModals[openModals.length - 1]);
});

/**
 * Confirmation dialog that replaces window.confirm().
 * Usage: if (await confirmDialog({ title, message, confirmText })) { ... }
 */
function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    document.getElementById('confirmModal')?.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-overlay';
    wrapper.id = 'confirmModal';
    wrapper.innerHTML = `
      <div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
        <div class="modal-header">
          <div><h2 id="confirmTitle"></h2></div>
          <button type="button" class="modal-close" data-close-modal aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body"><p id="confirmMessage" class="text-muted"></p></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>${escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
    wrapper.querySelector('#confirmTitle').textContent = title;
    wrapper.querySelector('#confirmMessage').textContent = message;
    document.body.appendChild(wrapper);

    let answered = false;
    const finish = (result) => {
      if (answered) return;
      answered = true;
      closeModal(wrapper);
      setTimeout(() => wrapper.remove(), 200);
      resolve(result);
    };
    wrapper.querySelector('#confirmOk').addEventListener('click', () => finish(true));
    // Closing any other way (X, Cancel, backdrop, Escape) counts as "no"
    new MutationObserver(() => {
      if (!wrapper.classList.contains('is-open')) finish(false);
    }).observe(wrapper, { attributes: true, attributeFilter: ['class'] });

    openModal('confirmModal');
  });
}

// ============ Forms ============
function setButtonLoading(button, isLoading, loadingText = 'Saving…') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${escapeHtml(loadingText)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

/** Show messages under fields. `errors` is { fieldName: message } matching the inputs' name attributes. */
function showFieldErrors(form, errors) {
  clearFieldErrors(form);
  let first = null;
  Object.entries(errors).forEach(([name, message]) => {
    const input = form.elements[name];
    if (!input || !input.closest) return;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    const error = document.createElement('p');
    error.className = 'form-error';
    error.id = `${input.id || name}-error`;
    error.textContent = message;
    input.setAttribute('aria-describedby', error.id);
    (input.closest('.form-group') || input.parentElement).appendChild(error);
    if (!first) first = input;
  });
  if (first) first.focus();
}

function clearFieldErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
}

/** Fill a <select> with options. items: [{ value, label }] */
function fillSelect(select, items, { placeholder = null, selected = '' } = {}) {
  select.innerHTML = '';
  if (placeholder !== null) select.add(new Option(placeholder, ''));
  items.forEach(item => select.add(new Option(item.label, item.value)));
  select.value = selected ?? '';
}

// ============ Image carousel (login & register side panel) ============
/** Fades between the .slide-img images inside `container` and moves the .stage-dot indicators. */
function startImageCarousel(container, interval = 4500) {
  if (!container) return;
  const slides = container.querySelectorAll('.slide-img');
  const dots = container.querySelectorAll('.stage-dot');
  if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('is-active');
    dots[current]?.classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
    dots[current]?.classList.add('is-active');
  }, interval);
}

/** Show/hide password buttons: <button data-toggle-password="inputId"> */
document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-toggle-password]');
  if (!button) return;
  const input = document.getElementById(button.dataset.togglePassword);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
});

// ============ Files ============
/** Download rows (array of arrays) as a CSV file. */
function downloadCsv(filename, rows) {
  const csv = rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
