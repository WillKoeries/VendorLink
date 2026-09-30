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
  DEMO_MODE: true,
  SUPABASE_URL: '',       // e.g. 'https://your-project.supabase.co'
  SUPABASE_ANON_KEY: '',  // public anon key only
  SUPPORT_EMAIL: 'support@vendorlink.co.za'
};

/**
 * Error thrown by a service function that has no Supabase query yet.
 * Pages catch it and show their normal "Unable to load…" error state.
 */
function backendNotConnected(functionName) {
  return new Error(`Supabase is not connected yet (${functionName}).`);
}
