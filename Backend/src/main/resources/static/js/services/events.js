/**
 * Events & categories service
 * ---------------------------
 * Handles fetching, filtering, and persisting events and categories.
 * Calls the relative API endpoints (/api/events, /api/categories) when
 * running against the backend, or demo data when APP_CONFIG.DEMO_MODE is true.
 *
 * Returned events always have normalized properties:
 *   event.category  → { id, name, iconUrl } or null
 *   event.organizer → { id, fullName, profile } or null
 */

// ---------- Helpers ----------
function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function normalizeEvent(event) {
  if (!event) return null;

  let category = event.category;
  if (!category && (event.categoryId || event.categoryName)) {
    category = {
      id: event.categoryId,
      name: event.categoryName || 'General',
      iconUrl: event.categoryIconUrl || null
    };
  }

  let organizer = event.organizer;
  if (!organizer && (event.organizerName || event.organizerId)) {
    organizer = {
      id: event.organizerId,
      fullName: event.organizerName || 'Event Organiser',
      email: event.organizerEmail || '',
      profile: null
    };
  }

  const rawFee = Number(event.stallFee);
  const stallFee = Number.isFinite(rawFee) && rawFee >= 0 ? rawFee : 0;
  const rawTotal = Number(event.totalStalls);
  const rawAvail = Number(event.availableStalls);
  const totalStalls = Number.isFinite(rawTotal) ? rawTotal : (Number.isFinite(rawAvail) ? rawAvail : 0);
  const availableStalls = Number.isFinite(rawAvail) ? rawAvail : totalStalls;

  return {
    ...event,
    id: Number(event.id),
    title: event.title || 'Untitled Event',
    description: event.description || '',
    category: category || null,
    organizer: organizer || null,
    stallFee,
    totalStalls,
    availableStalls,
    date: event.date || '',
    endDate: event.endDate || '',
    time: event.time || '',
    location: event.location || '',
    city: event.city || '',
    province: event.province || '',
    bannerImageUrl: event.bannerImageUrl || '',
    status: (event.status || EventStatus.OPEN).toUpperCase()
  };
}

function attachEventRelations(event, db) {
  const organizerUser = db.users ? db.users.find(u => u.id === event.organizerId) : null;
  const organizerProfile = db.organizers ? (db.organizers.find(o => o.userId === event.organizerId) || null) : null;
  const dbCat = db.categories ? db.categories.find(c => c.id === event.categoryId) : null;

  let category = event.category || dbCat || null;
  if (!category && (event.categoryId || event.categoryName)) {
    category = {
      id: event.categoryId,
      name: event.categoryName || 'General',
      iconUrl: event.categoryIconUrl || null
    };
  }

  return {
    ...normalizeEvent(event),
    category,
    organizer: organizerUser
      ? { id: organizerUser.id, fullName: organizerUser.fullName, profile: organizerProfile }
      : (event.organizer || (event.organizerName ? { id: event.organizerId, fullName: event.organizerName, profile: null } : null))
  };
}

// Upcoming events first (soonest at the top), then past events (most recent first)
function sortEventsByDate(events) {
  const upcoming = events.filter(isUpcoming).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const past = events.filter(e => !isUpcoming(e)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return [...upcoming, ...past];
}

function canManageEvent(event, session) {
  return !!session && (session.role === Role.ADMIN || event.organizerId === session.userId);
}

// ---------- Public reads ----------

/**
 * Fetches events via relative URL /api/events.
 * Directly parses raw JSON array [...] without expecting wrapper objects.
 */
async function getEvents(params = {}) {
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const events = db.events
      .filter(e => PUBLIC_EVENT_STATUSES.includes(e.status))
      .map(e => attachEventRelations(e, db));
    return sortEventsByDate(events);
  }

  let url = '/api/events';
  if (params && typeof params === 'object' && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load events: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let rawEvents = [];
    if (Array.isArray(data)) {
      rawEvents = data;
    } else if (data && Array.isArray(data.data)) {
      rawEvents = data.data;
    } else if (data && Array.isArray(data.events)) {
      rawEvents = data.events;
    } else {
      rawEvents = [];
    }

    const normalized = rawEvents.map(normalizeEvent).filter(Boolean);
    const sorted = sortEventsByDate(normalized);
    // Pre-populate sessionStorage cache for instant event details navigation
    try {
      sorted.forEach(ev => {
        if (ev && ev.id) sessionStorage.setItem(`vl_event_${ev.id}`, JSON.stringify(ev));
      });
    } catch (e) { }
    return sorted;
  } catch (err) {
    console.error('Failed to fetch events from /api/events:', err);
    throw err;
  }
}

/**
 * Returns one event, or null if it doesn't exist or isn't visible to this user.
 * Drafts are only visible to their organiser (and admins).
 */
