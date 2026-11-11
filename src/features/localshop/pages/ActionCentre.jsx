import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useActions } from '../store/useActions'

const LIFECYCLE = ['DETECT', 'INVESTIGATE', 'RECOMMEND', 'OWNER APPROVES', 'MONITOR', 'EVALUATE']

const STATUS_STYLE = {
  pending: 'border-glow-border text-glow-text/60',
  recommended: 'border-sky-500/40 text-sky-400',
  accepted: 'border-emerald-500/40 text-emerald-400',
  rejected: 'border-rose-500/40 text-rose-400',
  monitoring: 'border-amber-400/40 text-amber-400',
  completed: 'border-glow-border text-glow-text/40',
}

const FILTERS = ['all', 'pending', 'accepted', 'rejected']

function ActionCard({ action, onAccept, onReject }) {
  const [showWhy, setShowWhy] = useState(false)
  const open = action.status === 'pending' || action.status === 'recommended'

  return (
    <li className="rounded-2xl border border-glow-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium text-glow-text/90">{action.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[action.status]}`}>
          {action.status}
        </span>
      </div>

      {action.body && <p className="mt-1.5 text-xs leading-relaxed text-glow-text/60">{action.body}</p>}

      <button
        type="button"
        onClick={() => setShowWhy((value) => !value)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-glow-text/50 hover:text-glow-text"
      >
        Why? <ChevronDown className={`size-3 transition-transform ${showWhy ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {showWhy && (
        <p className="mt-1 rounded-lg bg-white/5 p-2 text-[11px] text-glow-text/60">
          Source: {action.source ?? 'Not recorded'}
        </p>
      )}

      {action.dueAt && (
        <p className="mt-2 text-[11px] text-glow-text/40">
          Review scheduled for {new Date(action.dueAt).toLocaleDateString('en-MY')}
        </p>
      )}

      {open && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="glowBrand" icon={Check} onClick={() => onAccept(action.id)}>
            Approve
          </Button>
          <Button size="sm" variant="glowSecondary" icon={X} onClick={() => onReject(action.id)}>
            Reject
          </Button>
        </div>
      )}
    </li>
  )
}

export default function ActionCentre() {
  const { t } = useLang()
  const { actions, setStatus, pendingCount } = useActions()
  const [filter, setFilter] = useState('all')

  const visible = actions.filter((action) => {
    if (filter === 'all') return true
    if (filter === 'pending') return action.status === 'pending' || action.status === 'recommended'
    return action.status === filter
  })

  return (
    <div className="space-y-5">
      <Section
        title={t('nav.actions')}
        description={`${pendingCount} pending`}
        note="Approving records your decision and schedules a review. The app never changes a price or contacts a supplier on your behalf."
        actions={
          <div className="flex gap-1">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors ${
                  filter === option
                    ? 'border-glow-brand bg-glow-brand/15 text-glow-brand'
                    : 'border-glow-border text-glow-text/60 hover:bg-white/5'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        }
      >
        {visible.length === 0 ? (
          <p className="text-xs text-glow-text/50">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onAccept={(id) => setStatus(id, 'accepted')}
                onReject={(id) => setStatus(id, 'rejected')}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Action lifecycle">
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {LIFECYCLE.map((stage, index) => (
            <li key={stage} className="flex items-center gap-1.5">
              <span className="rounded-full border border-glow-border px-2 py-0.5 text-glow-text/60">{stage}</span>
              {index < LIFECYCLE.length - 1 && <span className="text-glow-text/25">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-glow-text/40">
          MONITOR and EVALUATE compare against the evidence recorded when the action was created. A metric moving after
          a decision is reported as an observed change, never as proof the decision caused it.
        </p>
      </Section>
    </div>
  )
}
