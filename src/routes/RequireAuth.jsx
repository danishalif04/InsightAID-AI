import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import PageLoader from '@/components/common/PageLoader'
import { PATHS } from '@/routes/paths'

/** Route guard — redirects to /login when there's no active Supabase session. */
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to={PATHS.login} state={{ from: location.pathname }} replace />

  return <Outlet />
}
