/**
 * Profiles service
 * ----------------
 * VendorProfile and Organizer records (plus the User's own name and phone).
 * Connected to Spring Boot endpoints: /api/vendor/profile and /api/users/me.
 */

function getProfileAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

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

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    return {
      user: db.users.find(u => u.id === session.userId) || null,
      profile: db.vendorProfiles ? (db.vendorProfiles.find(p => p.userId === session.userId) || null) : null
    };
  }

  try {
    const res = await fetch('/api/vendor/profile', {
      headers: getProfileAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return {
        user: {
          id: data.userId || session.userId,
          fullName: data.fullName || session.fullName,
          email: data.email || session.email,
          phone: data.phone || session.phone
        },
        profile: data
      };
    }
  } catch (err) {
    console.warn('Failed to fetch /api/vendor/profile:', err);
  }

  return {
    user: session,
    profile: null
  };
}

async function updateMyVendorProfile(data) {
  const session = getSession();
  throwIfErrors(validateProfileData(data, 'businessName'));

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const user = db.users.find(u => u.id === session.userId);
    let profile = db.vendorProfiles ? db.vendorProfiles.find(p => p.userId === session.userId) : null;
    if (!profile) {
      profile = { id: nextDemoId(db.vendorProfiles || []), userId: session.userId };
      if (!db.vendorProfiles) db.vendorProfiles = [];
      db.vendorProfiles.push(profile);
    }
    if (user) {
      user.fullName = data.fullName.trim();
      user.phone = data.phone.trim();
    }
    Object.assign(profile, {
      businessName: data.businessName.trim(),
      description: (data.description || '').trim(),
      category: data.category,
      phone: data.phone.trim(),
      website: (data.website || '').trim(),
      city: (data.city || '').trim(),
      province: data.province,
      address: (data.address || '').trim(),
      profileImageUrl: (data.profileImageUrl || '').trim()
    });
    saveDemoDb(db);
    if (typeof updateSessionName === 'function') {
      updateSessionName(user ? user.fullName : data.fullName.trim());
    }
    return { user, profile };
  }

  // Update backend profile
  const res = await fetch('/api/vendor/profile', {
    method: 'PUT',
    headers: getProfileAuthHeaders(),
    body: JSON.stringify({
      businessName: data.businessName.trim(),
      description: (data.description || '').trim(),
      category: data.category || '',
      phone: (data.phone || '').trim(),
      website: (data.website || '').trim(),
      city: (data.city || '').trim(),
      province: data.province || '',
      address: (data.address || '').trim(),
      profileImageUrl: (data.profileImageUrl || '').trim()
    })
  });

  if (!res.ok) {
    let errMsg = `Failed to update profile: HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errMsg = errJson.message;
    } catch (e) { }
    throw new Error(errMsg);
  }

  const updatedProfile = await res.json();

  // Also update user's fullName and phone on /api/users/me if available
  if (data.fullName || data.phone) {
    try {
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: getProfileAuthHeaders(),
        body: JSON.stringify({
          fullName: (data.fullName || '').trim(),
          phone: (data.phone || '').trim()
        })
      });
      if (typeof updateSessionName === 'function') {
        updateSessionName(data.fullName.trim());
      }
    } catch (e) { }
  }

  return {
    user: {
      id: updatedProfile.userId || session.userId,
      fullName: data.fullName || updatedProfile.fullName,
      email: updatedProfile.email || session.email,
      phone: updatedProfile.phone || data.phone
    },
    profile: updatedProfile
  };
}

// ---------- Organizer profile ----------
async function getMyOrganizerProfile() {
  const session = getSession();
  if (!session) throw new Error('Please log in to see your profile.');

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay();
    const db = getDemoDb();
    return {
      user: db.users.find(u => u.id === session.userId) || null,
      profile: db.organizers ? (db.organizers.find(o => o.userId === session.userId) || null) : null
    };
  }

  try {
    const res = await fetch('/api/users/me', {
      headers: getProfileAuthHeaders()
    });
    if (res.ok) {
      const user = await res.json();
      return {
        user: {
          id: user.id || session.userId,
          fullName: user.fullName || session.fullName,
          email: user.email || session.email,
          phone: user.phone || session.phone
        },
        profile: {
          organizationName: user.fullName,
          phone: user.phone,
          email: user.email
        }
      };
    }
  } catch (err) {
    console.warn('Failed to fetch organizer profile:', err);
  }

  return { user: session, profile: null };
}

async function updateMyOrganizerProfile(data) {
  const session = getSession();
  const isAdmin = session && session.role === Role.ADMIN;
  throwIfErrors(isAdmin
    ? validateProfileData({ ...data, organizationName: 'n/a' }, 'organizationName')
    : validateProfileData(data, 'organizationName'));

  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEMO_MODE) {
    await demoDelay(400);
    const db = getDemoDb();
    const user = db.users.find(u => u.id === session.userId);
    if (user) {
      user.fullName = data.fullName.trim();
      user.phone = data.phone.trim();
    }
    let profile = db.organizers ? db.organizers.find(o => o.userId === session.userId) : null;
    if (!isAdmin) {
      if (!profile) {
        profile = { id: nextDemoId(db.organizers || []), userId: session.userId };
        if (!db.organizers) db.organizers = [];
        db.organizers.push(profile);
      }
      Object.assign(profile, {
        organizationName: data.organizationName.trim(),
        description: data.description ? data.description.trim() : '',
        phone: data.phone.trim(),
        website: data.website ? data.website.trim() : '',
        address: data.address ? data.address.trim() : ''
      });
    }
    saveDemoDb(db);
    if (typeof updateSessionName === 'function') {
      updateSessionName(user ? user.fullName : data.fullName.trim());
    }
    return { user, profile };
  }

  const res = await fetch('/api/users/me', {
    method: 'PUT',
    headers: getProfileAuthHeaders(),
    body: JSON.stringify({
      fullName: (data.organizationName || data.fullName || '').trim(),
      phone: (data.phone || '').trim()
    })
  });

  if (!res.ok) {
    let errMsg = `Failed to update organizer profile: HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errMsg = errJson.message;
    } catch (e) { }
    throw new Error(errMsg);
  }

  const updated = await res.json();
  if (typeof updateSessionName === 'function') {
    updateSessionName(updated.fullName);
  }

  return {
    user: updated,
    profile: {
      organizationName: updated.fullName,
      phone: updated.phone
    }
  };
}

// Global window assignments
window.getMyVendorProfile = getMyVendorProfile;
window.updateMyVendorProfile = updateMyVendorProfile;
window.getMyOrganizerProfile = getMyOrganizerProfile;
window.updateMyOrganizerProfile = updateMyOrganizerProfile;
window.validateProfileData = validateProfileData;
