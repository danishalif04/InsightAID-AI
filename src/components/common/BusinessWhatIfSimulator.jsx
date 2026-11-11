import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RotateCcw, Sparkles } from 'lucide-react'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { buildAllScenarios, calculateBreakEven, calculateGrossMarginPercent } from '@/utils/scenarioEngine'
import { formatCurrencyMYR } from '@/utils/formatters'
import { CHART_COLORS } from '@/theme/chartTheme'
import { resolveDisplayAssumptions } from '@/utils/illustrativeExample'

/**
 * What-If Business Simulator (knowledge_updated_nov2026.md item 2).
 * Pure, instant, client-side recalculation from scenarioEngine.js's exact
 * formulas — never saved to business_assumptions unless the owner uses
 * the separate Settings/Onboarding form. Explicitly labelled a simulation,
 * not a forecast, same honesty convention as every other scenario view in
 * this app.
 */

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

const SCENARIO_LABELS = { conservative: 'Conservative', expected: 'Current Plan', growth: 'Growth' }

export default function BusinessWhatIfSimulator({ values = {} }) {
  const { values: displayValues, isIllustrative } = resolveDisplayAssumptions(values)
  const defaults = useMemo(
    () => ({
      selling_price: num(displayValues.selling_price) ?? 0,
      cost_per_unit: num(displayValues.cost_per_unit) ?? 0,
      fixed_costs: num(displayValues.fixed_costs) ?? 0,
      expected_monthly_units: num(displayValues.expected_monthly_units) ?? 0,
    }),
    [displayValues]
  )

  const [sellingPrice, setSellingPrice] = useState(defaults.selling_price)
  const [costPerUnit, setCostPerUnit] = useState(defaults.cost_per_unit)
  const [fixedCosts, setFixedCosts] = useState(defaults.fixed_costs)
  const [units, setUnits] = useState(defaults.expected_monthly_units)

  const handleReset = () => {
    setSellingPrice(defaults.selling_price)
    setCostPerUnit(defaults.cost_per_unit)
    setFixedCosts(defaults.fixed_costs)
    setUnits(defaults.expected_monthly_units)
  }

  const scenarioAssumptions = {
    selling_price: sellingPrice,
    cost_per_unit: costPerUnit,
    fixed_costs: fixedCosts,
    marketing_cost: 0,
    platform_fees: 0,
    shipping_cost: 0,
    labour_cost: 0,
    other_expenses: 0,
  }
  const breakEven = calculateBreakEven(scenarioAssumptions)
  const contributionPerUnit = Math.round((sellingPrice - costPerUnit) * 100) / 100
  const revenue = Math.round(sellingPrice * units * 100) / 100
  const variableCosts = Math.round(costPerUnit * units * 100) / 100
  const grossProfit = Math.round((revenue - variableCosts) * 100) / 100
  const grossMarginPercent = calculateGrossMarginPercent(revenue, grossProfit)
  const operatingResult = Math.round((grossProfit - fixedCosts) * 100) / 100

  const scenarioRows = useMemo(() => {
    const scenarios = buildAllScenarios(displayValues)
    return Object.values(scenarios)
      .filter((s) => s.operatingResult !== null)
      .map((s) => ({ label: SCENARIO_LABELS[s.caseType], operatingResult: s.operatingResult }))
  }, [displayValues])

  return (
    <GlowSection
      title="What-If Business Simulator"
      description="Change the assumptions below to see the calculated results — a simulation, not a forecast."
    >
      {isIllustrative && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-glow-text/70">
            <span className="font-semibold text-amber-400">Illustrative example</span> — pre-filled with a sample
            price, cost, fixed costs, and unit count so you can try the simulator right away. Edit any field below,
            or add your real figures via Onboarding or Settings first.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Input label="Selling Price (RM)" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number.parseFloat(e.target.value) || 0)} />
        <Input label="Unit Cost (RM)" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(Number.parseFloat(e.target.value) || 0)} />
        <Input label="Monthly Fixed Costs (RM)" type="number" value={fixedCosts} onChange={(e) => setFixedCosts(Number.parseFloat(e.target.value) || 0)} />
        <Input label="Assumed Monthly Units Sold" type="number" value={units} onChange={(e) => setUnits(Number.parseFloat(e.target.value) || 0)} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-glow-border p-3">
          <p className="text-[11px] text-glow-text/50">Contribution per unit</p>
          <p className="mt-1 text-lg font-semibold text-glow-text">{formatCurrencyMYR(contributionPerUnit)}</p>
        </div>
        <div className="rounded-2xl border border-glow-border p-3">
          <p className="text-[11px] text-glow-text/50">Gross margin</p>
          <p className="mt-1 text-lg font-semibold text-glow-text">{grossMarginPercent === null ? '—' : `${grossMarginPercent}%`}</p>
        </div>
        <div className="rounded-2xl border border-glow-border p-3">
          <p className="text-[11px] text-glow-text/50">Break-even units</p>
          <p className="mt-1 text-lg font-semibold text-glow-text">{breakEven.insufficient ? '—' : breakEven.units}</p>
        </div>
        <div className="rounded-2xl border border-glow-border p-3">
          <p className="text-[11px] text-glow-text/50">Estimated operating result</p>
          <p className={`mt-1 text-lg font-semibold ${operatingResult < 0 ? 'text-rose-400' : 'text-glow-text'}`}>
            {formatCurrencyMYR(operatingResult)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-glow-text/60">
        {operatingResult < 0
          ? `Under these assumptions, the business would have an estimated operating shortfall of ${formatCurrencyMYR(Math.abs(operatingResult))}. Consider reviewing price, unit cost, or fixed expenses.`
          : `Under these assumptions, the business would have an estimated operating surplus of ${formatCurrencyMYR(operatingResult)} per month.`}
      </p>

      <Button variant="glowSecondary" size="sm" icon={RotateCcw} className="mt-4" onClick={handleReset}>
        Reset scenario
      </Button>

      {scenarioRows.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-glow-text/70">
            {isIllustrative ? 'Illustrative example' : 'Your saved plan'} under three assumption sets (Conservative
            / Current Plan / Growth)
          </p>
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.sm}>
            <BarChart data={scenarioRows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<ChartTooltip formatter={(value) => formatCurrencyMYR(value)} />} />
              <Bar dataKey="operatingResult" name="Operating Result" radius={[0, 4, 4, 0]} fill={CHART_COLORS.positive} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlowSection>
  )
}
