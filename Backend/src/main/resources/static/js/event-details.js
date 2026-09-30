/**
 * VendorLink Event Details Controller
 * Fetches specific event details, renders dynamic information, and handles vendor stall applications.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Extract Event ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    const bannerImg = document.querySelector('.event-details .banner');
    const titleEl = document.querySelector('.event-details .left h1');
    const statusEl = document.querySelector('.event-details .status');
    const descEl = document.querySelector('.event-details .left p');
    const infoList = document.querySelector('.event-details .info-list');
    const requirementsList = document.querySelector('.event-details .requirements');
    const priceEl = document.querySelector('.apply-card .price h1');
    const applyBtn = document.querySelector('.apply-card .primary-btn');
    const organizerBox = document.querySelector('.apply-card');

    let currentEvent = null;

    if (!eventId) {
        showToast('No event ID specified in URL.', 'warning');
        if (titleEl) titleEl.textContent = 'Event Not Found';
        if (applyBtn) applyBtn.style.display = 'none';
        return;
    }

    // Load Event Details from Backend
    async function loadEventDetails() {
        try {
            currentEvent = await eventsAPI.getEventById(eventId);
            renderEvent(currentEvent);
        } catch (err) {
            console.error('Failed to load event details:', err);
            showToast('Unable to load event details: ' + err.message, 'error');
            if (titleEl) {
                titleEl.textContent = 'Event Not Found';
            }
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.style.opacity = '0.5';
            }
        }
    }

    function renderEvent(event) {
        document.title = `${event.title} | VendorLink`;

        if (bannerImg && event.bannerImageUrl) {
            bannerImg.src = event.bannerImageUrl;
            bannerImg.alt = escapeHtml(event.title);
        }

        if (titleEl) titleEl.textContent = event.title;

        const isAvailable = event.status === 'OPEN' && (event.availableStalls === null || event.availableStalls > 0);

        if (statusEl) {
            statusEl.textContent = isAvailable ? 'Applications Open' : (event.status === 'OPEN' ? 'Sold Out' : 'Applications Closed');
            statusEl.className = `status ${isAvailable ? 'open' : 'closed'}`;
        }

        if (descEl && event.description) {
            descEl.textContent = event.description;
        }

        if (priceEl) {
            priceEl.textContent = formatCurrency(event.stallFee);
        }

        if (infoList) {
            const loc = escapeHtml(event.location);
            const cityStr = event.city ? ', ' + escapeHtml(event.city) : '';
            const timeStr = escapeHtml(event.time || '09:00 - 17:00');
            const stallsStr = event.availableStalls !== null && event.availableStalls !== undefined ? event.availableStalls : 'N/A';
            const visitorsStr = escapeHtml(event.expectedVisitors || '3,000+');

            infoList.innerHTML = `
                <li>📅 <strong>Date:</strong> ${formatDate(event.date)}</li>
                <li>📍 <strong>Location:</strong> ${loc}${cityStr}</li>
                <li>🕘 <strong>Time:</strong> ${timeStr}</li>
                <li>🏪 <strong>Available Stalls:</strong> ${stallsStr}</li>
                <li>👥 <strong>Expected Visitors:</strong> ${visitorsStr}</li>
                <li>💰 <strong>Stall Fee:</strong> ${formatCurrency(event.stallFee)}</li>
            `;
        }

        if (requirementsList && event.requirements) {
            const reqs = event.requirements.split('\n').filter(r => r.trim().length > 0);
            if (reqs.length > 0) {
                requirementsList.innerHTML = reqs.map(r => `<li>${escapeHtml(r)}</li>`).join('');
            }
        }

        // Update Organizer Information using organizerName
        if (organizerBox && event.organizerName) {
            const orgTitle = organizerBox.querySelector('h3');
            if (orgTitle) {
                const orgParagraphs = organizerBox.querySelectorAll('p:not(.price + p)');
                if (orgParagraphs.length >= 1) {
                    orgParagraphs[0].textContent = event.organizerName;
                }
            }
        }

        // Disable Apply button if closed or sold out
        if (applyBtn && !isAvailable) {
            applyBtn.disabled = true;
            applyBtn.textContent = event.status === 'OPEN' ? 'Sold Out' : 'Applications Closed';
            applyBtn.style.opacity = '0.6';
            applyBtn.style.pointerEvents = 'none';
        }
    }

    // Modal Injection & Application Handling
    function setupApplicationModal() {
        if (!document.getElementById('application-modal')) {
            const modalHtml = `
                <div id="application-modal" class="modal-overlay">
                    <div class="modal-card">
                        <div class="modal-header">
                            <h2>Apply for Stall</h2>
                            <button type="button" class="modal-close-btn" id="modal-close">&times;</button>
                        </div>
                        <form id="application-form">
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="app-business-name">Business / Brand Name *</label>
                                    <input type="text" id="app-business-name" required placeholder="e.g. Lisa's Artisan Bakery">
                                </div>
                                <div class="form-group">
                                    <label for="app-products">Products / Offerings Description *</label>
                                    <textarea id="app-products" rows="3" required placeholder="Describe what you will be selling..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="app-requirements">Special Requirements (e.g. Electricity, Corner spot)</label>
                                    <textarea id="app-requirements" rows="2" placeholder="Any setup requirements or notes for the organizer..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn-secondary" id="modal-cancel">Cancel</button>
                                <button type="submit" class="btn-primary" id="modal-submit">Submit Application</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const modal = document.getElementById('application-modal');
        const modalClose = document.getElementById('modal-close');
        const modalCancel = document.getElementById('modal-cancel');
        const appForm = document.getElementById('application-form');

        const closeModal = () => {
            modal.classList.remove('active');
        };

        modalClose.addEventListener('click', closeModal);
        modalCancel.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Check login status
                if (!authService.isLoggedIn()) {
                    showToast('Please log in to apply for this event.', 'warning');
                    setTimeout(() => {
                        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
                    }, 1200);
                    return;
                }

                const user = authService.getUser();
                if (user && user.role !== 'VENDOR' && user.role !== 'ADMIN') {
                    showToast('Only registered Vendors can apply for event stalls.', 'warning');
                    return;
                }

                // Pre-fill business name from vendor profile if available
                const businessInput = document.getElementById('app-business-name');
                if (businessInput && !businessInput.value) {
                    vendorsAPI.getMyProfile().then(profile => {
                        if (profile && profile.businessName) {
                            businessInput.value = profile.businessName;
                        }
                    }).catch(() => {});
                }

                modal.classList.add('active');
            });
        }

        // Handle Application Form Submission
        if (appForm) {
            appForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = document.getElementById('modal-submit');
                const businessName = document.getElementById('app-business-name').value.trim();
                const productsDescription = document.getElementById('app-products').value.trim();
                const specialRequirements = document.getElementById('app-requirements').value.trim();

                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

                try {
                    await applicationsAPI.applyForEvent({
                        eventId: Number(eventId),
                        businessName,
                        productsDescription,
                        specialRequirements: specialRequirements || undefined
                    });

                    showToast('Application submitted successfully! The organizer will review your request.', 'success', 5000);
                    closeModal();
                    appForm.reset();
                    // Refresh event details to update remaining stalls
                    loadEventDetails();
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
        }
    }

    setupApplicationModal();
    await loadEventDetails();
});
