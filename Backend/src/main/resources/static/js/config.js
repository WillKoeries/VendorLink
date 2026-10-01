/**
 * VendorLink configuration
 * ------------------------
 * DEMO_MODE = true
 *   Every service in js/services/ reads and writes the sample data in
 *   js/mock-data.js. Nothing is sent to a server, and any changes only last
 *   until the browser tab is closed. A yellow "Demo mode" banner is shown.
 *
 * DEMO_MODE = false
 *   Services are expected to talk to Supabase. Each service function has a
 *   commented "Supabase:" block showing the query that belongs there.
 *   Until those are filled in, the functions throw a clear error and the
 *   pages show their error states.
 *
 * SECURITY: only ever put the PUBLIC "anon" key here.
 * Never put the Supabase service_role key in frontend code.
 */
const APP_CONFIG = {
  DEMO_MODE: false,
  SUPABASE_URL: 'https://ahypfdieaxbhwlreepogy.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWhkaWVheGJod2xyZWVwb2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzA3NTgsImV4cCI6MjEwNTE0Njc1OH0.1uDXtpKOnMQLawqQjlErRGJ4PEtMsyn5BhQFZIwUTrU',
  SUPPORT_EMAIL: 'support@vendorlink.co.za'
};

/**
 * Error thrown by a service function that has no Supabase query yet.
 * Pages catch it and show their normal "Unable to load…" error state.
 */
function backendNotConnected(functionName) {
  return new Error(`Supabase is not connected yet (${functionName}).`);
}