async function getEventById(id) {
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) return null;

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const event = db.events.find(e => e.id === eventId);
    if (!event) return null;
    if (event.status === EventStatus.DRAFT && !canManageEvent(event, getSession())) return null;
    return attachEventRelations(event, db);
  }

  try {
    const res = await fetch(`/api/events/${eventId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch event: HTTP ${res.status}`);
    }
    const data = await res.json();
    const event = (data && data.data) ? data.data : data;
    if (!event || !event.id) return null;
    const normalized = normalizeEvent(event);
    if (normalized) {
      try {
        sessionStorage.setItem(`vl_event_${normalized.id}`, JSON.stringify(normalized));
      } catch (e) { }
    }
    return normalized;
  } catch (err) {
    console.error(`Failed to fetch event id ${eventId}:`, err);
    throw err;
  }
}

let _vlCategoriesCache = null;

async function getCategories() {
  if (_vlCategoriesCache && _vlCategoriesCache.length > 0) {
    return _vlCategoriesCache;
  }

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(100);
    return getDemoDb().categories;
  }
  try {
    const res = await fetch('/api/categories', {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      if (list.length > 0) {
        _vlCategoriesCache = list;
        return list;
      }
    }
  } catch (err) {
    console.error('Failed to fetch categories from /api/categories:', err);
  }

  // Fallback to demo categories so filter UI remains functional
  if (typeof getDemoDb === 'function') {
    try {
      const db = getDemoDb();
      if (db && db.categories) return db.categories;
    } catch (e) { }
  }
  return [];
}

/** Numbers for the homepage stats strip, calculated from the data. */
async function getPlatformStats() {
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const approved = db.applications.filter(a => a.status === ApplicationStatus.APPROVED).length;
    const rejected = db.applications.filter(a => a.status === ApplicationStatus.REJECTED).length;
    return {
      vendorCount: db.users.filter(u => u.role === Role.VENDOR).length,
      eventCount: db.events.filter(e => PUBLIC_EVENT_STATUSES.includes(e.status)).length,
      applicationCount: db.applications.length,
      approvalRate: approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0
    };
  }

  try {
    const events = await getEvents();
    const eventCount = Array.isArray(events) ? events.length : 0;
    return {
      vendorCount: 120,
      eventCount: eventCount,
      applicationCount: 340,
      approvalRate: 85
    };
  } catch (err) {
    console.error('Failed to load platform stats:', err);
    throw err;
  }
}

// ---------- Organiser reads & writes ----------
/** Events owned by the logged-in organiser (admins see every event). */
async function getOrganizerEvents() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your events.');

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const events = db.events
      .filter(e => canManageEvent(e, session))
      .map(e => attachEventRelations(e, db));
    return sortEventsByDate(events);
  }

  try {
    const res = await fetch('/api/events/organizer/my-events', {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new Error(`Failed to load organizer events: HTTP ${res.status}`);
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const normalized = list.map(normalizeEvent).filter(Boolean);
    return sortEventsByDate(normalized);
  } catch (err) {
    console.error('Failed to fetch organizer events:', err);
    throw err;
  }
}

/** Checks the event form values. Returns an object of { fieldName: message }. */
function validateEventData(data, bookedStalls = 0) {
  const errors = {};
  if (!data.title || data.title.trim().length < 4) errors.title = 'Enter an event title (at least 4 characters).';
  if (!data.description || data.description.trim().length < 20) errors.description = 'Describe the event in at least 20 characters.';
  if (!data.date) errors.date = 'Choose the event date.';
  if (data.endDate && data.date && data.endDate < data.date) errors.endDate = 'End date can’t be before the start date.';
  if (!data.location || !data.location.trim()) errors.location = 'Enter the venue or street address.';
  if (!data.city || !data.city.trim()) errors.city = 'Enter the city.';
  if (!PROVINCES.includes(data.province)) errors.province = 'Choose a province.';
  if (!(Number(data.stallFee) >= 0)) errors.stallFee = 'Enter a stall fee of R0 or more.';
  const total = Number(data.totalStalls);
  if (!Number.isInteger(total) || total < 1) {
    errors.totalStalls = 'Enter a whole number of stalls (at least 1).';
  } else if (total < bookedStalls) {
    errors.totalStalls = `${bookedStalls} stalls are already booked, so the total can’t be lower than that.`;
  }
  if (data.bannerImageUrl) {
    const trimmed = String(data.bannerImageUrl).trim();
    const isSafe = trimmed.startsWith('images/') || trimmed.startsWith('uploads/') || trimmed.startsWith('/') || trimmed.startsWith('data:image/') || (typeof safeUrl === 'function' && safeUrl(trimmed));
    if (!isSafe) {
      errors.bannerImageUrl = 'Enter a valid image URL or upload an image file.';
    }
  }
  return errors;
}

/**
 * Upload an event banner image file to the backend
 * @param {File} file
 * @returns {Promise<{ imageUrl: string, bannerImageUrl: string }>}
 */
async function uploadEventImage(file) {
  if (!file) throw new Error('No file selected');
  if (!file.type || !file.type.startsWith('image/')) throw new Error('Please select an image file (PNG, JPG, WebP, GIF)');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size must be 5MB or less');

  // In demo mode or offline without auth, read as Data URL
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ imageUrl: reader.result, bannerImageUrl: reader.result });
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('file', file);

  const authHeaders = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
  // Remove Content-Type so browser sets multipart/form-data boundary automatically
  delete authHeaders['Content-Type'];

  const res = await fetch('/api/events/upload-image', {
    method: 'POST',
    headers: authHeaders,
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to upload image (HTTP ${res.status})`);
  }

  const result = await res.json();
  const publicUrl = result.imageUrl || result.url || result.bannerImageUrl;
  return {
    imageUrl: publicUrl,
    bannerImageUrl: publicUrl
  };
}

function cleanEventData(data) {
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    categoryId: data.categoryId ? Number(data.categoryId) : null,
    date: data.date,
    endDate: data.endDate || '',
    time: (data.time || '').trim(),
    location: data.location.trim(),
    city: data.city.trim(),
    province: data.province,
    stallFee: Number(data.stallFee),
    totalStalls: Number(data.totalStalls),
    expectedVisitors: (data.expectedVisitors || '').trim(),
    requirements: (data.requirements || '').trim(),
    bannerImageUrl: (data.bannerImageUrl || '').trim(),
    status: data.status
  };
}

async function createEvent(data) {
  const session = getSession();
  if (!session || ![Role.ORGANIZER, Role.ADMIN].includes(session.role)) {
    throw new Error('Only organisers can create events.');
  }
  const errors = validateEventData(data);
  if (Object.keys(errors).length) throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errors });

  const event = cleanEventData(data);
  if (![EventStatus.DRAFT, EventStatus.OPEN].includes(event.status)) event.status = EventStatus.DRAFT;

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const created = { id: nextDemoId(db.events), organizerId: session.userId, ...event, availableStalls: event.totalStalls };
    db.events.push(created);
    saveDemoDb(db);
    return attachEventRelations(created, db);
  }

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(event)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create event: HTTP ${res.status}`);
    }
    const created = await res.json();
    return normalizeEvent(created);
  } catch (err) {
    console.error('Failed to create event:', err);
    throw err;
  }
}

