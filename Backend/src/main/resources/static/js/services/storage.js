/**
 * VendorLink Storage Service
 * Handles uploading event banners and vendor profile images to Supabase Storage.
 *
 * Mode 1: Backend proxied upload (default & recommended) -> keeps API keys & auth centralized.
 * Mode 2: Direct browser-to-Supabase upload -> uses public anon key and Supabase Storage REST API.
 */

const API_BASE_URL = '/api';

/**
 * Returns auth headers with current Bearer token.
 */
function getStorageAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Upload an event flyer / banner image to Supabase Storage (via Backend).
 *
 * @param {File} file - Image file from file input
 * @returns {Promise<{ imageUrl: string, bannerImageUrl: string }>}
 */
export async function uploadEventImage(file) {
  if (!file) throw new Error('Please select an image file to upload.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size exceeds 5MB limit.');

  const formData = new FormData();
  formData.append('file', file);

  const headers = getStorageAuthHeaders();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/events/upload-image`, {
      method: 'POST',
      headers,
      body: formData
    });
  } catch (netErr) {
    throw new Error('Unable to connect to the server for image upload.');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  const publicUrl = result.bannerImageUrl || result.imageUrl || result.url;
  return {
    imageUrl: publicUrl,
    bannerImageUrl: publicUrl,
    url: publicUrl
  };
}

/**
 * Upload a profile avatar / logo image to Supabase Storage (via Backend).
 *
 * @param {File} file - Image file from file input
 * @returns {Promise<{ imageUrl: string, url: string }>}
 */
export async function uploadProfileImage(file) {
  if (!file) throw new Error('Please select an image file to upload.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size exceeds 5MB limit.');

  const formData = new FormData();
  formData.append('file', file);

  const headers = getStorageAuthHeaders();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/storage/upload-profile-image`, {
      method: 'POST',
      headers,
      body: formData
    });
  } catch (netErr) {
    throw new Error('Unable to connect to the server for profile image upload.');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    imageUrl: result.imageUrl || result.url,
    url: result.imageUrl || result.url
  };
}

/**
 * Direct client-side upload to Supabase Storage REST endpoint.
 * Useful if uploading directly from browser using public anon key.
 *
 * @param {'event-images' | 'profile-images'} bucket - Supabase Storage bucket name
 * @param {File} file - Image file to upload
 * @returns {Promise<{ publicUrl: string }>}
 */
export async function uploadDirectToSupabase(bucket, file) {
  if (!file) throw new Error('No file provided.');
  if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG.SUPABASE_URL || !APP_CONFIG.SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration is missing in config.js.');
  }

  const cleanBase = APP_CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '.jpg';
  const filename = `${bucket.replace('-images', '')}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`;

  const uploadUrl = `${cleanBase}/storage/v1/object/${bucket}/${filename}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': APP_CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${APP_CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'image/jpeg',
      'x-upsert': 'true'
    },
    body: file
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase direct upload failed (${res.status})`);
  }

  const publicUrl = `${cleanBase}/storage/v1/object/public/${bucket}/${filename}`;
  return { publicUrl };
}

// Global browser attachments
window.uploadEventImage = uploadEventImage;
window.uploadProfileImage = uploadProfileImage;
window.uploadDirectToSupabase = uploadDirectToSupabase;
window.VendorLinkStorage = {
  uploadEventImage,
  uploadProfileImage,
  uploadDirectToSupabase
};
