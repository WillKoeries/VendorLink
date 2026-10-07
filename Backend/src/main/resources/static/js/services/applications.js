/**
 * Applications service
 * --------------------
 * A vendor applies for a stall at an event; the event's organiser reviews it.
 * Status flow (UML ApplicationStatus):
 *   PENDING → APPROVED | REJECTED   (organiser decides)
 *   PENDING → CANCELLED             (vendor withdraws, or the event is cancelled)
 *
 * Fully integrated with Spring Boot REST API (/api/applications).
 * Supports DEMO_MODE fallback if APP_CONFIG.DEMO_MODE is true.
 */

// ---------- Helpers ----------
function getAppAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function normalizeApplication(a) {
  if (!a) return null;
  const eventId = Number(a.eventId || (a.event && a.event.id) || 0);
  const vendorId = Number(a.vendorId || (a.vendor && a.vendor.id) || 0);

  const eventObj = a.event || {
    id: eventId,
    title: a.eventTitle || 'Event',
    date: a.eventDate || '',
    endDate: a.eventEndDate || '',
    location: a.eventLocation || '',
    city: a.eventCity || '',
    province: a.eventProvince || '',
    stallFee: Number(a.stallFee) || 0,
    bannerImageUrl: a.bannerImageUrl || a.eventBannerImageUrl || '',
    status: (a.eventStatus || 'OPEN').toUpperCase(),
    availableStalls: a.availableStalls ?? 0,
    totalStalls: a.totalStalls ?? 0
  };

  const vendorObj = a.vendor || {
    id: vendorId,
    fullName: a.vendorName || 'Vendor',
    email: a.vendorEmail || '',
    phone: a.vendorPhone || ''
  };

  return {
    ...a,
    id: Number(a.id),
    eventId,
    vendorId,
    businessName: a.businessName || '',
    productsDescription: a.productsDescription || '',
    specialRequirements: a.specialRequirements || '',
    status: (a.status || ApplicationStatus.PENDING).toUpperCase(),
    reviewNotes: a.reviewNotes || '',
    appliedAt: a.appliedAt || new Date().toISOString(),
    reviewedAt: a.reviewedAt || null,
    event: eventObj,
    vendor: vendorObj
  };
}

function attachApplicationRelations(application, db) {
  const event = db.events.find(e => e.id === application.eventId);
  const vendorUser = db.users.find(u => u.id === application.vendorId);
  const vendorProfile = db.vendorProfiles ? db.vendorProfiles.find(p => p.userId === application.vendorId) || null : null;
  return {
    ...application,
    event: event ? attachEventRelations(event, db) : null,
    vendor: vendorUser
      ? { id: vendorUser.id, fullName: vendorUser.fullName, email: vendorUser.email, phone: vendorUser.phone, profile: vendorProfile }
      : null
  };
}

function newestFirst(a, b) {
  return (b.appliedAt || '').localeCompare(a.appliedAt || '');
}

function addDemoNotification(db, recipientId, type, referenceId, title, message) {
  if (!db.notifications) db.notifications = [];
  db.notifications.push({
    id: nextDemoId(db.notifications),
    recipientId, type, referenceId,
    isRead: false,
    createdAt: new Date().toISOString(),
    title, message
  });
}

/** Checks the application form values. Returns { fieldName: message }. */
function validateApplicationData(data) {
  const errors = {};
  if (!data.businessName || data.businessName.trim().length < 2) {
    errors.businessName = 'Enter your business or brand name.';
  }
  if (!data.productsDescription || data.productsDescription.trim().length < 20) {
    errors.productsDescription = 'Tell the organiser what you’ll sell (at least 20 characters).';
  }
  if (data.specialRequirements && data.specialRequirements.length > 500) {
    errors.specialRequirements = 'Keep special requirements under 500 characters.';
  }
  return errors;
}

