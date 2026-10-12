import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import PageLoader from '@/components/common/PageLoader'
import { PATHS } from '@/routes/paths'
import { env } from '@/config/env'

// import.meta.env.DEV is set by Vite at build time: true under `vite dev`,
// statically false (and dead-code-eliminated) under `vite build`. Combined
// with `&&`, this means no Vercel/production env var can ever flip this
// bypass on — only running the local dev server with VITE_DEV_BYPASS_AUTH=true
// in your own .env can. It does not create a real Supabase session, so
// every page's real data queries still come back empty under RLS — this
// only exists to look at layout/empty-states without logging in.
const DEV_BYPASS_AUTH = import.meta.env.DEV && env.devBypassAuth

/** Route guard — redirects to /login when there's no active Supabase session. */
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (DEV_BYPASS_AUTH) return <Outlet />

  if (loading) return <PageLoader />
  if (!user) return <Navigate to={PATHS.login} state={{ from: location.pathname }} replace />

  return <Outlet />
}
