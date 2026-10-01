/**
 * Notifications service
 * ---------------------
 * Notifications belong to one User (notification.recipientId).
 * In the demo they are created by the other services (e.g. when an
 * application is approved). With Supabase they should be created by
 * database triggers, not by the browser.
 */

async function getMyNotifications() {
  const session = getSession();
  if (!session) return [];

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabaseClient.from('notifications').select('*')
    //   .eq('recipient_id', session.userId)
    //   .order('created_at', { ascending: false });
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getMyNotifications');
  }
  await demoDelay(150);
  return getDemoDb().notifications
    .filter(n => n.recipientId === session.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function markNotificationRead(id) {
  const session = getSession();

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
    throw backendNotConnected('markNotificationRead');
  }
  const db = getDemoDb();
  const notification = db.notifications.find(n => n.id === Number(id) && session && n.recipientId === session.userId);
  if (notification && !notification.isRead) {
    notification.isRead = true;
    saveDemoDb(db);
  }
}

async function markAllNotificationsRead() {
  const session = getSession();

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // await supabaseClient.from('notifications').update({ is_read: true }).eq('recipient_id', session.userId).eq('is_read', false);
    throw backendNotConnected('markAllNotificationsRead');
  }
  const db = getDemoDb();
  db.notifications
    .filter(n => session && n.recipientId === session.userId)
    .forEach(n => { n.isRead = true; });
  saveDemoDb(db);
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
