/**
 * VendorLink Browse Events Page Controller
 * Fetches categories, executes dynamic event queries with filters, and renders event cards.
 */

async function loadCategories() {
    const categorySelect = document.getElementById('filter-category');
    if (!categorySelect) return;
    try {
        let categories = [];
        if (typeof window.getCategories === 'function') {
            categories = await window.getCategories();
        } else if (window.categoriesAPI && typeof window.categoriesAPI.getAll === 'function') {
            categories = await window.categoriesAPI.getAll();
        } else {
            const res = await fetch('/api/categories', { headers: { 'Accept': 'application/json' } });
            if (res.ok) categories = await res.json();
        }

        const list = Array.isArray(categories) ? categories : (categories && Array.isArray(categories.data) ? categories.data : []);
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            categorySelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

async function loadEvents() {
    const eventsContainer = document.getElementById('events-container') || document.querySelector('.events') || document.getElementById('eventsGrid');
    if (!eventsContainer) return;

    eventsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
            <div class="spinner" style="border-top-color: #2563eb; width: 32px; height: 32px; margin-bottom: 12px; margin-left: auto; margin-right: auto;"></div>
            <p>Loading available events...</p>
        </div>
    `;

    const categorySelect = document.getElementById('filter-category');
    const provinceSelect = document.getElementById('filter-province') || document.getElementById('filterProvince');
    const cityInput = document.getElementById('filter-city');
    const dateInput = document.getElementById('filter-date');
    const searchInput = document.getElementById('filter-search') || document.getElementById('searchInput');

    const params = {
        status: 'OPEN'
    };

    if (categorySelect && categorySelect.value) {
        params.categoryId = categorySelect.value;
    }
    if (provinceSelect && provinceSelect.value && provinceSelect.value !== 'all') {
        params.province = provinceSelect.value;
    }
    if (cityInput && cityInput.value.trim()) {
        params.city = cityInput.value.trim();
    }
    if (dateInput && dateInput.value) {
        params.date = dateInput.value;
    }
    if (searchInput && searchInput.value.trim()) {
        params.search = searchInput.value.trim();
    }

    try {
        let rawData;
        if (typeof window.getEvents === 'function') {
            rawData = await window.getEvents(params);
        } else {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value);
                }
            }
            const qs = searchParams.toString();
            const res = await fetch(`/api/events${qs ? '?' + qs : ''}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            rawData = await res.json();
        }

        // Direct parser for raw JSON array
        const events = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

        if (!events || events.length === 0) {
            eventsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <h3 style="color: #475569; margin-bottom: 8px;">No events currently open</h3>
                    <p style="color: #94a3b8; font-size: 0.95rem;">Check back soon for upcoming events.</p>
                </div>
            `;
            return;
        }

        // Render Event Cards
        if (typeof eventCardHtml === 'function') {
            eventsContainer.innerHTML = events.map(eventCardHtml).join('');
        } else {
            eventsContainer.innerHTML = events.map(event => {
                const imageUrl = (typeof eventImageUrl === 'function' ? eventImageUrl(event) : event.bannerImageUrl) || 'images/marketplace-fallback.jpg';
                const formattedDate = typeof formatDate === 'function' ? formatDate(event.date) : (event.date || 'TBA');
                const fee = typeof formatCurrency === 'function' ? formatCurrency(event.stallFee) : `R${event.stallFee || 0}`;
                const stalls = event.availableStalls !== null && event.availableStalls !== undefined
                    ? `${event.availableStalls} Stalls Available`
                    : 'Stalls Available';

                return `
                    <div class="event-card">
                        <img src="${imageUrl}" alt="${event.title || 'Event'}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='images/marketplace-fallback.jpg'">
                        <div class="event-content">
                            <h3>${event.title || 'Untitled Event'}</h3>
                            <p>📍 ${event.city ? event.city + (event.province ? ', ' + event.province : '') : (event.location || '')}</p>
                            <p>📅 ${formattedDate}</p>
                            <p>💰 ${fee} Stall Fee</p>
                            <p>${stalls}</p>
                            <a href="event-details.html?id=${event.id}" class="primary-btn">
                                Apply Now
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Failed to load events:', err);
        eventsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444; background: #fef2f2; border-radius: 12px;">
                <p>Failed to connect to the backend server.</p>
                <small style="color: #991b1b;">${err.message}</small>
            </div>
        `;
    }
}

// Global window attachments
window.loadCategories = loadCategories;
window.loadEvents = loadEvents;

document.addEventListener('DOMContentLoaded', async () => {
    const filterBtn = document.getElementById('filter-btn') || document.querySelector('.filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadEvents();
        });
    }

    await loadCategories();
    await loadEvents();
});
