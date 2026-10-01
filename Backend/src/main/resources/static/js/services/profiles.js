/**
 * Profiles service
 * ----------------
 * VendorProfile and Organizer records (plus the User's own name and phone).
 * Each profile belongs to exactly one User (UML: 0..1 — 1).
 */

function validateProfileData(data, nameField) {
  const errors = {};
  if (!data.fullName || data.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!data[nameField] || data[nameField].trim().length < 2) {
    errors[nameField] = nameField === 'businessName' ? 'Enter your business name.' : 'Enter your organisation name.';
  }
  if (data.phone && !isValidPhone(data.phone)) errors.phone = 'Enter a valid phone number, e.g. +27 82 123 4567.';
  if (data.website && !safeUrl(data.website)) errors.website = 'Enter a full web address starting with https://';
  if (data.profileImageUrl && !safeUrl(data.profileImageUrl)) errors.profileImageUrl = 'Enter a full image link starting with https://';
  if (data.province && !PROVINCES.includes(data.province)) errors.province = 'Choose a province from the list.';
  return errors;
}

function throwIfErrors(errors) {
  if (Object.keys(errors).length) {
    throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: errors });
  }
}

// ---------- Vendor profile ----------
async function getMyVendorProfile() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your profile.');

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabaseClient.from('vendor_profiles').select('*').eq('user_id', session.userId).maybeSingle();
    // if (error) throw error;
    // return { user: await getCurrentUser(), profile: data };
    throw backendNotConnected('getMyVendorProfile');
  }
  await demoDelay();
  const db = getDemoDb();
  return {
    user: db.users.find(u => u.id === session.userId) || null,
    profile: db.vendorProfiles.find(p => p.userId === session.userId) || null
  };
}

async function updateMyVendorProfile(data) {
  const session = getSession();
  throwIfErrors(validateProfileData(data, 'businessName'));

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // await supabaseClient.from('users').update({ full_name: data.fullName, phone: data.phone }).eq('id', session.userId);
    // await supabaseClient.from('vendor_profiles').upsert({ user_id: session.userId, business_name: data.businessName, ... });
    throw backendNotConnected('updateMyVendorProfile');
  }
  await demoDelay(400);
  const db = getDemoDb();
  const user = db.users.find(u => u.id === session.userId);
  let profile = db.vendorProfiles.find(p => p.userId === session.userId);
  if (!profile) {
    profile = { id: nextDemoId(db.vendorProfiles), userId: session.userId };
    db.vendorProfiles.push(profile);
  }
  user.fullName = data.fullName.trim();
  user.phone = data.phone.trim();
  Object.assign(profile, {
    businessName: data.businessName.trim(),
    description: data.description.trim(),
    category: data.category,
    phone: data.phone.trim(),
    website: data.website.trim(),
    city: data.city.trim(),
    province: data.province,
    address: data.address.trim(),
    profileImageUrl: data.profileImageUrl.trim()
  });
  saveDemoDb(db);
  updateSessionName(user.fullName);
  return { user, profile };
}

// ---------- Organizer profile ----------
async function getMyOrganizerProfile() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your profile.');

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // const { data, error } = await supabaseClient.from('organizers').select('*').eq('user_id', session.userId).maybeSingle();
    // if (error) throw error;
    // return { user: await getCurrentUser(), profile: data };
    throw backendNotConnected('getMyOrganizerProfile');
  }
  await demoDelay();
  const db = getDemoDb();
  return {
    user: db.users.find(u => u.id === session.userId) || null,
    profile: db.organizers.find(o => o.userId === session.userId) || null
  };
}

async function updateMyOrganizerProfile(data) {
  const session = getSession();
  const isAdmin = session && session.role === Role.ADMIN;
  // Admins don't have an Organizer record, so only their name and phone are required.
  throwIfErrors(isAdmin
    ? validateProfileData({ ...data, organizationName: 'n/a' }, 'organizationName')
    : validateProfileData(data, 'organizationName'));

  if (!APP_CONFIG.DEMO_MODE) {
    // Supabase:
    // await supabaseClient.from('users').update({ full_name: data.fullName, phone: data.phone }).eq('id', session.userId);
    // await supabaseClient.from('organizers').upsert({ user_id: session.userId, organization_name: data.organizationName, ... });
    throw backendNotConnected('updateMyOrganizerProfile');
  }
  await demoDelay(400);
  const db = getDemoDb();
  const user = db.users.find(u => u.id === session.userId);
  user.fullName = data.fullName.trim();
  user.phone = data.phone.trim();

  let profile = db.organizers.find(o => o.userId === session.userId) || null;
  if (!isAdmin) {
    if (!profile) {
      profile = { id: nextDemoId(db.organizers), userId: session.userId };
      db.organizers.push(profile);
    }
    Object.assign(profile, {
      organizationName: data.organizationName.trim(),
      description: data.description.trim(),
      phone: data.phone.trim(),
      website: data.website.trim(),
      address: data.address.trim()
    });
  }
  saveDemoDb(db);
  updateSessionName(user.fullName);
  return { user, profile };
}
