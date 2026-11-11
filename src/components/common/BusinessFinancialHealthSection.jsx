import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lightbulb, Sparkles } from 'lucide-react'
import ChartCard from '@/components/charts/ChartCard'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { buildScenario, calculateBreakEven, calculateGrossMarginPercent } from '@/utils/scenarioEngine'
import { formatCurrencyMYR } from '@/utils/formatters'
import { CHART_COLORS } from '@/theme/chartTheme'
import { resolveDisplayAssumptions } from '@/utils/illustrativeExample'

/**
 * "Financial Planning & Business Health" — Malaysian Local Shop dashboard,
 * §B of the knowledge_updated_nov2026.md Local Shop spec. Sits directly
 * below BusinessOverviewCard on the Dashboard for the no-data path.
 *
 * Deliberately reuses the exact same scenarioEngine.js formulas as the
 * separate Financial Planning page (src/pages/FinancialPlanning.jsx) —
 * no new calculation logic, just a different, dashboard-embedded
 * presentation of the same real assumptions. Cost Structure uses a
 * ranked bar, not a donut — this project's own chart audit
 * (reports/CHART_AUDIT.md) already flagged donuts as a Cleveland-McGill
 * ranking violation and removed the one that used to exist.
 */

const COST_FIELDS = [
  { id: 'marketing_cost', label: 'Marketing' },
  { id: 'platform_fees', label: 'Platform Fees' },
  { id: 'shipping_cost', label: 'Shipping' },
  { id: 'labour_cost', label: 'Labour' },
  { id: 'fixed_costs', label: 'Fixed Costs' },
  { id: 'other_expenses', label: 'Other Expenses' },
]

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

