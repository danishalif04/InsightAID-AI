import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NAV_ITEMS, PAGE_TITLES } from '@/constants/navigation'
import { MODES } from '@/constants/modes'
import { useTheme } from '@/hooks/useTheme'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import Sidebar from '@/layouts/Sidebar'
import Navbar from '@/layouts/Navbar'
import AiAssistantButton from '@/components/common/AiAssistantButton'
import PageLoader from '@/components/common/PageLoader'

/** Application shell: sidebar + topbar + routed page content. */
export default function DashboardLayout() {
  const { isDark, toggleTheme } = useTheme()
  const { mode, setMode } = useMode()
  const { notify } = useNotifications()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    notify(`Switched to ${MODES[nextMode].label} mode.`)
  }

  const active = NAV_ITEMS.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
  )
  const pageTitle = active ? PAGE_TITLES[active.path] : 'InsightAid AI'

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          pageTitle={pageTitle}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          mode={mode}
          onModeChange={handleModeChange}
        />

        {/* pb-24: the floating AI assistant button is `fixed bottom-6
            right-6` over the whole viewport, so it sits on top of
            whatever's at the bottom of the page when scrolled all the way
            down (confirmed overlapping the Forecasting page's Model
            Comparison table and Social Intelligence's Trending Hashtags
            list). Reserving real bottom space means the button only ever
            overlaps this padding, never a page's last real row. */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-28">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AiAssistantButton />
    </div>
  )
}
