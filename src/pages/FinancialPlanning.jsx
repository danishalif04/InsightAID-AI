import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calculator, PiggyBank } from 'lucide-react'
import PageHero from '@/components/ui/PageHero'
import StatTile from '@/components/ui/StatTile'
import EmptyState from '@/components/ui/EmptyState'
import ChartCard from '@/components/charts/ChartCard'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getProfile } from '@/services/businessProfileService'
import { fetchRawSalesPayloads } from '@/services/salesService'
import { computeProductBreakdown, normalizeSalesRows } from '@/utils/salesSeries'
import { buildScenario, calculateBreakEven, calculateGrossMarginPercent } from '@/utils/scenarioEngine'
import { formatCurrencyMYR } from '@/utils/formatters'
import { CHART_COLORS } from '@/theme/chartTheme'

/** Same local-section pattern every redesigned page defines. */
function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

const COST_FIELDS = [
  { id: 'marketing_cost', label: 'Marketing' },
  { id: 'platform_fees', label: 'Platform Fees' },
  { id: 'shipping_cost', label: 'Shipping' },
  { id: 'labour_cost', label: 'Labour' },
  { id: 'fixed_costs', label: 'Fixed Costs' },
  { id: 'other_expenses', label: 'Other Expenses' },
]

async function loadData() {
  const [profile, salesPayloads] = await Promise.all([getProfile(), fetchRawSalesPayloads().catch(() => [])])
  return { profile, salesPayloads }
}

export default function FinancialPlanning() {
  const { status, data, error, reload } = useAsyncData(loadData, [])

  const assumptions = useMemo(() => data?.profile?.values ?? {}, [data])
  const hasAssumptions = data?.profile?.exists ?? false

  const expected = useMemo(() => buildScenario(assumptions, 'expected'), [assumptions])
  const breakEven = useMemo(() => calculateBreakEven(assumptions), [assumptions])
  const grossMarginPercent = calculateGrossMarginPercent(expected.revenue, expected.grossProfit)

  const expenseRows = COST_FIELDS.map((field) => ({ ...field, amount: assumptions[field.id] }))
    .filter((row) => typeof row.amount === 'number' && Number.isFinite(row.amount))
    .sort((a, b) => b.amount - a.amount)
  const totalExpenses = expenseRows.reduce((sum, row) => sum + row.amount, 0)

  // Break-even chart: revenue/cost lines over a unit range from 0 to 2x the
  // break-even point, built from the SAME real assumption values
  // calculateBreakEven() already used — never a separate/guessed input.
  const breakEvenSeries = useMemo(() => {
    if (breakEven.insufficient || !breakEven.units) return []
    const maxUnits = breakEven.units * 2
    const step = Math.max(1, Math.round(maxUnits / 20))
    const points = []
    for (let units = 0; units <= maxUnits; units += step) {
      points.push({
        units,
        revenue: Math.round(units * assumptions.selling_price * 100) / 100,
        cost: Math.round((expected.operatingCosts + units * assumptions.cost_per_unit) * 100) / 100,
      })
    }
    return points
  }, [breakEven, assumptions, expected.operatingCosts])

  const productBreakdown = useMemo(
    () => computeProductBreakdown(normalizeSalesRows(data?.salesPayloads ?? [])),
    [data]
  )

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Decision Support"
        title="Financial Planning"
        highlight="Planning"
        description="Break-even, expenses, and product margins — calculated directly from your business assumptions and sales data, never guessed."
      />

      {status === 'success' && !hasAssumptions && (
        <GlowSection>
          <EmptyState
            icon={PiggyBank}
            message="No business assumptions on file yet — fill in your pricing and costs via Onboarding or Settings to see real break-even and expense numbers here."
          />
        </GlowSection>
      )}

      {status === 'success' && hasAssumptions && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Gross Margin"
              value={grossMarginPercent ?? undefined}
              unit="%"
              guide="Gross profit as a share of revenue: (Revenue − Variable Costs) ÷ Revenue. Shown only when both revenue and variable costs are computable from your assumptions."
            />
            <StatTile
              label="Monthly Operating Costs"
              value={expected.operatingCosts ?? undefined}
              prefix="RM "
              decimals={2}
              guide="Sum of every operating-cost field you've filled in (marketing, platform fees, shipping, labour, fixed costs, other) — fields left blank are excluded, never treated as zero."
            />
            <StatTile
              label="Break-even Units"
              value={breakEven.insufficient ? undefined : breakEven.units}
              guide="Units you need to sell per month to cover total operating costs: Operating Costs ÷ (Selling Price − Cost per Unit)."
            />
            <StatTile
              label="Break-even Revenue"
              value={breakEven.insufficient ? undefined : breakEven.revenue}
              prefix="RM "
              decimals={2}
              guide="Break-even Units × Selling Price."
            />
          </div>

          <ChartCard
            title="Expense Breakdown"
            subtitle="Your monthly operating costs, ranked highest to lowest"
            readingGuide="Each bar is one cost category you've entered. Longer bars are a bigger share of your total monthly costs — the top one is where cost-cutting would have the biggest impact."
            method="scenario"
            methodNote="Calculated directly from the cost fields you entered in Onboarding/Settings — nothing here is estimated or invented."
            surface="glow"
            ariaLabel="Expense breakdown bar chart, ranked by amount"
            status={status}
            data={expenseRows}
            error={error}
            reload={reload}
            emptyWhen={(rows) => rows.length === 0}
            emptyMessage="No expense fields filled in yet."
          >
            {(rows) => (
              <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
                <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
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
            title="Break-even Analysis"
            subtitle="Revenue vs. total cost as units sold increases"
            readingGuide="Two lines: your revenue if you sold that many units, and your total cost at that volume (fixed + variable). Where they cross is your break-even point — sell more than that and you're profitable."
            method="scenario"
            methodNote="A calculated projection from your real price/cost/operating-cost assumptions, not historical sales data — treat it as a planning tool, not a forecast."
            surface="glow"
            ariaLabel="Break-even chart showing revenue and cost lines crossing at the break-even point"
            status={status}
            data={breakEvenSeries}
            error={error}
            reload={reload}
            emptyWhen={(rows) => rows.length === 0}
            emptyMessage="Add selling price, cost per unit, and at least one cost field to see your break-even chart."
          >
            {(rows) => (
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
            )}
          </ChartCard>

          <GlowSection
            title="Product Margin Analysis"
            description="From your real uploaded sales data — not shown for accounts with no sales history yet"
          >
            {productBreakdown.length === 0 ? (
              <EmptyState
                icon={Calculator}
                message="No product-level sales data yet — this section needs an uploaded sales dataset, not just your business assumptions."
              />
            ) : (
              <ul className="space-y-3">
                {productBreakdown.slice(0, 8).map((item) => (
                  <li key={item.product} className="flex items-center justify-between gap-3 rounded-xl border border-glow-border p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-glow-text/80">{item.product}</span>
                    <span className="shrink-0 text-glow-text/50">{formatCurrencyMYR(item.revenue)} revenue</span>
                    <span className="shrink-0 font-semibold text-glow-brand">
                      {item.grossMarginPercent != null ? `${item.grossMarginPercent}% margin` : '— margin (no cost data)'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlowSection>
        </>
      )}
    </div>
  )
}
