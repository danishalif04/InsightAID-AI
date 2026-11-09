import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/** The numbered (001, 002…) accordion row style, for lists like Crisis
 * signals or FAQ-style items. `index` is 0-based; the visible number is
 * 1-based and zero-padded to 3 digits. Collapsed by default. */
export default function AccordionRow({ index, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const motionAllowed = useMotionAllowed()
  const panelId = useId()
  const number = String(index + 1).padStart(3, '0')

  return (
    <div className="border-b border-glow-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 py-4 text-left"
      >
        <span className="text-xs font-mono text-glow-text/40">{number}</span>
        <span className="flex-1 text-sm font-medium text-glow-text">{title}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-glow-text/50 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={motionAllowed ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={motionAllowed ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: motionAllowed ? 0.2 : 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-10 text-sm text-glow-text/70">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
