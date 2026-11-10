import { useState } from 'react'
import { Info } from 'lucide-react'
import { Select } from '@/components/ui/Input'
import { calculateGrossMarginPercent } from '@/utils/scenarioEngine'
import { formatCurrencyMYR } from '@/utils/formatters'

/**
 * Cost Pressure Analysis — a deliberately scoped-down version of
 * knowledge_updated_nov2026.md item 4 ("Malaysian Economic Intelligence").
 * The Inflation Monitor / Price Watch / national CPI pieces of that spec
 * need a verified, licensed external dataset (DOSM/KPDN/BNM) — per
 * docs/AUDIT_v3_agentic_direction.md's own backlog item 4, that
 * verification hasn't been done, and CLAUDE.md's working rule 6 is explicit:
 * never silently substitute an unverified data source. So this component
 * only does the part that's honestly buildable today: showing how a
 * change to ONE of the shop's own recorded costs affects its own margin —
 * clearly never attributed to national inflation.
 */

const COST_OPTIONS = [
  { id: 'cost_per_unit', label: 'Cost per unit' },
  { id: 'marketing_cost', label: 'Marketing' },
  { id: 'platform_fees', label: 'Platform Fees' },
  { id: 'shipping_cost', label: 'Shipping' },
  { id: 'labour_cost', label: 'Labour' },
  { id: 'fixed_costs', label: 'Fixed Costs' },
  { id: 'other_expenses', label: 'Other Expenses' },
]

const PRESSURE_STEPS = [5, 10, 15, 20]

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

export default function CostPressureAnalysis({ values = {} }) {
  const [costId, setCostId] = useState('cost_per_unit')
  const [pressurePercent, setPressurePercent] = useState(10)

  const sellingPrice = typeof values.selling_price === 'number' ? values.selling_price : null
  const costPerUnit = typeof values.cost_per_unit === 'number' ? values.cost_per_unit : null
  const currentValue = typeof values[costId] === 'number' ? values[costId] : null

  const canCompute = sellingPrice !== null && costPerUnit !== null && currentValue !== null
  const bumpedValue = canCompute ? Math.round(currentValue * (1 + pressurePercent / 100) * 100) / 100 : null

  let currentMarginPercent = null
  let projectedMarginPercent = null
  if (canCompute) {
    currentMarginPercent = calculateGrossMarginPercent(sellingPrice, sellingPrice - costPerUnit)
    const bumpedCostPerUnit = costId === 'cost_per_unit' ? bumpedValue : costPerUnit
    projectedMarginPercent = calculateGrossMarginPercent(sellingPrice, sellingPrice - bumpedCostPerUnit)
  }

  return (
    <GlowSection
      title="Cost Pressure Analysis"
      description="See how a change to one of your own recorded costs affects your margin — based on your own data only."
    >
      <div className="flex items-start gap-2 rounded-2xl border border-glow-border bg-glow-brand/5 p-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-glow-brand" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-glow-text/60">
          This uses only your own recorded costs — it does not pull from Malaysia's national CPI or supplier price
          data (that integration needs a verified, licensed data source and isn't built yet). It never claims
          national inflation caused a specific cost change.
        </p>
      </div>

      {!canCompute ? (
        <p className="mt-4 text-xs text-glow-text/50">
          Add your selling price, cost per unit, and at least one other cost field to use this tool.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Which cost?" value={costId} onChange={(e) => setCostId(e.target.value)}>
              {COST_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-glow-text/50">
                If this cost increases by {pressurePercent}%
              </span>
              <div className="flex gap-2">
                {PRESSURE_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setPressurePercent(step)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      pressurePercent === step
                        ? 'border-glow-brand bg-glow-brand/15 text-glow-brand'
                        : 'border-glow-border text-glow-text/60 hover:bg-white/5'
                    }`}
                  >
                    +{step}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-glow-text/70">
            If {COST_OPTIONS.find((o) => o.id === costId)?.label.toLowerCase()} increases from{' '}
            {formatCurrencyMYR(currentValue)} to {formatCurrencyMYR(bumpedValue)} while your selling price stays at{' '}
            {formatCurrencyMYR(sellingPrice)}, your gross margin{' '}
            {costId === 'cost_per_unit' ? (
              <>
                decreases from <span className="font-semibold text-glow-text">{currentMarginPercent}%</span> to{' '}
                <span className="font-semibold text-glow-text">{projectedMarginPercent}%</span>.
              </>
            ) : (
              <>
                stays at <span className="font-semibold text-glow-text">{currentMarginPercent}%</span> (this cost
                doesn't affect per-unit gross margin directly), but your monthly operating costs rise by{' '}
                <span className="font-semibold text-glow-text">{formatCurrencyMYR(bumpedValue - currentValue)}</span>.
              </>
            )}
          </p>
        </>
      )}
    </GlowSection>
  )
}