// ---------- Vendor actions ----------
async function applyForEvent(data) {
  const session = getSession();
  if (!session) throw new Error('Please log in to apply for this event.');
  if (session.role !== Role.VENDOR) throw new Error('Only vendor accounts can apply for stalls.');

  const errors = validateApplicationData(data);
  if (Object.keys(errors).length) {
    throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errors });
  }

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(500);
    const db = getDemoDb();
    const event = db.events.find(e => e.id === Number(data.eventId));
    if (!event) throw new Error('This event no longer exists.');
    if (!canApplyToEvent(event)) throw new Error('This event is not accepting applications right now.');

    const existing = db.applications.find(a =>
      a.eventId === event.id && a.vendorId === session.userId &&
      [ApplicationStatus.PENDING, ApplicationStatus.APPROVED].includes(a.status));
    if (existing) throw new Error('You have already applied for this event.');

    const application = {
      id: nextDemoId(db.applications),
      eventId: event.id,
      vendorId: session.userId,
      businessName: data.businessName.trim(),
      productsDescription: data.productsDescription.trim(),
      specialRequirements: (data.specialRequirements || '').trim(),
      status: ApplicationStatus.PENDING,
      reviewNotes: '',
      appliedAt: new Date().toISOString(),
      reviewedAt: null
    };
    db.applications.push(application);
    addDemoNotification(db, event.organizerId, NotificationType.APPLICATION_SUBMITTED, application.id,
      'New application', `${application.businessName} applied for ${event.title}.`);
    saveDemoDb(db);
    return attachApplicationRelations(application, db);
  }

  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: getAppAuthHeaders(),
      body: JSON.stringify({
        eventId: Number(data.eventId),
        businessName: data.businessName.trim(),
        productsDescription: data.productsDescription.trim(),
        specialRequirements: (data.specialRequirements || '').trim()
      })
    });

    if (!res.ok) {
      let errMsg = `Failed to submit application: HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.fieldErrors && Object.keys(errJson.fieldErrors).length > 0) {
          throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errJson.fieldErrors });
        }
        if (errJson.message) errMsg = errJson.message;
      } catch (e) {
        if (e.fieldErrors) throw e;
      }
      throw new Error(errMsg);
    }

    const created = await res.json();
    _vlMyAppsCache = null;
    return normalizeApplication(created.data || created);
  } catch (err) {
    console.error('Failed to apply for event:', err);
    throw err;
  }
}

let _vlMyAppsCache = null;
let _vlMyAppsCacheTime = 0;

async function getMyApplications(forceRefresh = false) {
  const session = getSession();
  if (!session) return [];

  if (!forceRefresh && _vlMyAppsCache && (Date.now() - _vlMyAppsCacheTime < 20000)) {
    return _vlMyAppsCache;
  }

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const apps = db.applications
      .filter(a => a.vendorId === session.userId)
      .sort(newestFirst)
      .map(a => attachApplicationRelations(a, db));
    _vlMyAppsCache = apps;
    _vlMyAppsCacheTime = Date.now();
    return apps;
  }

  try {
    const res = await fetch('/api/applications/my', {
      headers: getAppAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return [];
      throw new Error(`Failed to load applications: HTTP ${res.status}`);
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const apps = list.map(normalizeApplication).sort(newestFirst);
    _vlMyAppsCache = apps;
    _vlMyAppsCacheTime = Date.now();
    return apps;
  } catch (err) {
    console.error('Failed to fetch my applications:', err);
    return _vlMyAppsCache || [];
  }
}

/** The vendor's latest application for one event (or null). Used by the event page. */
async function getMyApplicationForEvent(eventId) {
  const session = getSession();
  if (!session || session.role !== Role.VENDOR) return null;

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    const db = getDemoDb();
    const mine = db.applications
      .filter(a => a.eventId === Number(eventId) && a.vendorId === session.userId)
      .sort(newestFirst);
    return mine[0] || null;
  }

  try {
    // Check direct endpoint first
    const directRes = await fetch(`/api/applications/event/${encodeURIComponent(eventId)}/my`, {
      headers: getAppAuthHeaders()
    });
    if (directRes.ok) {
      const directData = await directRes.json();
      if (directData && directData.id) {
        return normalizeApplication(directData);
      }
    }
  } catch (e) {
    // Fall back to filtering all vendor applications below
  }

  try {
    const list = await getMyApplications();
    const targetId = Number(eventId);
    const mine = list
      .filter(a => Number(a.eventId) === targetId)
      .sort(newestFirst);
    return mine[0] || null;
  } catch (err) {
    console.warn(`Could not fetch application for event ${eventId}:`, err);
    return null;
  }
}

async function cancelApplication(id) {
  const session = getSession();
  if (!session) throw new Error('Please log in.');

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const application = db.applications.find(a => a.id === Number(id));
    if (!application || application.vendorId !== session.userId) {
      throw new Error('Application not found.');
    }
    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Only pending applications can be withdrawn.');
    }
    application.status = ApplicationStatus.CANCELLED;

    const event = db.events.find(e => e.id === application.eventId);
    if (event) {
      addDemoNotification(db, event.organizerId, NotificationType.APPLICATION_CANCELLED, application.id,
        'Application withdrawn', `${application.businessName} withdrew their application for ${event.title}.`);
    }
    saveDemoDb(db);
    return attachApplicationRelations(application, db);
  }

  let res;
  try {
    res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: getAppAuthHeaders()
    });
  } catch (networkErr) {
    throw new Error('Unable to connect to the VendorLink server. Please check your internet connection.');
  }

  if (!res.ok) {
    let errMsg = `Failed to withdraw application: HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errMsg = errJson.message;
    } catch (e) { }
    throw new Error(errMsg);
  }

  _vlMyAppsCache = null;
  return { id: Number(id), status: ApplicationStatus.CANCELLED };
}

