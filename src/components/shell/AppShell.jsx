import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { MODES } from '@/constants/modes'
import { glowBackground } from '@/config/designTokens'
import PageLoader from '@/components/common/PageLoader'
import TopNav from './TopNav'
import MobileNavSheet from './MobileNavSheet'

/**
 * "Dark glow" editorial redesign — application shell. Replaces the old
 * sidebar-based DashboardLayout (kept in src/layouts/ for now, unused,
 * in case of rollback — see the redesign plan). Zero change to what
 * renders inside: the same routed <Outlet/>, same auth/mode/theme hooks.
 */
export default function AppShell() {
  const { isDark, toggleTheme } = useTheme()
  const { mode, setMode } = useMode()
  const { notify } = useNotifications()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    notify(`Switched to ${MODES[nextMode].label} mode.`)
  }

  return (
    <div className="relative min-h-screen bg-glow-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[480px]"
        style={{ background: glowBackground() }}
        aria-hidden="true"
      />

      <TopNav
        isDark={isDark}
        onToggleTheme={toggleTheme}
        mode={mode}
        onModeChange={handleModeChange}
        onOpenMobileSheet={() => setMobileSheetOpen(true)}
      />
      <MobileNavSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        mode={mode}
        onModeChange={handleModeChange}
      />

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="relative overflow-hidden border-t border-glow-border px-6 py-10 text-center">
        <p className="select-none text-4xl font-bold tracking-tight text-glow-text/5 sm:text-6xl">InsightAid</p>
      </footer>
    </div>
  )
}