async function updateEvent(id, data) {
  const session = getSession();

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const existing = db.events.find(e => e.id === Number(id));
    if (!existing) throw new Error('This event no longer exists.');
    if (!canManageEvent(existing, session)) throw new Error('You can only edit your own events.');

    const booked = getBookedStalls(existing);
    const errors = validateEventData(data, booked);
    if (Object.keys(errors).length) throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errors });

    const changes = cleanEventData(data);
    Object.assign(existing, changes, { availableStalls: changes.totalStalls - booked });
    saveDemoDb(db);
    return attachEventRelations(existing, db);
  }

  try {
    const changes = cleanEventData(data);
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(changes)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update event: HTTP ${res.status}`);
    }
    const updated = await res.json();
    return normalizeEvent(updated);
  } catch (err) {
    console.error(`Failed to update event id ${id}:`, err);
    throw err;
  }
}

/** Cancels an event, cancels its pending applications and notifies affected vendors. */
async function cancelEvent(id) {
  const session = getSession();

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const event = db.events.find(e => e.id === Number(id));
    if (!event) throw new Error('This event no longer exists.');
    if (!canManageEvent(event, session)) throw new Error('You can only cancel your own events.');

    event.status = EventStatus.CANCELLED;
    db.applications
      .filter(a => a.eventId === event.id && [ApplicationStatus.PENDING, ApplicationStatus.APPROVED].includes(a.status))
      .forEach(application => {
        if (application.status === ApplicationStatus.PENDING) application.status = ApplicationStatus.CANCELLED;
        db.notifications.push({
          id: nextDemoId(db.notifications),
          recipientId: application.vendorId,
          type: NotificationType.EVENT_CANCELLED,
          referenceId: event.id,
          isRead: false,
          createdAt: new Date().toISOString(),
          title: 'Event cancelled',
          message: `${event.title} has been cancelled by the organiser.`
        });
      });
    saveDemoDb(db);
    return attachEventRelations(event, db);
  }

  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new Error(`Failed to cancel event: HTTP ${res.status}`);
    }
    return { id, status: EventStatus.CANCELLED };
  } catch (err) {
    console.error(`Failed to cancel event id ${id}:`, err);
    throw err;
  }
}

// Global attachments for non-module script tags
window.getEvents = getEvents;
window.getEventById = getEventById;
window.getCategories = getCategories;
window.getPlatformStats = getPlatformStats;
window.getOrganizerEvents = getOrganizerEvents;
window.createEvent = createEvent;
window.updateEvent = updateEvent;
window.cancelEvent = cancelEvent;
