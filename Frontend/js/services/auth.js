/**
 * Auth service
 * ------------
 * One place that knows who is logged in. Pages and the navbar only use
 * these functions, never localStorage directly.
 *
 * What is stored in the browser: { userId, fullName, email, role }.
 * Passwords and tokens are NEVER stored by this code.
 *
 * DEMO MODE: sign-in finds the account by email in the demo data. Passwords
 * are not checked (there are none to check against). Real password checks
 * happen in Supabase Auth once it is connected.
 */

const SESSION_KEY = 'vendorlink_session';

// ---------- Session (who is logged in) ----------
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Ignore anything that doesn't look like a valid session
    if (!session || !session.userId || !Object.values(Role).includes(session.role)) return null;
    return session;
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
async function signIn(email, password, remember = false) {
  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    // if (error) throw new Error('Incorrect email or password.');
    // const user = await getCurrentUser();   // loads the users row (with role)
    // return saveSession(user, remember);
    throw backendNotConnected('signIn');
  }

  await demoDelay(400);
  const db = getDemoDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    throw new Error('No account found with that email address.');
  }
  return saveSession(user, remember);
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
  // Only vendors and organisers can sign themselves up. ADMIN accounts are
  // created by the team directly in Supabase (must also be enforced by RLS).
  if (![Role.VENDOR, Role.ORGANIZER].includes(data.role)) {
    throw new Error('Please choose Vendor or Event Organizer.');
  }

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data: authData, error } = await supabaseClient.auth.signUp({
    //   email: data.email,
    //   password: data.password,
    //   options: { data: { full_name: data.fullName, role: data.role } }
    // });
    // if (error) throw error;
    // Then insert the users row and the vendor_profiles / organizers row
    // (ideally in a database trigger so the role can't be tampered with).
    throw backendNotConnected('registerAccount');
  }

  await demoDelay(500);
  const db = getDemoDb();
  const email = data.email.trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase() === email)) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }

  // Note: data.password is deliberately NOT saved anywhere.
  const user = {
    id: nextDemoId(db.users),
    fullName: data.fullName.trim(),
    email,
    phone: data.phone.trim(),
    role: data.role
  };
  db.users.push(user);

  if (user.role === Role.VENDOR) {
    db.vendorProfiles.push({
      id: nextDemoId(db.vendorProfiles),
      userId: user.id,
      businessName: data.businessName.trim(),
      description: '', category: '', phone: user.phone, website: '',
      city: '', province: '', address: '', profileImageUrl: ''
    });
  } else {
    db.organizers.push({
      id: nextDemoId(db.organizers),
      userId: user.id,
      organizationName: data.businessName.trim(),
      description: '', phone: user.phone, website: '', address: ''
    });
  }

  saveDemoDb(db);
  return saveSession(user, false);
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
