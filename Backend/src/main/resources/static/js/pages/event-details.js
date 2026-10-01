/**
 * Event Details page
 * ------------------
 * Reads ?id= from the URL, loads that event, fills in the page and shows
 * the right "Apply" button for the current user. There is NO fallback to
 * another event: a missing or unknown id shows "Event not found".
 */

let currentEvent = null;
let myApplication = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('applyForm').addEventListener('submit', submitApplication);
  loadEvent();
});

// ---------- Loading ----------
async function loadEvent() {
  const stateEl = document.getElementById('eventState');
  const contentEl = document.getElementById('eventContent');
  const id = getQueryParam('id');

  contentEl.hidden = true;

  if (!id || !/^\d+$/.test(id)) {
    showNotFound();
    return;
  }

  renderLoading(stateEl, 'Loading event…');

  try {
    currentEvent = await getEventById(id);
    if (!currentEvent) {
      showNotFound();
      return;
    }
    myApplication = await getMyApplicationForEvent(currentEvent.id);
    stateEl.innerHTML = '';
    renderEvent(currentEvent);
    renderApplyAction();
    contentEl.hidden = false;
  } catch (err) {
    renderError(stateEl, {
      title: 'Unable to load this event',
      message: 'Please check your connection and try again.',
      onRetry: loadEvent
    });
  }
}

function showNotFound() {
  document.title = 'Event not found | VendorLink';
  document.getElementById('breadcrumbTitle').textContent = 'Event not found';
  renderEmpty(document.getElementById('eventState'), {
    icon: 'fa-calendar-xmark',
    title: 'Event not found',
    message: 'This event may have been removed, or the link is incorrect.',
    action: { label: 'Browse all events', href: 'browse-events.html', icon: 'fa-magnifying-glass' }
  });
}

// ---------- Rendering (textContent is used for all data, so nothing can inject HTML) ----------
function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderEvent(event) {
  document.title = `${event.title} | VendorLink`;
  setText('breadcrumbTitle', event.title);

  const session = getSession();
  document.getElementById('draftNote').hidden = event.status !== EventStatus.DRAFT;

  // Banner
  const banner = document.getElementById('eventBanner');
  banner.src = eventImageUrl(event);
  banner.alt = event.title;
  setText('eventCategory', event.category ? event.category.name : 'Uncategorised');
  document.getElementById('eventStatusBadge').innerHTML = eventStatusBadge(event);
  setText('eventTitle', event.title);
  setText('heroDates', formatEventDates(event));
  setText('heroPlace', [event.location, event.city].filter(Boolean).join(', '));

  // Description: blank lines become separate paragraphs
  const description = document.getElementById('eventDescription');
  description.innerHTML = '';
  (event.description || 'The organiser has not added a description yet.')
    .split(/\n\s*\n/)
    .forEach(text => {
      const p = document.createElement('p');
      p.textContent = text.trim();
      description.appendChild(p);
    });

  // Information
  setText('infoDates', formatEventDates(event));
  setText('infoTime', event.time || 'To be confirmed');
  setText('infoLocation', event.location || 'To be confirmed');
  setText('infoCity', [event.city, event.province].filter(Boolean).join(', ') || '—');
  setText('infoVisitors', event.expectedVisitors || 'Not specified');
  setText('infoStalls', `${event.totalStalls} in total · ${event.availableStalls} available`);
  setText('infoCategory', event.category ? event.category.name : 'Uncategorised');
  setText('infoFee', formatCurrency(event.stallFee));

  // Requirements: one per line
  const list = document.getElementById('eventRequirements');
  list.innerHTML = '';
  const requirements = (event.requirements || '').split('\n').map(r => r.trim()).filter(Boolean);
  if (!requirements.length) requirements.push('No special requirements listed for this event.');
  requirements.forEach(text => {
    const li = document.createElement('li');
    li.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
    const span = document.createElement('span');
    span.textContent = text;
    li.appendChild(span);
    list.appendChild(li);
  });

  renderOrganizer(event.organizer);

  // Apply card numbers
  setText('applyFee', formatCurrency(event.stallFee));
  setText('applyAvailabilityText', availabilityText(event));
  document.getElementById('applyStatusBadge').innerHTML = eventStatusBadge(event);
  document.getElementById('applyOccupancy').innerHTML = occupancyBarHtml(event);
  setText('applyBookedText', `${getBookedStalls(event)} of ${event.totalStalls} stalls booked`);
}

