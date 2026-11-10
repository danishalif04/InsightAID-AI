import { useState } from 'react'
import { Check, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHero from '@/components/ui/PageHero'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useNotifications } from '@/hooks/useNotifications'
import { listActionCentreItems, updateActionCentreStatus } from '@/services/recommendationService'

/**
 * AI Business Action Centre (knowledge_updated_nov2026.md item 6) — a
 * simplified lifecycle for this foundation slice: pending -> accepted /
 * dismissed, chosen by the owner, never automated. The full
 * DETECT->INVESTIGATE->RECOMMEND->APPROVE->MONITOR->EVALUATE lifecycle's
 * monitor/evaluate stages (scheduled review dates, outcome tracking) are
 * deferred — see the migration's own comment.
 */

const STATUS_TONE = { pending: 'neutral', accepted: 'success', dismissed: 'danger' }

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

export default function ActionCentre() {
  const { notify } = useNotifications()
  const { data: items, status, reload } = useAsyncData(listActionCentreItems, [])
  const [updatingId, setUpdatingId] = useState(null)

  const handleUpdate = async (id, nextStatus) => {
    setUpdatingId(id)
    try {
      await updateActionCentreStatus(id, nextStatus)
      reload()
    } catch {
      notify('Could not update that action — please try again.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const pending = (items ?? []).filter((item) => item.status === 'pending')
  const decided = (items ?? []).filter((item) => item.status !== 'pending')

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Follow-through"
        title="Action Centre"
        highlight="Centre"
        description="Recommendations you've saved, tracked in one place — accept or dismiss, nothing changes automatically."
      />

      <GlowSection title="Pending" description={`${pending.length} awaiting a decision`}>
        {status === 'success' && pending.length === 0 && (
          <EmptyState message="No pending actions — save a recommendation from AI Recommendations to track it here." />
        )}
        {pending.length > 0 && (
          <ul className="space-y-3">
            {pending.map((item) => (
              <li key={item.id} className="rounded-xl border border-glow-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{item.category}</Badge>
                      <Badge tone={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-glow-text/90">{item.title}</p>
                    {item.rationale && <p className="mt-1 text-xs text-glow-text/60">{item.rationale}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="glowBrand"
                      icon={Check}
                      loading={updatingId === item.id}
                      onClick={() => handleUpdate(item.id, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="glowSecondary"
                      icon={X}
                      loading={updatingId === item.id}
                      onClick={() => handleUpdate(item.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlowSection>

      <GlowSection title="Decided" description={`${decided.length} accepted or dismissed`}>
        {status === 'success' && decided.length === 0 ? (
          <EmptyState message="Nothing decided yet." />
        ) : (
          <ul className="space-y-2">
            {decided.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-glow-border p-3 text-xs">
                <span className="min-w-0 flex-1 truncate text-glow-text/70">{item.title}</span>
                <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </GlowSection>
    </div>
  )
}
