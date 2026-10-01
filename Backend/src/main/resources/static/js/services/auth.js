const API_URL = 'http://localhost:8080/api/auth';
const SESSION_KEY = 'vendorlink_session';

// ---------- Session (who is logged in) ----------
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session && session.userId && Object.values(Role).includes(session.role)) return session;
    }
    const userRaw = localStorage.getItem('vendorlink_user');
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      const u = parsed.user || parsed;
      if (u && (u.role || u.userId || u.id)) {
        return {
          userId: u.id || u.userId,
          fullName: u.fullName,
          email: u.email,
          role: u.role
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

function saveSession(user, remember) {
  const session = { userId: user.id, fullName: user.fullName, email: user.email, role: user.role };
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('vendorlink_token');
  localStorage.removeItem('vendorlink_user');
}

// Keep the stored name in sync after a profile edit
function updateSessionName(fullName) {
  const session = getSession();
  if (!session) return;
  const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify({ ...session, fullName }));
}

// ---------- Current user ----------
async function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    // if (!authUser) return null;
    // const { data, error } = await supabaseClient.from('users').select('*').eq('auth_id', authUser.id).single();
    // if (error) throw error;
    // return data;
    throw backendNotConnected('getCurrentUser');
  }

  const db = getDemoDb();
  return db.users.find(u => u.id === session.userId) || null;
}

// ---------- Sign in / out ----------
export async function signIn({ email, password }) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Invalid email or password');
  }

  const data = await response.json(); // returns { token, user: { id, email, role, ... } }
  localStorage.setItem('vendorlink_token', data.token);
  localStorage.setItem('vendorlink_user', JSON.stringify(data.user || data));
  return data;
}

export async function signUp({ fullName, email, password, role }) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, role })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Registration failed');
  }

  return await response.json();
}

async function signInAsDemo(role) {
  const db = getDemoDb();
  const demoEmails = {
    VENDOR: 'vendor@demo.vendorlink.co.za',
    ORGANIZER: 'organizer@demo.vendorlink.co.za',
    ADMIN: 'admin@demo.vendorlink.co.za'
  };
  const user = db.users.find(u => u.email === demoEmails[role]);
  if (!user) throw new Error('Demo account not found. Try “Reset demo data”.');
  return saveSession(user, false);
}

async function signOut() {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // await supabaseClient.auth.signOut();
  }
  clearSession();
}

// ---------- Register ----------
/**
 * @param {{role:string, fullName:string, email:string, phone:string, businessName:string, password:string}} data
 */
async function registerAccount(data) {
  return await signUp(data);
}

// ---------- Forgot password ----------
async function requestPasswordReset(email) {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    //   redirectTo: `${window.location.origin}/reset-password.html`
    // });
    // if (error) throw error;
    // return;
    throw backendNotConnected('requestPasswordReset');
  }
  await demoDelay(400);
  // Demo mode: nothing is sent. The page tells the user this.
}

// ---------- Page guard ----------
/**
 * Call at the top of a protected page.
 * Returns the session if the user may view the page, otherwise redirects and returns null.
 */
function requireRole(allowedRoles) {
  const session = getSession();
  const currentPage = window.location.pathname.split('/').pop() + window.location.hash;

  if (!session) {
    window.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}&reason=auth`);
    return null;
  }
  if (!allowedRoles.includes(session.role)) {
    window.location.replace(`${getDashboardUrl(session.role)}?reason=role`);
    return null;
  }
  return session;
}
