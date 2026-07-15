import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { NotificationContext } from '@/contexts/notification-context'

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const TONES = {
  success: 'border-accent-500/30 text-accent-600 dark:text-accent-400',
  error: 'border-danger/30 text-danger',
  info: 'border-info/30 text-info',
}

let nextId = 0

export default function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'success') => {
      const id = nextId++
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 left-1/2 z-[200] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-6 sm:translate-x-0">
          <AnimatePresence>
            {toasts.map(({ id, message, tone }) => {
              const Icon = ICONS[tone]
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className={`flex items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-sm shadow-card dark:bg-surface-dark ${TONES[tone]}`}
                  role="status"
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-slate-700 dark:text-slate-200">{message}</span>
                  <button
                    type="button"
                    onClick={() => dismiss(id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  )
}
