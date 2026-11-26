import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Scale } from 'lucide-react'
import { PATHS } from '@/routes/paths'
import { IMPACT_ASSUMPTIONS } from '@/utils/impactSummary'

const rm = (v) => `RM ${v.toFixed(2)}`

function Column({ label, data, highlight }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-glow-brand/40 bg-glow-brand/10' : 'border-glow-border'}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-glow-text/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-glow-text">{rm(data.wasteRM)}</p>
      <p className="text-xs text-glow-text/60">wasted ({data.wasteUnits} units)</p>
      <p className="mt-2 text-xs text-glow-text/60">{data.stockoutUnits} units short</p>
    </div>
  )
}

/** Dashboard "Before vs After" card. `impact` comes from utils/impactSummary.computeImpact (null = not enough data). */
export default function ImpactCard({ impact }) {
  const [open, setOpen] = useState(false)

  if (!impact) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
        <Scale className="size-5 shrink-0 text-glow-brand" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm text-glow-text/70">
          Before vs After needs per item sales with a shelf life and a cost for each item.
        </p>
        <Link to={PATHS.prepPlanner} className="inline-flex items-center gap-1 text-sm font-medium text-glow-brand">
          See the sample in Prep &amp; Stock Planner <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const { before, after, saving, stockoutChange } = impact
  const lessWaste = saving.rm > 0

  return (
    <section className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6" aria-labelledby="impact-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="impact-title" className="text-sm font-semibold text-glow-text">Before vs After: food and stock waste</h2>
          <p className="mt-0.5 text-xs text-glow-text/60">
            Replay of your sales, {impact.from} to {impact.to}, {impact.itemCount} items
          </p>
        </div>
        <Link to={PATHS.prepPlanner} className="inline-flex items-center gap-1 text-xs font-medium text-glow-brand">
          Open planner <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Column label="Before: order like last week" data={before} />
        <Column label="After: order with InsightAid" data={after} highlight />
        <div className="rounded-2xl border border-glow-border p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-glow-text/50">Difference</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-glow-text">
            {lessWaste ? `${rm(saving.rm)} less` : `${rm(Math.abs(saving.rm))} more`}
          </p>
          <p className="text-xs text-glow-text/60">
            {saving.pct == null ? 'No waste before to compare' : `${Math.abs(saving.pct).toFixed(1)}% ${lessWaste ? 'lower' : 'higher'} waste`}
          </p>
          <p className="mt-2 text-xs text-glow-text/60">
            {stockoutChange > 0
              ? `${stockoutChange} more units short. Raise the safety buffer in the planner to trade waste for fewer sold out items.`
              : `${Math.abs(stockoutChange)} fewer units short.`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-glow-text/70 hover:text-glow-text"
      >
        Assumptions <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-glow-text/60">
          {IMPACT_ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
          {impact.excluded.length > 0 && <li>Left out: {impact.excluded.join(', ')}.</li>}
        </ul>
      )}
    </section>
  )
}
