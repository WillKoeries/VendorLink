/**
 * Events & categories service
 * ---------------------------
 * Pages call these functions and never touch the data source directly.
 * DEMO MODE  → reads/writes the demo data (js/mock-data.js)
 * SUPABASE   → replace each "Supabase:" block with the query shown.
 *
 * Returned events always have the same shape (UML Event) plus:
 *   event.category  → Category or null
 *   event.organizer → { id, fullName, profile: Organizer } or null
 */

// ---------- Helpers ----------
function attachEventRelations(event, db) {
  const organizerUser = db.users.find(u => u.id === event.organizerId);
  const organizerProfile = db.organizers.find(o => o.userId === event.organizerId) || null;
  return {
    ...event,
    category: db.categories.find(c => c.id === event.categoryId) || null,
    organizer: organizerUser
      ? { id: organizerUser.id, fullName: organizerUser.fullName, profile: organizerProfile }
      : null
  };
}

// Upcoming events first (soonest at the top), then past events (most recent first)
function sortEventsByDate(events) {
  const upcoming = events.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter(e => !isUpcoming(e)).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming, ...past];
}

function canManageEvent(event, session) {
  return !!session && (session.role === Role.ADMIN || event.organizerId === session.userId);
}

// ---------- Public reads ----------
async function getEvents() {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabase
    //   .from('events')
    //   .select('*, category:categories(*), organizer:users(id, full_name, organizer:organizers(*))')
    //   .in('status', PUBLIC_EVENT_STATUSES)
    //   .order('date');
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getEvents');
  }
  await demoDelay();
  const db = getDemoDb();
  const events = db.events
    .filter(e => PUBLIC_EVENT_STATUSES.includes(e.status))
    .map(e => attachEventRelations(e, db));
  return sortEventsByDate(events);
}

/**
 * Returns one event, or null if it doesn't exist or isn't visible to this user.
 * Drafts are only visible to their organiser (and admins).
 */
async function getEventById(id) {
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) return null;

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase (RLS should hide drafts from everyone except the owner):
    // const { data, error } = await supabase
    //   .from('events')
    //   .select('*, category:categories(*), organizer:users(id, full_name, organizer:organizers(*))')
    //   .eq('id', eventId)
    //   .maybeSingle();
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getEventById');
  }
  await demoDelay();
  const db = getDemoDb();
  const event = db.events.find(e => e.id === eventId);
  if (!event) return null;
  if (event.status === EventStatus.DRAFT && !canManageEvent(event, getSession())) return null;
  return attachEventRelations(event, db);
}

async function getCategories() {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabaseClient.from('categories').select('*').order('name');
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getCategories');
  }
  await demoDelay(100);
  return getDemoDb().categories;
}

/** Numbers for the homepage stats strip, calculated from the data. */
async function getPlatformStats() {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase: use count queries, e.g.
    // const { count } = await supabaseClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'VENDOR');
    // (or a database view / RPC that returns all four numbers at once)
    throw backendNotConnected('getPlatformStats');
  }
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

// ---------- Organiser reads & writes ----------
/** Events owned by the logged-in organiser (admins see every event). */
async function getOrganizerEvents() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your events.');

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // let query = supabaseClient.from('events').select('*, category:categories(*)').order('date');
    // if (session.role !== 'ADMIN') query = query.eq('organizer_id', session.userId);
    // const { data, error } = await query;
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getOrganizerEvents');
  }
  await demoDelay();
  const db = getDemoDb();
  const events = db.events
    .filter(e => canManageEvent(e, session))
    .map(e => attachEventRelations(e, db));
  return sortEventsByDate(events);
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
  if (data.bannerImageUrl && !safeUrl(data.bannerImageUrl)) errors.bannerImageUrl = 'Enter a full image link starting with https://';
  return errors;
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

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data: created, error } = await supabaseClient.from('events')
    //   .insert({ ...event, organizer_id: session.userId, available_stalls: event.totalStalls })
    //   .select().single();
    // if (error) throw error;
    // return created;
    throw backendNotConnected('createEvent');
  }
  await demoDelay(400);
  const db = getDemoDb();
  const created = { id: nextDemoId(db.events), organizerId: session.userId, ...event, availableStalls: event.totalStalls };
  db.events.push(created);
  saveDemoDb(db);
  return attachEventRelations(created, db);
}

async function updateEvent(id, data) {
  const session = getSession();

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase (RLS must check the user owns the event; available_stalls should be
    // recalculated in the database as total_stalls − approved applications):
    // const { data: updated, error } = await supabaseClient.from('events')
    //   .update({ ...cleanEventData(data) }).eq('id', id).select().single();
    // if (error) throw error;
    // return updated;
    throw backendNotConnected('updateEvent');
  }
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

/** Cancels an event, cancels its pending applications and notifies affected vendors. */
async function cancelEvent(id) {
  const session = getSession();

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { error } = await supabaseClient.from('events').update({ status: 'CANCELLED' }).eq('id', id);
    // (Notifying vendors should happen in a database trigger or edge function.)
    throw backendNotConnected('cancelEvent');
  }
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