// ---------- Organiser actions ----------
/** Applications for the events the logged-in organiser manages (admins: all events). */
async function getOrganizerApplications() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see applications.');

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    const myEventIds = db.events.filter(e => canManageEvent(e, session)).map(e => e.id);
    return db.applications
      .filter(a => myEventIds.includes(a.eventId))
      .sort(newestFirst)
      .map(a => attachApplicationRelations(a, db));
  }

  try {
    const res = await fetch('/api/applications/organizer', {
      headers: getAppAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      return list.map(normalizeApplication).sort(newestFirst);
    }
  } catch (err) {
    console.warn('Direct organizer applications fetch failed, checking fallback:', err);
  }

  // Fallback: if organizer has events, fetch by event ID
  try {
    const myEventsRes = await fetch('/api/events/organizer/my-events', {
      headers: getAppAuthHeaders()
    });
    if (myEventsRes.ok) {
      const myEvents = await myEventsRes.json();
      const eventsList = Array.isArray(myEvents) ? myEvents : (myEvents && Array.isArray(myEvents.data) ? myEvents.data : []);
      const results = [];
      for (const ev of eventsList) {
        try {
          const appRes = await fetch(`/api/applications/event/${ev.id}`, {
            headers: getAppAuthHeaders()
          });
          if (appRes.ok) {
            const apps = await appRes.json();
            const arr = Array.isArray(apps) ? apps : (apps && Array.isArray(apps.data) ? apps.data : []);
            results.push(...arr.map(normalizeApplication));
          }
        } catch (e) { }
      }
      return results.sort(newestFirst);
    }
  } catch (e) {
    console.warn('Fallback organizer applications fetch failed:', e);
  }

  return [];
}

/**
 * Approve or reject a PENDING application.
 * Approving takes one stall; it is blocked when the event is full.
 */
async function reviewApplication(id, newStatus, reviewNotes = '') {
  const session = getSession();
  if (![ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(newStatus)) {
    throw new Error('Unknown decision.');
  }

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const application = db.applications.find(a => a.id === Number(id));
    if (!application) throw new Error('Application not found.');
    const event = db.events.find(e => e.id === application.eventId);
    if (!event || !canManageEvent(event, session)) throw new Error('You can only review applications for your own events.');
    if (application.status !== ApplicationStatus.PENDING) throw new Error('This application has already been reviewed.');

    if (newStatus === ApplicationStatus.APPROVED) {
      if (event.availableStalls <= 0) throw new Error('This event is fully booked. Increase the stall total or reject the application.');
      event.availableStalls -= 1;
    }

    application.status = newStatus;
    application.reviewNotes = reviewNotes.trim();
    application.reviewedAt = new Date().toISOString();

    const approved = newStatus === ApplicationStatus.APPROVED;
    addDemoNotification(db, application.vendorId,
      approved ? NotificationType.APPLICATION_APPROVED : NotificationType.APPLICATION_REJECTED,
      application.id,
      approved ? 'Application approved' : 'Application not successful',
      `Your application for ${event.title} was ${approved ? 'approved' : 'not approved'}.`);

    saveDemoDb(db);
    return attachApplicationRelations(application, db);
  }

  let res;
  try {
    res = await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: getAppAuthHeaders(),
      body: JSON.stringify({
        status: newStatus,
        reviewNotes: reviewNotes.trim()
      })
    });
  } catch (networkErr) {
    throw new Error('Unable to connect to the VendorLink server. Please check your internet connection.');
  }

  if (!res.ok) {
    let errMsg = `Failed to update application status: HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errMsg = errJson.message;
    } catch (e) { }
    throw new Error(errMsg);
  }

  const updated = await res.json();
  return normalizeApplication(updated.data || updated);
}

// Global window assignments
window.applyForEvent = applyForEvent;
window.getMyApplications = getMyApplications;
window.getMyApplicationForEvent = getMyApplicationForEvent;
window.cancelApplication = cancelApplication;
window.getOrganizerApplications = getOrganizerApplications;
window.reviewApplication = reviewApplication;
window.validateApplicationData = validateApplicationData;
window.normalizeApplication = normalizeApplication;
