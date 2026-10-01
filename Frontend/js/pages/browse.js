/**
 * Browse Events page
 * ------------------
 * 1. loadEvents()    – gets events + categories from the services
 * 2. filterEvents()  – applies search, category, province, status, availability and fee
 * 3. sortEvents()    – sorts a COPY of the list (the original order is never lost)
 * 4. renderEvents()  – draws the cards, result count and empty state
 * Filters are also kept in the URL (?category=2&q=coffee) so results can be shared.
 */

// The starting value of every filter. "Clear all" returns to exactly this.
const DEFAULT_FILTERS = {
  search: '',
  categoryId: 'all',
  province: 'all',
  status: 'open',
  onlyAvailable: false,
  maxFee: null,       // null = any fee
  sort: 'date'
};

let allEvents = [];
let feeCeiling = 1000;
let filters = { ...DEFAULT_FILTERS };

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  els.grid = document.getElementById('eventsGrid');
  els.count = document.getElementById('resultsCount');
  els.search = document.getElementById('searchInput');
  els.pills = document.getElementById('categoryPills');
  els.province = document.getElementById('filterProvince');
  els.status = document.getElementById('filterStatus');
  els.available = document.getElementById('filterAvailable');
  els.maxFee = document.getElementById('filterMaxFee');
  els.maxFeeLabel = document.getElementById('maxFeeLabel');
  els.sort = document.getElementById('sortOrder');
  els.panel = document.getElementById('filtersPanel');
  els.toggle = document.getElementById('filtersToggle');
  els.activeCount = document.getElementById('activeFilterCount');

  fillSelect(els.province, [{ value: 'all', label: 'All provinces' }, ...PROVINCES.map(p => ({ value: p, label: p }))]);
  setupListeners();
  loadEvents();
});

// ---------- Data ----------
async function loadEvents() {
  if (els.grid) renderSkeletonCards(els.grid, 4);
  if (els.count) els.count.textContent = 'Loading events…';

  try {
    const [events, categories] = await Promise.all([
      getEvents(),
      getCategories().catch(err => {
        console.error('Failed to load categories:', err);
        return [];
      })
    ]);

    // Handle raw array directly
    allEvents = Array.isArray(events) ? events : (events && Array.isArray(events.data) ? events.data : []);

    renderCategoryPills(categories || []);

    // If the array is empty ([]), show a clean empty state ("No events currently open") instead of the error state.
    if (!allEvents.length) {
      if (els.count) els.count.textContent = '0 events available';
      if (els.grid) {
        renderEmpty(els.grid, {
          icon: 'fa-calendar-xmark',
          title: 'No events currently open',
          message: 'Check back soon for upcoming markets, festivals and pop-ups.',
          action: { label: 'Refresh events', onClick: loadEvents, icon: 'fa-rotate-right' }
        });
      }
      return;
    }

    // Fee slider goes up to the most expensive event (rounded up to the next R100)
    const highestFee = Math.max(0, ...allEvents.map(e => Number(e.stallFee) || 0));
    feeCeiling = Math.max(100, Math.ceil(highestFee / 100) * 100);
    if (els.maxFee) els.maxFee.max = feeCeiling;

    filters = { ...DEFAULT_FILTERS, ...readFiltersFromUrl() };
    syncControls();
    renderEvents();
  } catch (err) {
    console.error('Failed to load events in browse page:', err);
    if (els.count) els.count.textContent = '';
    if (els.grid) {
      renderError(els.grid, {
        title: 'Unable to load events',
        message: 'Please check your connection and try again.',
        onRetry: loadEvents
      });
    }
  }
}

