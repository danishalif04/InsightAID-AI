import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import ModeSwitcher from '@/components/common/ModeSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getMyProfile } from '@/services/profileService'
import { initialsFromName } from '@/utils/formatters'

/** App shell topbar — mobile menu trigger, page title, mode switch, search, theme toggle, notifications, avatar. */
export default function Navbar({ pageTitle, isDark, onToggleTheme, onOpenMobileSidebar, mode, onModeChange }) {
  const { user } = useAuth()
  const { data: profile } = useAsyncData(getMyProfile, [])
  const displayName = profile?.full_name?.trim() || user?.email || 'Signed in'

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 dark:border-line-dark dark:bg-surface-dark md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-canvas hover:text-slate-900 dark:text-slate-400 dark:hover:bg-canvas-dark dark:hover:text-slate-100 md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
          {pageTitle}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ModeSwitcher mode={mode} onChange={onModeChange} />

        <label className="relative hidden items-center sm:flex">
          <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            className="w-40 rounded-full border border-line bg-canvas py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-line-dark dark:bg-canvas-dark dark:text-slate-200 lg:w-64"
          />
        </label>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-full border border-line p-2 text-slate-500 transition-colors hover:bg-canvas hover:text-slate-900 dark:border-line-dark dark:text-slate-400 dark:hover:bg-canvas-dark dark:hover:text-slate-100"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full border border-line p-2 text-slate-500 transition-colors hover:bg-canvas hover:text-slate-900 dark:border-line-dark dark:text-slate-400 dark:hover:bg-canvas-dark dark:hover:text-slate-100"
        >
          {/* No notification-feed table/service exists yet — the unread
              indicator dot that used to render unconditionally here was
              removed (FYP2.md §40) rather than claim unread items that were
              never real. */}
          <Bell className="size-4" />
        </button>

        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-950 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {initialsFromName(displayName)}
        </span>
      </div>
    </header>
  )
}
