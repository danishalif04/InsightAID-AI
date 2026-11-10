import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sun,
  User,
} from 'lucide-react'
import { PATHS } from '@/routes/paths'
import { useAuth } from '@/hooks/useAuth'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import { getMyProfile } from '@/services/profileService'
import { initialsFromName } from '@/utils/formatters'
import ModeSwitcher from '@/components/common/ModeSwitcher'
import UIModeSwitcher from '@/components/common/UIModeSwitcher'
import CommandPalette from './CommandPalette'

const NAV_GROUPS = [
  { label: 'Overview', path: PATHS.dashboard },
  {
    label: 'Insights',
    items: [
      { label: 'Sentiment Analysis', path: PATHS.sentiment },
      { label: 'Social Intelligence', path: PATHS.social },
      { label: 'Crisis Detection', path: PATHS.crisis },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Forecasting', path: PATHS.forecasting },
      { label: 'Financial Planning', path: PATHS.financialPlanning },
      { label: 'AI Recommendations', path: PATHS.recommendations },
      { label: 'Model Performance', path: PATHS.modelPerformance },
      { label: 'Agent Orchestrator', path: PATHS.agentOrchestrator },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Dataset Management', path: PATHS.datasets },
      { label: 'Reports', path: PATHS.reports },
    ],
  },
]

function NavDropdown({ group, isActive, motionAllowed }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-glow-brand text-glow-bg' : 'text-glow-text/70 hover:text-glow-text'
        }`}
      >
        {group.label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={motionAllowed ? { opacity: 0, y: -6, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={motionAllowed ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
            transition={{ duration: motionAllowed ? 0.15 : 0 }}
            className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-2xl border border-glow-border bg-glow-surface-elevated p-1.5 shadow-2xl"
          >
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-glow-text/80 transition-colors hover:bg-white/5 hover:text-glow-text"
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Sticky, floating, pill-shaped top navbar — replaces the sidebar.
 * Shrinks slightly on scroll via a real scroll listener (not CSS-only,
 * so it's actually testable/verifiable). Honors Low-Sensory mode's
 * motion-disable and prefers-reduced-motion (useMotionAllowed) for every
 * Framer Motion animation in this component and its dropdowns/sheet.
 */
export default function TopNav({
  isDark,
  onToggleTheme,
  mode,
  onModeChange,
  onOpenMobileSheet,
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const motionAllowed = useMotionAllowed()
  const { data: profile } = useAsyncData(getMyProfile, [])
  const displayName = profile?.full_name?.trim() || user?.email || 'Signed in'

  const [scrolled, setScrolled] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const isGroupActive = (group) => {
    if (group.path) return location.pathname === group.path
    return group.items?.some((item) => location.pathname.startsWith(item.path))
  }

  return (
    <>
      <header className="sticky top-3 z-40 flex justify-center px-4">
        <motion.div
          animate={{
            paddingTop: scrolled ? 6 : 10,
            paddingBottom: scrolled ? 6 : 10,
          }}
          transition={{ duration: motionAllowed ? 0.2 : 0 }}
          className="flex w-full max-w-5xl items-center justify-between gap-3 rounded-full border border-glow-border bg-glow-surface-elevated/80 px-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileSheet}
              aria-label="Open menu"
              className="rounded-full p-1.5 text-glow-text/70 hover:bg-white/5 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Link to={PATHS.dashboard} className="flex items-center gap-2 shrink-0">
              <span className="flex size-8 items-center justify-center rounded-full bg-glow-brand/15">
                <Activity className="size-4 text-glow-brand" aria-hidden="true" />
              </span>
              <span className="hidden font-semibold text-glow-text sm:inline">InsightAid</span>
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            {NAV_GROUPS.map((group) =>
              group.path ? (
                <Link
                  key={group.label}
                  to={group.path}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    isGroupActive(group) ? 'bg-glow-brand text-glow-bg' : 'text-glow-text/70 hover:text-glow-text'
                  }`}
                >
                  {group.label}
                </Link>
              ) : (
                <NavDropdown key={group.label} group={group} isActive={isGroupActive(group)} motionAllowed={motionAllowed} />
              )
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden xl:block">
              <ModeSwitcher mode={mode} onChange={onModeChange} />
            </div>
            <div className="hidden xl:block">
              <UIModeSwitcher compact />
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages (Ctrl+K)"
              title="Search pages (Ctrl+K)"
              className="rounded-full p-2 text-glow-text/70 transition-colors hover:bg-white/5 hover:text-glow-text"
            >
              <Search className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-full p-2 text-glow-text/70 transition-colors hover:bg-white/5 hover:text-glow-text"
            >
              {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarOpen((value) => !value)}
                aria-expanded={avatarOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="flex size-8 items-center justify-center rounded-full bg-glow-brand/20 text-xs font-semibold text-glow-brand"
              >
                {initialsFromName(displayName)}
              </button>
              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    role="menu"
                    initial={motionAllowed ? { opacity: 0, y: -6, scale: 0.98 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={motionAllowed ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
                    transition={{ duration: motionAllowed ? 0.15 : 0 }}
                    className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-glow-border bg-glow-surface-elevated p-1.5 shadow-2xl"
                  >
                    <Link
                      to={PATHS.settings}
                      role="menuitem"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-glow-text/80 hover:bg-white/5 hover:text-glow-text"
                    >
                      <User className="size-4" aria-hidden="true" /> Profile
                    </Link>
                    <Link
                      to={PATHS.settings}
                      role="menuitem"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-glow-text/80 hover:bg-white/5 hover:text-glow-text"
                    >
                      <SettingsIcon className="size-4" aria-hidden="true" /> Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setAvatarOpen(false)
                        await signOut()
                        navigate(PATHS.login)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-glow-text/80 hover:bg-white/5 hover:text-glow-text"
                    >
                      <LogOut className="size-4" aria-hidden="true" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