// ---------- Filtering & sorting ----------
function filterEvents(events, f) {
  const query = f.search.trim().toLowerCase();

  return events.filter(event => {
    // Search only meaningful event fields (not button text or labels)
    if (query) {
      const searchable = [event.title, event.description, event.location, event.city, event.province, event.category?.name]
        .filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    if (f.categoryId !== 'all' && String(event.categoryId) !== String(f.categoryId)) return false;
    if (f.province !== 'all' && event.province !== f.province) return false;
    if (f.status === 'open' && (event.status || '').toUpperCase() !== EventStatus.OPEN) return false;
    if (!['open', 'all'].includes(f.status) && (event.status || '').toUpperCase() !== f.status.toUpperCase()) return false;
    if (f.onlyAvailable && !canApplyToEvent(event)) return false;
    if (f.maxFee !== null && Number(event.stallFee) > f.maxFee) return false;
    return true;
  });
}

function sortEvents(events, sort) {
  const list = [...events]; // copy, so "Date" always returns to the original order
  if (sort === 'fee-asc') list.sort((a, b) => a.stallFee - b.stallFee);
  if (sort === 'fee-desc') list.sort((a, b) => b.stallFee - a.stallFee);
  if (sort === 'stalls') list.sort((a, b) => b.availableStalls - a.availableStalls);
  return list; // 'date' keeps the service order: upcoming soonest first
}

// ---------- Rendering ----------
function renderEvents() {
  if (!els.grid) return;

  if (!allEvents.length) {
    if (els.count) els.count.textContent = '0 events available';
    renderEmpty(els.grid, {
      icon: 'fa-calendar-xmark',
      title: 'No events currently open',
      message: 'Check back soon for upcoming markets, festivals and pop-ups.',
      action: { label: 'Refresh events', onClick: loadEvents, icon: 'fa-rotate-right' }
    });
    return;
  }

  const results = sortEvents(filterEvents(allEvents, filters), filters.sort);

  if (els.count) {
    els.count.innerHTML = `Showing <strong>${results.length}</strong> of ${allEvents.length} event${allEvents.length === 1 ? '' : 's'}`;
  }
  updateActiveFilterCount();
  writeFiltersToUrl();

  if (!results.length) {
    renderEmpty(els.grid, {
      icon: 'fa-magnifying-glass',
      title: 'No events match your filters',
      message: 'Try a different search or remove some filters.',
      action: { label: 'Clear all filters', onClick: clearFilters, icon: 'fa-rotate-left' }
    });
    return;
  }
  els.grid.innerHTML = results.map(eventCardHtml).join('');
}

function renderCategoryPills(categories) {
  if (!els.pills) return;
  els.pills.innerHTML = [
    '<button type="button" class="pill" data-category="all"><i class="fa-solid fa-border-all" aria-hidden="true"></i> All categories</button>',
    ...categories.map(c => `<button type="button" class="pill" data-category="${c.id}">${categoryIconHtml(c)} ${escapeHtml(c.name)}</button>`)
  ].join('');
}

/** Make every control show the current `filters` values. */
function syncControls() {
  if (els.search) els.search.value = filters.search;
  if (els.province) els.province.value = filters.province;
  if (els.status) els.status.value = filters.status;
  if (els.available) els.available.checked = filters.onlyAvailable;
  if (els.maxFee) els.maxFee.value = filters.maxFee === null ? feeCeiling : filters.maxFee;
  if (els.maxFeeLabel) els.maxFeeLabel.textContent = filters.maxFee === null ? 'Any fee' : `Up to ${formatCurrency(filters.maxFee)}`;
  if (els.sort) els.sort.value = filters.sort;
  if (els.pills) {
    els.pills.querySelectorAll('.pill').forEach(pill => {
      const active = pill.dataset.category === String(filters.categoryId);
      pill.classList.toggle('is-active', active);
      pill.setAttribute('aria-pressed', String(active));
    });
  }
}

function updateActiveFilterCount() {
  if (!els.activeCount) return;
  const active = ['categoryId', 'province', 'status', 'onlyAvailable', 'maxFee']
    .filter(key => filters[key] !== DEFAULT_FILTERS[key]).length;
  els.activeCount.hidden = active === 0;
  els.activeCount.textContent = active;
}

function clearFilters() {
  filters = { ...DEFAULT_FILTERS };
  syncControls();
  renderEvents();
  if (els.search) els.search.focus();
}

// ---------- URL ----------
function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = {};
  if (params.get('q')) fromUrl.search = params.get('q').slice(0, 100);
  if (params.get('category')) fromUrl.categoryId = params.get('category');
  if (PROVINCES.includes(params.get('province'))) fromUrl.province = params.get('province');
  if (['all', 'CLOSED', 'COMPLETED'].includes(params.get('status'))) fromUrl.status = params.get('status');
  return fromUrl;
}

function writeFiltersToUrl() {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.categoryId !== 'all') params.set('category', filters.categoryId);
  if (filters.province !== 'all') params.set('province', filters.province);
  if (filters.status !== 'open') params.set('status', filters.status);
  const query = params.toString();
  history.replaceState(null, '', query ? `browse-events.html?${query}` : 'browse-events.html');
}

// ---------- Listeners ----------
function setupListeners() {
  if (els.search) {
    const onSearch = debounce(() => {
      filters.search = els.search.value;
      renderEvents();
    }, 250);
    els.search.addEventListener('input', onSearch);
  }

  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (els.search) filters.search = els.search.value;
      renderEvents();
    });
  }

  if (els.pills) {
    els.pills.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-category]');
      if (!pill) return;
      filters.categoryId = pill.dataset.category;
      syncControls();
      renderEvents();
    });
  }

  if (els.province) els.province.addEventListener('change', () => { filters.province = els.province.value; renderEvents(); });
  if (els.status) els.status.addEventListener('change', () => { filters.status = els.status.value; renderEvents(); });
  if (els.available) els.available.addEventListener('change', () => { filters.onlyAvailable = els.available.checked; renderEvents(); });
  if (els.sort) els.sort.addEventListener('change', () => { filters.sort = els.sort.value; renderEvents(); });

  if (els.maxFee) {
    els.maxFee.addEventListener('input', () => {
      const value = Number(els.maxFee.value);
      filters.maxFee = value >= feeCeiling ? null : value;
      if (els.maxFeeLabel) {
        els.maxFeeLabel.textContent = filters.maxFee === null ? 'Any fee' : `Up to ${formatCurrency(filters.maxFee)}`;
      }
      renderEvents();
    });
  }

  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  // Small screens: show/hide the filters panel
  if (els.toggle && els.panel) {
    els.toggle.addEventListener('click', () => {
      const isOpen = els.panel.classList.toggle('is-open');
      els.toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
}

// Global attachments for non-module script tags
window.loadEvents = loadEvents;
window.filterEvents = filterEvents;
window.sortEvents = sortEvents;
window.renderEvents = renderEvents;
window.clearFilters = clearFilters;
