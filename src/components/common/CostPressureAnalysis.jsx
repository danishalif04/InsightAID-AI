import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Info, Sparkles } from 'lucide-react'
import { Select } from '@/components/ui/Input'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { calculateGrossMarginPercent } from '@/utils/scenarioEngine'
import { formatCurrencyMYR } from '@/utils/formatters'
import { CHART_COLORS } from '@/theme/chartTheme'
import { resolveDisplayAssumptions } from '@/utils/illustrativeExample'

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

  const { values: displayValues, isIllustrative } = resolveDisplayAssumptions(values)
  const sellingPrice = typeof displayValues.selling_price === 'number' ? displayValues.selling_price : null
  const costPerUnit = typeof displayValues.cost_per_unit === 'number' ? displayValues.cost_per_unit : null
  const currentValue = typeof displayValues[costId] === 'number' ? displayValues[costId] : null

  const canCompute = sellingPrice !== null && costPerUnit !== null && currentValue !== null
  const bumpedValue = canCompute ? Math.round(currentValue * (1 + pressurePercent / 100) * 100) / 100 : null

  let currentMarginPercent = null
  let projectedMarginPercent = null
  if (canCompute) {
    currentMarginPercent = calculateGrossMarginPercent(sellingPrice, sellingPrice - costPerUnit)
    const bumpedCostPerUnit = costId === 'cost_per_unit' ? bumpedValue : costPerUnit
    projectedMarginPercent = calculateGrossMarginPercent(sellingPrice, sellingPrice - bumpedCostPerUnit)
  }

  const comparisonRows = canCompute
    ? [
        { label: 'Now', amount: currentValue },
        { label: `+${pressurePercent}%`, amount: bumpedValue },
      ]
    : []

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

      {isIllustrative && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-glow-text/70">
            <span className="font-semibold text-amber-400">Illustrative example</span> — using sample costs until
            you add your own price and costs via Onboarding or Settings.
          </p>
        </div>
      )}

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

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-glow-text/40">
              {COST_OPTIONS.find((o) => o.id === costId)?.label} — now vs. under cost pressure
            </p>
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.sm}>
              <BarChart data={comparisonRows} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
                <Tooltip content={<ChartTooltip formatter={(value) => formatCurrencyMYR(value)} />} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {comparisonRows.map((row) => (
                    <Cell key={row.label} fill={row.label === 'Now' ? CHART_COLORS.neutral : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </GlowSection>
  )
}
