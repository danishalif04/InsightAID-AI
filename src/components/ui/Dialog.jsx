import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/** Centered modal rendered via portal — closes on backdrop click or Escape. */
export default function Dialog({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-card border border-line bg-surface shadow-card dark:border-line-dark dark:bg-surface-dark"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-line-dark">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-canvas hover:text-slate-700 dark:hover:bg-canvas-dark dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-line px-5 py-4 dark:border-line-dark">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
