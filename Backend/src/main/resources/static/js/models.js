/**
 * VendorLink data model
 * ---------------------
 * Mirrors the UML diagram. Every page uses these enums and shapes, so the
 * same values (e.g. 'ORGANIZER', 'PENDING') are used everywhere.
 *
 * Relationships from the UML (foreign keys are stored as ...Id fields):
 *   VendorProfile 0..1 — 1 User     (vendorProfile.userId)
 *   Organizer     0..1 — 1 User     (organizer.userId)
 *   Event         *    — 1 User     (event.organizerId = the organiser's User id)
 *   Event         *    — 0..1 Category (event.categoryId, may be null)
 *   Application   *    — 1 Event    (application.eventId)
 *   Application   *    — 1 User     (application.vendorId = the vendor's User id)
 *   Notification  *    — 1 User     (notification.recipientId)
 *   VendorProfile.category is stored as text (a category name), not a link.
 */

// ---------- Enums ----------
const Role = Object.freeze({
  VENDOR: 'VENDOR',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN'
});

const ApplicationStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

const EventStatus = Object.freeze({
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

// The UML has a Notification.type field but no enum for it.
// These are the values the frontend understands (assumption — see README).
const NotificationType = Object.freeze({
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_APPROVED: 'APPLICATION_APPROVED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  APPLICATION_CANCELLED: 'APPLICATION_CANCELLED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_CANCELLED: 'EVENT_CANCELLED'
});

// Events with these statuses are visible to the public (DRAFT and CANCELLED are not).
const PUBLIC_EVENT_STATUSES = [EventStatus.OPEN, EventStatus.CLOSED, EventStatus.COMPLETED];

// Valid values for Event.province / VendorProfile.province
const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
];

// ---------- Entity shapes (for reference and editor autocomplete) ----------
/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} fullName
 * @property {string} email
 * @property {string} phone
 * @property {'VENDOR'|'ORGANIZER'|'ADMIN'} role
 * (The UML "password" field is never stored or handled by the frontend —
 *  passwords belong to Supabase Auth.)
 */

/**
 * @typedef {Object} VendorProfile
 * @property {number} id
 * @property {number} userId
 * @property {string} businessName
 * @property {string} description
 * @property {string} category        category name as text (UML: "category as text")
 * @property {string} phone
 * @property {string} website
 * @property {string} city
 * @property {string} province
 * @property {string} address
 * @property {string} profileImageUrl
 */

/**
 * @typedef {Object} Organizer
 * @property {number} id
 * @property {number} userId
 * @property {string} organizationName
 * @property {string} description
 * @property {string} phone
 * @property {string} website
 * @property {string} address
 */

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} iconUrl
 */

/**
 * @typedef {Object} Event
 * @property {number} id
 * @property {number} organizerId     -> User (role ORGANIZER)
 * @property {number|null} categoryId -> Category (optional)
 * @property {string} title
 * @property {string} description
 * @property {string} date            'YYYY-MM-DD'
 * @property {string} endDate         'YYYY-MM-DD' (optional)
 * @property {string} time            e.g. '09:00 – 17:00'
 * @property {string} location        venue name / street
 * @property {string} city
 * @property {string} province
 * @property {number} stallFee        rand
 * @property {number} totalStalls
 * @property {number} availableStalls
 * @property {string} expectedVisitors text in the UML, e.g. '4,500+'
 * @property {string} requirements    one requirement per line
 * @property {string} bannerImageUrl
 * @property {'DRAFT'|'OPEN'|'CLOSED'|'COMPLETED'|'CANCELLED'} status
 * Services also attach: event.category (Category or null) and
 * event.organizer (the organiser's User, with their Organizer profile as organizer.profile)
 */

/**
 * @typedef {Object} Application
 * @property {number} id
 * @property {number} eventId         -> Event
 * @property {number} vendorId        -> User (role VENDOR)
 * @property {string} businessName
 * @property {string} productsDescription
 * @property {string} specialRequirements
 * @property {'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'} status
 * @property {string} reviewNotes
 * @property {string} appliedAt       ISO date-time
 * @property {string} reviewedAt      ISO date-time or null
 * Services also attach: application.event and application.vendor
 * (the vendor's User plus their VendorProfile as vendor.profile)
 */

/**
 * @typedef {Object} Notification
 * @property {number} id
 * @property {number} recipientId     -> User
 * @property {string} title
 * @property {string} message
 * @property {string} type            see NotificationType
 * @property {number} referenceId     id of the related Application or Event
 * @property {boolean} isRead
 * @property {string} createdAt       ISO date-time
 */

// ---------- Display settings for statuses (label + badge colour) ----------
const EVENT_STATUS_UI = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'fa-pen-ruler' },
  OPEN: { label: 'Applications open', tone: 'success', icon: 'fa-circle-check' },
  CLOSED: { label: 'Applications closed', tone: 'warning', icon: 'fa-lock' },
  COMPLETED: { label: 'Completed', tone: 'neutral', icon: 'fa-flag-checkered' },
  CANCELLED: { label: 'Cancelled', tone: 'danger', icon: 'fa-ban' }
};

const APPLICATION_STATUS_UI = {
  PENDING: { label: 'Pending', tone: 'warning', icon: 'fa-hourglass-half' },
  APPROVED: { label: 'Approved', tone: 'success', icon: 'fa-circle-check' },
  REJECTED: { label: 'Rejected', tone: 'danger', icon: 'fa-circle-xmark' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', icon: 'fa-ban' }
};

// ---------- Small rules shared by several pages ----------
// Today's date as 'YYYY-MM-DD' in the user's time zone (same format as Event.date)
function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isUpcoming(event) {
  return (event.endDate || event.date) >= todayIsoDate();
}

function getBookedStalls(event) {
  return Math.max(0, (event.totalStalls || 0) - (event.availableStalls || 0));
}

function getOccupancyPercent(event) {
  if (!event.totalStalls) return 0;
  return Math.round((getBookedStalls(event) / event.totalStalls) * 100);
}

function isEventFull(event) {
  return event.status === EventStatus.OPEN && event.availableStalls <= 0;
}

function canApplyToEvent(event) {
  return event.status === EventStatus.OPEN && event.availableStalls > 0;
}

function getDashboardUrl(role) {
  return role === Role.VENDOR ? 'vendor-dashboard.html' : 'organizer-dashboard.html';
}

function getProfileUrl(role) {
  return role === Role.VENDOR ? 'vendor-dashboard.html#profile' : 'organizer-dashboard.html#settings';
}
