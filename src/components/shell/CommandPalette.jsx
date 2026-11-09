import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/navigation'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/** A real, working ⌘K page-jump palette — not a styled placeholder. Opens
 * via TopNav's search control or the Cmd/Ctrl+K shortcut (registered once,
 * globally, by TopNav itself — this component is purely the dialog). */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const motionAllowed = useMotionAllowed()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return NAV_ITEMS
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(trimmed))
  }, [query])

  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    setActiveIndex(0)
    return undefined
  }, [open])

  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(0)
  }, [results, activeIndex])

  const go = (item) => {
    if (!item) return
    navigate(item.path)
    onClose()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(results[activeIndex])
    }
  }

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
        <motion.div
          className="absolute inset-0 bg-black/60"
          initial={motionAllowed ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={motionAllowed ? { opacity: 0 } : undefined}
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Jump to a page"
          initial={motionAllowed ? { opacity: 0, y: -8, scale: 0.98 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={motionAllowed ? { opacity: 0, y: -8, scale: 0.98 } : undefined}
          transition={{ duration: motionAllowed ? 0.18 : 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-glow-border bg-glow-surface-elevated shadow-2xl dark:border-glow-border"
        >
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Search className="size-4 shrink-0 text-glow-text/50" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Jump to a page…"
              aria-label="Search pages"
              className="w-full bg-transparent text-sm text-glow-text placeholder:text-glow-text/40 focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-glow-text/50">No pages match &quot;{query}&quot;.</li>
            )}
            {results.map((item, index) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      index === activeIndex
                        ? 'bg-glow-brand/15 text-glow-text'
                        : 'text-glow-text/70 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
