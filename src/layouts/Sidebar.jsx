import { NavLink, useNavigate } from 'react-router-dom'
import { Activity, ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'

/**
 * App shell sidebar — deep pine rail on desktop (collapsible to icon-only),
 * full-width overlay drawer on mobile. `collapsed` only affects the md+ rail;
 * the mobile drawer always renders full labels regardless of that state.
 */
export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate(PATHS.login, { replace: true })
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-950 text-brand-100 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 md:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-20' : 'md:w-60'}`}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Activity className="size-4 text-accent-400" aria-hidden="true" />
          </span>

          <div className={`min-w-0 flex-1 leading-tight ${collapsed ? 'md:hidden' : ''}`}>
            <p className="truncate font-display text-sm font-semibold text-white">InsightAid</p>
            <p className="truncate text-xs text-brand-300">AI Intelligence</p>
          </div>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-brand-300 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-lg p-1.5 text-brand-300 hover:bg-white/10 hover:text-white md:flex"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Primary">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onMobileClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-accent-400"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              AU
            </span>

            <div className={`min-w-0 flex-1 leading-tight ${collapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-sm font-medium text-white">Admin User</p>
              <p className="truncate text-xs text-brand-300">Founder</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className={`shrink-0 rounded-lg p-1.5 text-brand-300 hover:bg-white/10 hover:text-white ${
                collapsed ? 'md:hidden' : ''
              }`}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
