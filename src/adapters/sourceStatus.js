/**
 * Shared status vocabulary for every source adapter (FYP2.md §39). Matches
 * the keys DatasetManagement.jsx's CONNECTION_STATUS_META already renders —
 * adapters only ever produce one of these, never a fabricated "connected".
 */
export const SOURCE_STATUS = {
  CONNECTED: 'connected',
  NOT_CONFIGURED: 'not_configured',
  AUTH_REQUIRED: 'auth_required',
  RATE_LIMITED: 'rate_limited',
  ERROR: 'error',
  DISABLED: 'disabled',
}
