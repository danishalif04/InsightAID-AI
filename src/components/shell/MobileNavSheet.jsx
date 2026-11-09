import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { PATHS } from '@/routes/paths'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import ModeSwitcher from '@/components/common/ModeSwitcher'
import UIModeSwitcher from '@/components/common/UIModeSwitcher'

const SECTIONS = [
  { label: 'Overview', items: [{ label: 'Dashboard', path: PATHS.dashboard }] },
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
      { label: 'AI Recommendations', path: PATHS.recommendations },
      { label: 'Model Performance', path: PATHS.modelPerformance },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Dataset Management', path: PATHS.datasets },
      { label: 'Reports', path: PATHS.reports },
    ],
  },
  { label: 'Account', items: [{ label: 'Settings', path: PATHS.settings }] },
]

/** Full-screen grouped menu for <1024px — the TopNav's collapse target.
 * Carries the business-mode and accessibility-mode switchers too, since
 * they're hidden from TopNav itself below the `xl` breakpoint. */
export default function MobileNavSheet({ open, onClose, mode, onModeChange }) {
  const location = useLocation()
  const motionAllowed = useMotionAllowed()

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        initial={motionAllowed ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={motionAllowed ? { opacity: 0 } : undefined}
        transition={{ duration: motionAllowed ? 0.2 : 0 }}
        className="fixed inset-0 z-[100] overflow-y-auto bg-glow-bg px-5 py-6"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-glow-text">InsightAid</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-full border border-glow-border text-glow-text/70"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <ModeSwitcher mode={mode} onChange={onModeChange} />
          <UIModeSwitcher />
        </div>

        <nav className="mt-8 space-y-7">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-glow-text/40">{section.label}</p>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`block min-h-11 rounded-xl px-3 py-3 text-base ${
                          isActive ? 'bg-glow-brand/15 text-glow-brand' : 'text-glow-text/80'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
