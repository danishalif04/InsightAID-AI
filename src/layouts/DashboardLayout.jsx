import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NAV_ITEMS, PAGE_TITLES } from '@/constants/navigation'
import { useTheme } from '@/hooks/useTheme'
import Sidebar from '@/layouts/Sidebar'
import Navbar from '@/layouts/Navbar'
import AiAssistantButton from '@/components/common/AiAssistantButton'
import PageLoader from '@/components/common/PageLoader'

/** Application shell: sidebar + topbar + routed page content. */
export default function DashboardLayout() {
  const { isDark, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
        />

        <main className="flex-1 p-4 md:p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AiAssistantButton />
    </div>
  )
}