export default function BusinessFinancialHealthSection({ values = {} }) {
  const { values: displayValues, isIllustrative } = resolveDisplayAssumptions(values)
  const expected = useMemo(() => buildScenario(displayValues, 'expected'), [displayValues])
  const breakEven = useMemo(() => calculateBreakEven(displayValues), [displayValues])
  const grossMarginPercent = calculateGrossMarginPercent(expected.revenue, expected.grossProfit)

  const expenseRows = COST_FIELDS.map((field) => ({ ...field, amount: displayValues[field.id] }))
    .filter((row) => typeof row.amount === 'number' && Number.isFinite(row.amount))
    .sort((a, b) => b.amount - a.amount)
  const totalExpenses = expenseRows.reduce((sum, row) => sum + row.amount, 0)

  // Variable costs are the one cost that scales with units sold (cost per
  // unit x expected monthly units). Every other recorded cost field is a
  // flat monthly figure in this app's own data model (see
  // scenarioEngine.js's own comment on sumOperatingCosts) — so "Fixed /
  // Operating Costs" here means exactly those six fields, not a guess.
  const hasUnits = typeof displayValues.expected_monthly_units === 'number' && Number.isFinite(displayValues.expected_monthly_units)
  const hasCostPerUnit = typeof displayValues.cost_per_unit === 'number' && Number.isFinite(displayValues.cost_per_unit)
  const variableCosts = hasUnits && hasCostPerUnit ? displayValues.expected_monthly_units * displayValues.cost_per_unit : null
  const costStructureRows = [
    variableCosts !== null && { label: 'Variable Costs (cost per unit × units)', amount: Math.round(variableCosts * 100) / 100 },
    totalExpenses > 0 && { label: 'Fixed / Operating Costs', amount: Math.round(totalExpenses * 100) / 100 },
  ].filter(Boolean)
  const totalCostStructure = costStructureRows.reduce((sum, row) => sum + row.amount, 0)

  const breakEvenSeries = useMemo(() => {
    if (breakEven.insufficient || !breakEven.units) return []
    const maxUnits = breakEven.units * 2
    const step = Math.max(1, Math.round(maxUnits / 20))
    const points = []
    for (let units = 0; units <= maxUnits; units += step) {
      points.push({
        units,
        revenue: Math.round(units * displayValues.selling_price * 100) / 100,
        cost: Math.round((expected.operatingCosts + units * displayValues.cost_per_unit) * 100) / 100,
      })
    }
    return points
  }, [breakEven, displayValues, expected.operatingCosts])

  const dailyTarget = !breakEven.insufficient && breakEven.units ? Math.ceil(breakEven.units / 30) : null

  // Rule-based pricing note, same honesty convention as the recommendation
  // engine — no LLM, fully traceable to the two numbers it uses.
  const pricingInsight =
    hasCostPerUnit && typeof displayValues.selling_price === 'number'
      ? (() => {
          const bumpedCost = displayValues.cost_per_unit + 0.5
          const newMargin = calculateGrossMarginPercent(displayValues.selling_price, displayValues.selling_price - bumpedCost)
          return grossMarginPercent !== null && newMargin !== null
            ? `Your product currently has an estimated gross margin of ${grossMarginPercent}%. If its cost per unit increases by RM0.50 (to RM${bumpedCost.toFixed(2)}), the margin would fall to ${newMargin}% unless the selling price changes.`
            : null
        })()
      : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-glow-text">Financial Planning &amp; Business Health</h2>
        <p className="mt-1 text-xs text-glow-text/50">
          Calculated directly from your registered price, cost, and expense assumptions — not a prediction, and
          not based on sales history you don't have yet.
        </p>
      </div>

      {isIllustrative && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-glow-text/70">
            <span className="font-semibold text-amber-400">Illustrative example</span> — the charts below use a
            sample price, cost, and fixed costs so you can see what this section looks like. Add your own via
            Onboarding or Settings to replace them with your real numbers.
          </p>
        </div>
      )}

      <ChartCard
        title="Monthly Expense Breakdown"
        subtitle="Your recorded operating costs, ranked highest to lowest"
        readingGuide="Each bar is one cost category you've entered. Longer bars are a bigger share of your total monthly costs."
        method="scenario"
        methodNote={
          isIllustrative
            ? 'Illustrative example figures — not your own data yet. Add your cost fields via Onboarding or Settings.'
            : 'Calculated directly from the cost fields you entered — nothing here is estimated or invented.'
        }
        surface="glow"
        ariaLabel="Monthly expense breakdown bar chart, ranked by amount"
        status="success"
        data={expenseRows}
        emptyWhen={(rows) => rows.length === 0}
        emptyMessage="No expense fields filled in yet — add them via Onboarding or Settings."
      >
        {(rows) => (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) => `${formatCurrencyMYR(value)} (${totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0}%)`}
                  />
                }
              />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} fill={CHART_COLORS.positive} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Cost Structure"
        subtitle="Variable costs (scale with units sold) vs. fixed/operating costs (flat monthly)"
        readingGuide="Variable costs grow with how much you sell; fixed/operating costs stay the same regardless of volume. Knowing the split shows which costs you can control by changing volume vs. which need a separate decision."
        method="scenario"
        methodNote={
          isIllustrative
            ? 'Illustrative example figures — not your own data yet.'
            : 'Variable = cost per unit × expected monthly units. Fixed/Operating = the sum of your recorded monthly cost fields.'
        }
        surface="glow"
        ariaLabel="Cost structure bar chart comparing variable and fixed costs"
        status="success"
        data={costStructureRows}
        emptyWhen={(rows) => rows.length === 0}
        emptyMessage="Add your cost per unit, expected monthly units, and expense fields to see this breakdown."
      >
        {(rows) => (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.sm}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={150} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) => `${formatCurrencyMYR(value)} (${totalCostStructure > 0 ? Math.round((value / totalCostStructure) * 100) : 0}%)`}
                  />
                }
              />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} fill={CHART_COLORS.neutral} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Break-even Analysis"
        subtitle="Revenue vs. total cost as units sold increases"
        readingGuide="Two lines: your revenue if you sold that many units, and your total cost at that volume. Where they cross is your break-even point."
        method="scenario"
        methodNote={
          isIllustrative
            ? 'Illustrative example figures — not your own data yet. Add your price, cost, and expenses via Onboarding or Settings.'
            : 'A calculated projection from your real price/cost/operating-cost assumptions, not historical sales data — a planning tool, not a forecast.'
        }
        surface="glow"
        ariaLabel="Break-even chart showing revenue and cost lines crossing at the break-even point"
        status="success"
        data={breakEvenSeries}
        emptyWhen={(rows) => rows.length === 0}
        emptyMessage="Add selling price, cost per unit, and at least one cost field to see your break-even chart."
      >
        {(rows) => (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
              <LineChart data={rows} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="units" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" units" />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
                <Tooltip content={<ChartTooltip formatter={(value) => formatCurrencyMYR(value)} />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" name="Total Cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                {!breakEven.insufficient && (
                  <ReferenceDot x={breakEven.units} y={breakEven.revenue} r={5} fill={CHART_COLORS.positive} />
                )}
              </LineChart>
            </ResponsiveContainer>
            {dailyTarget !== null && (
              <p className="mt-3 text-xs text-glow-text/50">
                Daily sales target (30 days): <span className="font-semibold text-glow-text/80">{dailyTarget} units/day</span>
              </p>
            )}
          </>
        )}
      </ChartCard>

      {pricingInsight && (
        <GlowSection title="Product Pricing Assistant" description={isIllustrative ? 'Illustrative example' : undefined}>
          <div className="flex items-start gap-2.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-glow-brand" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-glow-text/70">{pricingInsight}</p>
          </div>
          <p className="mt-3 text-[11px] text-glow-text/40">
            Margin alone doesn't show which product earns the most total profit — that also needs sales
            quantities. Register more products and record sales to compare profitability across your catalogue.
          </p>
        </GlowSection>
      )}
    </div>
  )
}
