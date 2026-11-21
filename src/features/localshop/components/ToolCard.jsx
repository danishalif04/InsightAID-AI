import { Link } from 'react-router-dom'
import { Lock, MessageCircle } from 'lucide-react'
import { useLang } from '../i18n/useLang'

/**
 * One analysis tool in the Overview grid: a status dot, provenance tag
 * chips, an optional mini chart, and an "Ask AI" entry point seeded with
 * this tool.
 *
 * A tool whose inputs are missing renders LOCKED with what would unlock
 * it — never as an operational feature that silently does nothing.
 */

const STATUS_DOT = {
  ready: 'bg-emerald-400',
  partial: 'bg-amber-400',
  locked: 'bg-glow-text/25',
}

export default function ToolCard({ title, description, status = 'ready', tags = [], needs = [], to, onAskAi, children }) {
  const { t } = useLang()
  const locked = status === 'locked'

  const body = (
    <div
      className={`flex h-full flex-col rounded-2xl border border-glow-border bg-glow-surface-elevated p-4 transition-colors ${
        locked ? 'opacity-70' : 'hover:border-glow-brand/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
            <h3 className="truncate text-sm font-semibold text-glow-text">{title}</h3>
          </div>
          {description && <p className="mt-0.5 text-[11px] text-glow-text/50">{description}</p>}
        </div>
        {locked && <Lock className="size-3.5 shrink-0 text-glow-text/30" aria-hidden="true" />}
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-glow-text/50">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex-1">{children}</div>

      {locked ? (
        <p className="mt-3 text-[11px] text-glow-text/40">
          {t('readiness.needs')}: {needs.join(', ') || 'N/A'}
        </p>
      ) : (
        onAskAi && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onAskAi()
            }}
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-glow-border px-2.5 py-1 text-[11px] font-medium text-glow-text/70 transition-colors hover:border-glow-brand/40 hover:text-glow-text"
          >
            <MessageCircle className="size-3" aria-hidden="true" />
            {t('common.askAi')}
          </button>
        )
      )}
    </div>
  )

  if (locked || !to) return body
  return (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  )
}
