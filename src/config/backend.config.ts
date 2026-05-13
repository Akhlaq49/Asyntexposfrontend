// =============================================================================
// BACKEND CONFIGURATION — SINGLE SOURCE OF TRUTH
// =============================================================================
// To switch backends, comment out the current line and uncomment the other.
// This value is used by both the app (src/services/api.ts) and Vite
// (vite.config.ts) so there is exactly ONE place to change.
// -----------------------------------------------------------------------------

// --- Local .NET backend ---
 export const BACKEND_URL = 'http://localhost:5193';

// --- Live / production backend ---
//export const BACKEND_URL = 'https://apis.asyntexconsultancy.com';

// Derived URLs — do not edit.
export const API_BASE_URL = `${BACKEND_URL.replace(/\/+$/, '')}/api`;
export const MEDIA_BASE_URL = BACKEND_URL.replace(/\/+$/, '');