function renderOrganizer(organizer) {
  const profile = organizer ? organizer.profile : null;
  const name = profile?.organizationName || organizer?.fullName || 'VendorLink organiser';
  setText('organizerAvatar', getInitials(name));
  setText('organizerName', name);
  setText('organizerDescription', profile?.description || '');

  const contact = document.getElementById('organizerContact');
  contact.innerHTML = '';
  const items = [];
  if (profile?.phone) items.push({ icon: 'fa-phone', text: profile.phone, href: `tel:${profile.phone.replace(/\s/g, '')}` });
  if (safeUrl(profile?.website)) items.push({ icon: 'fa-globe', text: profile.website.replace(/^https?:\/\//, ''), href: safeUrl(profile.website), external: true });
  if (profile?.address) items.push({ icon: 'fa-location-dot', text: profile.address });

  items.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="fa-solid ${item.icon}" aria-hidden="true"></i>`;
    const el = document.createElement(item.href ? 'a' : 'span');
    el.textContent = item.text;
    if (item.href) {
      el.href = item.href;
      if (item.external) {
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
    }
    li.appendChild(el);
    contact.appendChild(li);
  });
}

// ---------- The apply button changes with the event and the user ----------
function renderApplyAction() {
  const container = document.getElementById('applyAction');
  const event = currentEvent;
  const session = getSession();
  const eventUrl = `event-details.html?id=${event.id}`;

  const disabled = (label, note) => `
    <button type="button" class="btn btn-secondary" disabled>${label}</button>
    ${note ? `<p>${note}</p>` : ''}`;

  // 1. The event itself isn't taking applications
  if (event.status === EventStatus.DRAFT) {
    container.innerHTML = `<a class="btn btn-primary" href="organizer-dashboard.html#events"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Edit in dashboard</a>`;
    return;
  }
  if (event.status === EventStatus.CLOSED) {
    container.innerHTML = disabled('<i class="fa-solid fa-lock" aria-hidden="true"></i> Applications closed', 'The organiser is no longer accepting applications.');
    return;
  }
  if (event.status === EventStatus.COMPLETED) {
    container.innerHTML = disabled('Event has ended', 'Browse upcoming events to find your next market.');
    return;
  }
  if (event.status === EventStatus.CANCELLED) {
    container.innerHTML = disabled('Event cancelled', 'This event was cancelled by the organiser.');
    return;
  }

  // 2. Organisers and admins can't apply
  if (session && session.role !== Role.VENDOR) {
    const ownsEvent = session.role === Role.ADMIN || event.organizerId === session.userId;
    container.innerHTML = ownsEvent
      ? `<a class="btn btn-primary" href="organizer-dashboard.html#applications"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> Review applications</a>`
      : disabled('Vendor accounts only', 'You’re logged in as an organiser. Only vendors can apply for stalls.');
    return;
  }

  // 3. The vendor already has an active application
  if (myApplication && [ApplicationStatus.PENDING, ApplicationStatus.APPROVED].includes(myApplication.status)) {
    const approved = myApplication.status === ApplicationStatus.APPROVED;
    container.innerHTML = `
      <div class="alert ${approved ? 'alert-success' : 'alert-warning'}">
        <i class="fa-solid ${approved ? 'fa-circle-check' : 'fa-hourglass-half'}" aria-hidden="true"></i>
        <span>${approved ? 'Your application was approved.' : 'Your application is waiting for review.'}
          Applied ${escapeHtml(formatDateTime(myApplication.appliedAt))}.</span>
      </div>
      <a class="btn btn-secondary" href="vendor-dashboard.html#applications">View my applications</a>`;
    return;
  }

  // 4. No stalls left
  if (isEventFull(event)) {
    container.innerHTML = disabled('<i class="fa-solid fa-ban" aria-hidden="true"></i> Fully booked', 'All stalls have been allocated. Check back in case one becomes available.');
    return;
  }

  // 5. Not logged in
  if (!session) {
    const redirect = encodeURIComponent(eventUrl);
    container.innerHTML = `
      <a class="btn btn-primary" href="login.html?redirect=${redirect}"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Log in to apply</a>
      <p>New to VendorLink? <a href="register.html?role=VENDOR&amp;redirect=${redirect}">Create a free vendor account</a></p>`;
    return;
  }

  // 6. Vendor can apply (again, if an earlier application was rejected or withdrawn)
  const previous = myApplication
    ? `<p>Your previous application was ${escapeHtml(APPLICATION_STATUS_UI[myApplication.status].label.toLowerCase())}. You can apply again.</p>`
    : '';
  container.innerHTML = `
    <button type="button" class="btn btn-primary" id="openApplyBtn">
      <i class="fa-solid fa-file-signature" aria-hidden="true"></i> Apply for a stall
    </button>${previous}`;
  document.getElementById('openApplyBtn').addEventListener('click', openApplyModal);
}

// ---------- Apply modal ----------
async function openApplyModal() {
  const form = document.getElementById('applyForm');
  form.reset();
  clearFieldErrors(form);
  document.getElementById('applyFormAlert').hidden = true;
  setText('modalEventTitle', currentEvent.title);
  setText('modalEventFee', `${formatCurrency(currentEvent.stallFee)} stall fee`);
  openModal('applyModal');

  // Pre-fill the business name from the vendor's profile
  try {
    const { profile } = await getMyVendorProfile();
    if (profile && profile.businessName && !form.elements.businessName.value) {
      form.elements.businessName.value = profile.businessName;
      form.elements.productsDescription.focus();
    }
  } catch (err) {
    // Not essential: the vendor can type it in
  }
}

async function submitApplication(e) {
  e.preventDefault();
  const form = e.target;
  const alertEl = document.getElementById('applyFormAlert');
  const submitBtn = document.getElementById('applySubmitBtn');
  alertEl.hidden = true;

  const data = {
    eventId: currentEvent.id,
    businessName: form.elements.businessName.value,
    productsDescription: form.elements.productsDescription.value,
    specialRequirements: form.elements.specialRequirements.value
  };

  const errors = validateApplicationData(data);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);

  setButtonLoading(submitBtn, true, 'Submitting…');
  try {
    myApplication = await applyForEvent(data);
    closeModal('applyModal');
    showToast(`Application sent to ${currentEvent.organizer?.profile?.organizationName || 'the organiser'}. You'll be notified when they decide.`, 'success', 6000);
    renderApplyAction();
  } catch (err) {
    if (err.fieldErrors) {
      showFieldErrors(form, err.fieldErrors);
    } else {
      alertEl.textContent = err.message || 'Your application could not be sent. Please try again.';
      alertEl.hidden = false;
    }
  } finally {
    setButtonLoading(submitBtn, false);
  }
}
