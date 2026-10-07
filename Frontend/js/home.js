/**
 * VendorLink Home Page Controller
 * Dynamically loads featured events from backend and enhances interactivity.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const eventGrid = document.querySelector('.featured .event-grid');

    if (!eventGrid) return;

    try {
        const events = await eventsAPI.getEvents({ status: 'OPEN' });

        if (events && events.length > 0) {

            const featured = events.slice(0, 3);

            eventGrid.innerHTML = featured.map(evt => {
                const img = (typeof eventImageUrl === 'function' ? eventImageUrl(evt) : evt.bannerImageUrl) || 'images/marketplace-fallback.jpg';
                const date = formatDate(evt.date);
                const stalls = evt.availableStalls !== null && evt.availableStalls !== undefined
                    ? `${evt.availableStalls} Stalls Available`
                    : 'Stalls Available';

                return `
                    <div class="event-card">
                        <img src="${img}" alt="${evt.title || 'Event'}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='images/marketplace-fallback.jpg'">
                        <div class="event-content">
                            <h3>${evt.title}</h3>
                            <p>📍 ${evt.city || evt.location}</p>
                            <p>📅 ${date}</p>
                            <p>${stalls}</p>
                            <a href="event-details.html?id=${evt.id}">
                                View Details
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.warn('Backend events not available, keeping fallback featured events.', err.message);
    }
});
