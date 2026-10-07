const APP_CONFIG = {
  DEMO_MODE: false,
  SUPABASE_URL: 'https://ahypfdieaxbhwlreepogy.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWhkaWVheGJod2xyZWVwb2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzA3NTgsImV4cCI6MjEwNTE0Njc1OH0.1uDXtpKOnMQLawqQjlErRGJ4PEtMsyn5BhQFZIwUTrU',
  SUPPORT_EMAIL: 'support@vendorlink.co.za'
};

function backendNotConnected(functionName) {
  return new Error(`Supabase is not connected yet (${functionName}).`);
}
