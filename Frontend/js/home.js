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
            // Take up to 3 featured events
            const featured = events.slice(0, 3);

            eventGrid.innerHTML = featured.map((evt, idx) => {
                let img = evt.bannerImageUrl || '';
                if (img === 'images/event-banner.jpg' || img === 'event-banner.jpg') img = 'images/market1.png';
                else if (img === 'images/event2.jpg' || img === 'event2.jpg') img = 'images/market2.png';
                else if (img === 'images/event3.jpg' || img === 'event3.jpg') img = 'images/market3.png';
                else if (img === 'images/event4.jpg' || img === 'event4.jpg') img = 'images/market4.png';
                if (!img) {
                    const fallbackList = ['images/market1.png', 'images/market2.png', 'images/market3.png', 'images/market4.png'];
                    img = fallbackList[idx % fallbackList.length];
                }
                const date = formatDate(evt.date);
                const stalls = evt.availableStalls !== null && evt.availableStalls !== undefined 
                    ? `${evt.availableStalls} Stalls Available` 
                    : 'Stalls Available';

                return `
                    <div class="event-card">
                        <img src="${img}" alt="${evt.title}" onerror="this.src='images/market1.png'">
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
        // If backend is not yet started, keep the existing static content gracefully
        console.warn('Backend events not available, keeping fallback featured events.', err.message);
    }
});
