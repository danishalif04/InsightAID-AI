import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

/**
 * Renders the one FYP2.md §65 state a data component is actually in —
 * Loading / Success / Empty / Error / Unavailable — from a useAsyncData()
 * result. Never wraps its own Card/border; the caller's existing Card stays
 * as-is and this fills its body, so every page keeps a consistent look.
 *
 * @param {'loading'|'success'|'error'|'unavailable'} status
 * @param {*} data
 * @param {Error} [error]
 * @param {() => void} [reload]
 * @param {(data:*) => boolean} [emptyWhen] success + this returns true -> 'empty' copy instead of children
 * @param {string} [loadingMessage]
 * @param {string} [emptyMessage]
 * @param {string} [unavailableMessage] fallback when the thrown DataUnavailableError has no message
 * @param {(data:*) => import('react').ReactNode} children
 */
export default function AsyncSection({
  status,
  data,
  error,
  reload,
  emptyWhen,
  loadingMessage = 'Loading…',
  emptyMessage = 'Nothing here yet.',
  unavailableMessage = 'This data is currently unavailable.',
  children,
}) {
  if (status === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {loadingMessage}
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-line bg-canvas p-4 dark:border-line-dark dark:bg-canvas-dark">
        <p className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error?.message ?? 'Something went wrong loading this data.'}
        </p>
        {reload && (
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (status === 'unavailable') {
    return (
      <p className="text-sm italic text-slate-500 dark:text-slate-400">{error?.message ?? unavailableMessage}</p>
    )
  }

  if (status === 'success') {
    if (emptyWhen?.(data)) {
      return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
    }
    return children(data)
  }

  return null
}
