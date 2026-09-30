/**
 * Applications service
 * --------------------
 * A vendor applies for a stall at an event; the event's organiser reviews it.
 * Status flow (UML ApplicationStatus):
 *   PENDING → APPROVED | REJECTED   (organiser decides)
 *   PENDING → CANCELLED             (vendor withdraws, or the event is cancelled)
 *
 * IMPORTANT: the checks in this file (who may apply, who may approve, stall
 * capacity) only protect the demo. With Supabase the same rules MUST be
 * enforced by Row Level Security policies / database functions, because
 * anything in the browser can be bypassed.
 */

// ---------- Helpers ----------
function attachApplicationRelations(application, db) {
  const event = db.events.find(e => e.id === application.eventId);
  const vendorUser = db.users.find(u => u.id === application.vendorId);
  const vendorProfile = db.vendorProfiles.find(p => p.userId === application.vendorId) || null;
  return {
    ...application,
    event: event ? attachEventRelations(event, db) : null,
    vendor: vendorUser
      ? { id: vendorUser.id, fullName: vendorUser.fullName, email: vendorUser.email, phone: vendorUser.phone, profile: vendorProfile }
      : null
  };
}

function newestFirst(a, b) {
  return b.appliedAt.localeCompare(a.appliedAt);
}

function addDemoNotification(db, recipientId, type, referenceId, title, message) {
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
  if (!data.businessName || data.businessName.trim().length < 2) errors.businessName = 'Enter your business or brand name.';
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
  if (Object.keys(errors).length) throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errors });

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data: created, error } = await supabaseClient.from('applications').insert({
    //   event_id: data.eventId, vendor_id: session.userId,
    //   business_name: data.businessName, products_description: data.productsDescription,
    //   special_requirements: data.specialRequirements, status: 'PENDING'
    // }).select().single();
    // if (error) throw error;
    // return created;
    throw backendNotConnected('applyForEvent');
  }

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

async function getMyApplications() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your applications.');

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabaseClient.from('applications')
    //   .select('*, event:events(*, category:categories(*))')
    //   .eq('vendor_id', session.userId)
    //   .order('applied_at', { ascending: false });
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getMyApplications');
  }
  await demoDelay();
  const db = getDemoDb();
  return db.applications
    .filter(a => a.vendorId === session.userId)
    .sort(newestFirst)
    .map(a => attachApplicationRelations(a, db));
}

/** The vendor's latest application for one event (or null). Used by the event page. */
async function getMyApplicationForEvent(eventId) {
  const session = getSession();
  if (!session || session.role !== Role.VENDOR) return null;

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data } = await supabaseClient.from('applications').select('*')
    //   .eq('event_id', eventId).eq('vendor_id', session.userId)
    //   .order('applied_at', { ascending: false }).limit(1).maybeSingle();
    // return data;
    throw backendNotConnected('getMyApplicationForEvent');
  }
  const db = getDemoDb();
  const mine = db.applications
    .filter(a => a.eventId === Number(eventId) && a.vendorId === session.userId)
    .sort(newestFirst);
  return mine[0] || null;
}

async function cancelApplication(id) {
  const session = getSession();

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase (RLS: vendors may only update their own PENDING applications):
    // const { error } = await supabaseClient.from('applications').update({ status: 'CANCELLED' }).eq('id', id);
    throw backendNotConnected('cancelApplication');
  }
  await demoDelay(400);
  const db = getDemoDb();
  const application = db.applications.find(a => a.id === Number(id));
  if (!application || !session || application.vendorId !== session.userId) {
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

// ---------- Organiser actions ----------
/** Applications for the events the logged-in organiser manages (admins: all events). */
async function getOrganizerApplications() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see applications.');

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase (RLS limits rows to the organiser's own events):
    // const { data, error } = await supabaseClient.from('applications')
    //   .select('*, event:events!inner(*), vendor:users(id, full_name, email, phone, vendor_profile:vendor_profiles(*))')
    //   .eq('event.organizer_id', session.userId)
    //   .order('applied_at', { ascending: false });
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getOrganizerApplications');
  }
  await demoDelay();
  const db = getDemoDb();
  const myEventIds = db.events.filter(e => canManageEvent(e, session)).map(e => e.id);
  return db.applications
    .filter(a => myEventIds.includes(a.eventId))
    .sort(newestFirst)
    .map(a => attachApplicationRelations(a, db));
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

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase: do this in ONE database function (RPC) so the stall count and
    // the status change happen together and can't overbook, e.g.
    // const { error } = await supabaseClient.rpc('review_application', { application_id: id, new_status: newStatus, notes: reviewNotes });
    throw backendNotConnected('reviewApplication');
  }
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
