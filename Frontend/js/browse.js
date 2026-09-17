/**
 * VendorLink Browse Events Page Controller
 * Fetches categories, executes dynamic event queries with filters, and renders event cards.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const eventsContainer = document.getElementById('events-container') || document.querySelector('.events');
    const categorySelect = document.getElementById('filter-category');
    const provinceSelect = document.getElementById('filter-province');
    const cityInput = document.getElementById('filter-city');
    const dateInput = document.getElementById('filter-date');
    const searchInput = document.getElementById('filter-search');
    const filterBtn = document.getElementById('filter-btn') || document.querySelector('.filter-btn');

    // 1. Populate Categories Filter from Backend
    async function loadCategories() {
        if (!categorySelect) return;
        try {
            const categories = await categoriesAPI.getAll();
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            });
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }

    // 2. Fetch and Render Events
    async function loadEvents() {
        if (!eventsContainer) return;

        eventsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
                <div class="spinner" style="border-top-color: #2563eb; width: 32px; height: 32px; margin-bottom: 12px;"></div>
                <p>Loading available events...</p>
            </div>
        `;

        const params = {
            status: 'OPEN'
        };

        if (categorySelect && categorySelect.value) {
            params.categoryId = categorySelect.value;
        }
        if (provinceSelect && provinceSelect.value) {
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
            const events = await eventsAPI.getEvents(params);

            if (!events || events.length === 0) {
                eventsContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
                        <h3 style="color: #475569; margin-bottom: 8px;">No events found</h3>
                        <p style="color: #94a3b8; font-size: 0.95rem;">Try adjusting your filter criteria or check back soon for upcoming events.</p>
                    </div>
                `;
                return;
            }

            // Render Event Cards
            eventsContainer.innerHTML = events.map(event => {
                const imageUrl = event.bannerImageUrl || 'images/market1.png';
                const formattedDate = formatDate(event.date);
                const fee = formatCurrency(event.stallFee);
                const stalls = event.availableStalls !== null && event.availableStalls !== undefined 
                    ? `${event.availableStalls} Stalls Available` 
                    : 'Stalls Available';

                return `
                    <div class="event-card">
                        <img src="${imageUrl}" alt="${event.title}" onerror="this.src='images/market1.png'">
                        <div class="event-content">
                            <h3>${event.title}</h3>
                            <p>📍 ${event.city ? event.city + (event.province ? ', ' + event.province : '') : event.location}</p>
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

    // Attach Filter Event
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadEvents();
        });
    }

    // Initial Execution
    await loadCategories();
    await loadEvents();
});
