/**
 * Notifications service
 * ---------------------
 * Notifications belong to one User.
 * Connected to Spring Boot endpoints: /api/notifications
 */

function getNotifAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function getMyNotifications() {
  const session = getSession();
  if (!session) return [];

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(150);
    return getDemoDb().notifications
      .filter(n => n.recipientId === session.userId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  try {
    const res = await fetch('/api/notifications', {
      headers: getNotifAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return [];
      throw new Error(`Failed to load notifications: HTTP ${res.status}`);
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    return list.map(n => ({
      id: Number(n.id),
      recipientId: Number(n.userId || session.userId),
      type: n.type || 'NOTIFICATION',
      referenceId: n.referenceId ? Number(n.referenceId) : null,
      isRead: !!n.isRead,
      title: n.title || 'Notification',
      message: n.message || '',
      createdAt: n.createdAt || new Date().toISOString()
    })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('Failed to fetch /api/notifications:', err);
    return [];
  }
}

async function markNotificationRead(id) {
  const session = getSession();
  if (!session) return;

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    const db = getDemoDb();
    const notification = db.notifications.find(n => n.id === Number(id) && session && n.recipientId === session.userId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      saveDemoDb(db);
    }
    return;
  }

  try {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getNotifAuthHeaders()
    });
  } catch (err) {
    console.warn(`Failed to mark notification ${id} read:`, err);
  }
}

async function markAllNotificationsRead() {
  const session = getSession();
  if (!session) return;

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    const db = getDemoDb();
    db.notifications
      .filter(n => session && n.recipientId === session.userId)
      .forEach(n => { n.isRead = true; });
    saveDemoDb(db);
    return;
  }

  try {
    await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: getNotifAuthHeaders()
    });
  } catch (err) {
    console.warn('Failed to mark all notifications read:', err);
  }
}

/** Where clicking a notification should take the user. */
function getNotificationLink(notification, role) {
  switch (notification.type) {
    case NotificationType.EVENT_UPDATED:
    case NotificationType.EVENT_CANCELLED:
      return `event-details.html?id=${encodeURIComponent(notification.referenceId)}`;
    case NotificationType.APPLICATION_SUBMITTED:
    case NotificationType.APPLICATION_CANCELLED:
      return 'organizer-dashboard.html#applications';
    default:
      return role === Role.VENDOR ? 'vendor-dashboard.html#applications' : 'organizer-dashboard.html#applications';
  }
}

/** Icon and colour for each notification type. */
function getNotificationStyle(type) {
  const styles = {
    APPLICATION_SUBMITTED: { icon: 'fa-file-signature', tone: 'primary' },
    APPLICATION_APPROVED: { icon: 'fa-circle-check', tone: 'success' },
    APPLICATION_REJECTED: { icon: 'fa-circle-xmark', tone: 'danger' },
    APPLICATION_CANCELLED: { icon: 'fa-rotate-left', tone: 'warning' },
    EVENT_UPDATED: { icon: 'fa-calendar-day', tone: 'primary' },
    EVENT_CANCELLED: { icon: 'fa-calendar-xmark', tone: 'danger' }
  };
  return styles[type] || { icon: 'fa-bell', tone: 'primary' };
}

// Global window assignments
window.getMyNotifications = getMyNotifications;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.getNotificationLink = getNotificationLink;
window.getNotificationStyle = getNotificationStyle;
