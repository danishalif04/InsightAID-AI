/**
 * Typed access to environment variables.
 * Never read import.meta.env directly outside this file.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  appName: 'InsightAid AI',
  // Local-testing-only escape hatch for RequireAuth — see that file for the
  // import.meta.env.DEV guard that makes this structurally impossible to
  // activate in a production build (`vite build` bakes DEV=false into the
  // bundle at compile time; it cannot be flipped by any runtime/Vercel env
  // var). Never rely on this for anything beyond looking at page layout —
  // it does not create a real Supabase session, so every real query still
  // comes back empty under Row Level Security.
  devBypassAuth: import.meta.env.VITE_DEV_BYPASS_AUTH === 'true',
}
