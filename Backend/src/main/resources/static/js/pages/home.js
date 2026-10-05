/**
 * Home page
 * - Platform numbers from getPlatformStats()
 * - "Markets open for applications" from getEvents(), filtered by category pills
 * - "How it works" tab switcher
 */

const FEATURED_LIMIT = 6;
let openEvents = [];
let selectedCategoryId = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadFeaturedEvents();
  setupJourneyTabs();
  updateCtaForSession();
});

// ---------- Stats strip ----------
async function loadStats() {
  try {
    const stats = await getPlatformStats();
    document.getElementById('statVendors').textContent = formatNumber(stats.vendorCount);
    document.getElementById('statEvents').textContent = formatNumber(stats.eventCount);
    document.getElementById('statApplications').textContent = formatNumber(stats.applicationCount);
    document.getElementById('statApproval').textContent = `${stats.approvalRate}%`;
  } catch (err) {
    // The numbers are not essential: hide the strip instead of showing an error.
    console.warn('Platform stats unavailable:', err.message);
    document.querySelector('.stats-strip').hidden = true;
  }
}

// ---------- Featured events ----------
async function loadFeaturedEvents() {
  const grid = document.getElementById('featuredGrid');
  if (grid) renderSkeletonCards(grid, 3);

  try {
    const [events, categories] = await Promise.all([
      getEvents(),
      getCategories().catch(err => {
        console.error('Failed to load categories on home page:', err);
        return [];
      })
    ]);
    const rawList = Array.isArray(events) ? events : (events && Array.isArray(events.data) ? events.data : []);

    // Only events that can still take applications (open and not fully booked)
    const validEvents = rawList.filter(e => canApplyToEvent(e));
    openEvents = validEvents.filter(isUpcoming);
    // If upcoming filter leaves none (e.g. test data with past dates), keep valid open events
    if (!openEvents.length && validEvents.length > 0) {
      openEvents = validEvents;
    }

    renderCategoryPills(categories || []);
    renderFeaturedEvents();
  } catch (err) {
    console.error('Failed to load featured events on home page:', err);
    if (grid) {
      renderError(grid, {
        title: 'Unable to load events',
        message: 'Please check your connection and try again.',
        onRetry: loadFeaturedEvents
      });
    }
  }
}

function renderCategoryPills(categories) {
  const container = document.getElementById('categoryPills');
  if (!container) return;
  // Only show categories that currently have open events
  const used = categories.filter(c => openEvents.some(e => e.categoryId === c.id));

  container.innerHTML = [
    `<button type="button" class="pill is-active" data-category="all" aria-pressed="true">
       <i class="fa-solid fa-border-all" aria-hidden="true"></i> All categories</button>`,
    ...used.map(c => `
      <button type="button" class="pill" data-category="${c.id}" aria-pressed="false">
        ${categoryIconHtml(c)} ${escapeHtml(c.name)}</button>`)
  ].join('');

  container.addEventListener('click', (e) => {
    const pill = e.target.closest('[data-category]');
    if (!pill) return;
    selectedCategoryId = pill.dataset.category;
    container.querySelectorAll('.pill').forEach(p => {
      const active = p === pill;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-pressed', String(active));
    });
    renderFeaturedEvents();
  });
}

function renderFeaturedEvents() {
  const grid = document.getElementById('featuredGrid');
  const browseLink = document.getElementById('browseAllLink');
  if (!grid) return;

  if (!openEvents.length) {
    if (browseLink) {
      browseLink.href = 'browse-events.html';
      browseLink.innerHTML = `Browse all events <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
    }
    renderEmpty(grid, {
      icon: 'fa-calendar-xmark',
      title: 'No events currently open',
      message: 'Check back soon for upcoming markets and pop-ups.',
      action: { label: 'Browse all events', href: 'browse-events.html?status=all' }
    });
    return;
  }

  const matching = selectedCategoryId === 'all'
    ? openEvents
    : openEvents.filter(e => String(e.categoryId) === selectedCategoryId);

  // Link to the browse page with the same category selected
  if (browseLink) {
    browseLink.href = selectedCategoryId === 'all'
      ? 'browse-events.html'
      : `browse-events.html?category=${encodeURIComponent(selectedCategoryId)}`;
    browseLink.innerHTML = `Browse all ${matching.length} open event${matching.length === 1 ? '' : 's'} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
  }

  if (!matching.length) {
    renderEmpty(grid, {
      icon: 'fa-calendar-xmark',
      title: 'No open events in this category',
      message: 'Try another category, or browse every event including closed ones.',
      action: { label: 'Browse all events', href: 'browse-events.html?status=all' }
    });
    return;
  }

  grid.innerHTML = matching.slice(0, FEATURED_LIMIT).map(eventCardHtml).join('');
}

// ---------- How it works tabs ----------
function setupJourneyTabs() {
  const tabs = [
    { tab: document.getElementById('tabVendors'), panel: document.getElementById('panelVendors') },
    { tab: document.getElementById('tabOrganizers'), panel: document.getElementById('panelOrganizers') }
  ];

  function select(index) {
    tabs.forEach((item, i) => {
      const active = i === index;
      item.tab.classList.toggle('is-active', active);
      item.tab.setAttribute('aria-selected', String(active));
      item.tab.tabIndex = active ? 0 : -1;
      item.panel.hidden = !active;
    });
  }

  tabs.forEach((item, index) => {
    item.tab.addEventListener('click', () => select(index));
    // Arrow keys move between tabs
    item.tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(next);
      tabs[next].tab.focus();
    });
  });
}

// ---------- Call to action ----------
function updateCtaForSession() {
  const session = getSession();
  if (!session) return;
  document.getElementById('ctaTitle').textContent = `Welcome back, ${session.fullName.split(' ')[0]}`;
  document.getElementById('ctaText').textContent = session.role === Role.VENDOR
    ? 'Check your applications and notifications, or find your next market.'
    : 'Review new applications and keep an eye on your stall numbers.';
  const button = document.getElementById('ctaButton');
  button.href = getDashboardUrl(session.role);
  button.innerHTML = 'Go to your dashboard <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
}

// Global window attachments
window.loadFeaturedEvents = loadFeaturedEvents;

