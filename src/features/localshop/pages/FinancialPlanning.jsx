import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Store } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { CHART_COLORS } from '@/theme/chartTheme'
import KpiTile from '../components/KpiTile'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import {
  breakEvenRevenueMulti,
  breakEvenUnits,
  cashRunway,
  dailyTarget,
  marginTable,
  monthlyExpenses,
  startupCapital,
} from '../engine'

const money0 = (value) => `RM${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`

export default function FinancialPlanningScreen() {
  const { t } = useLang()
  const { shop, hasShop, loadDemo } = useShop()
  const [assumedUnits, setAssumedUnits] = useState(null)

  const model = useMemo(() => {
    if (!shop) return null
    const expenses = monthlyExpenses(shop.expenses)
    const fixed = expenses.ok ? expenses.fixed : null
    const margins = marginTable(shop.products)

    // The break-even CHART needs a single representative price/cost pair.
    // The shop-wide figure uses the unweighted multi-product formula; this
    // chart uses the highest-margin product and says so, rather than
    // silently inventing an "average product" that does not exist.
    const reference = margins.rows[0] ?? null
    const unitsBep = reference && fixed !== null ? breakEvenUnits(fixed, reference.price, reference.cost) : { ok: false }
    const revenueBep = fixed !== null ? breakEvenRevenueMulti(fixed, shop.products) : { ok: false }

    return { expenses, fixed, margins, reference, unitsBep, revenueBep }
  }, [shop])

  const bepUnits = model?.unitsBep?.ok ? model.unitsBep.value : null
  const units = assumedUnits ?? bepUnits ?? 0

  // Revenue / total cost / fixed cost across a unit range centred on
  // break-even. Declared before any early return so hook order is stable.
  const series = useMemo(() => {
    const reference = model?.reference
    if (!bepUnits || !reference || model?.fixed === null) return []
    const max = Math.max(Math.ceil(bepUnits * 2), units + 10)
    const step = Math.max(1, Math.round(max / 24))
    const points = []
    for (let u = 0; u <= max; u += step) {
      points.push({
        units: u,
        revenue: Math.round(u * reference.price * 100) / 100,
        totalCost: Math.round((model.fixed + u * reference.cost) * 100) / 100,
        fixedCost: model.fixed,
      })
    }
    return points
  }, [model, bepUnits, units])

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const { expenses, fixed, reference, unitsBep, revenueBep } = model
  const maxUnits = series.length ? series[series.length - 1].units : 0
  const daily = unitsBep.ok ? dailyTarget(bepUnits) : { ok: false }
  const runway = cashRunway(shop.cash, shop.monthlyOutflow)
  const capital = startupCapital(shop.startupItems, { monthlyFixed: fixed, availableCapital: shop.availableCapital })

  return (
    <div className="space-y-5">
      {/* 5. Financial health indicators — a small group, never a single score. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Average gross margin"
          value={revenueBep.ok ? revenueBep.avgMarginPct : null}
          suffix="%"
          provenance="Calculated"
          hint="Unweighted across products"
          needs={['product price + unit cost']}
        />
        <KpiTile
          label="Monthly operating cost"
          value={expenses.ok ? money0(expenses.total) : null}
          provenance="Calculated"
          needs={['expense records']}
        />
        <KpiTile
          label="Break-even sales"
          value={revenueBep.ok ? money0(revenueBep.value) : null}
          provenance="Calculated"
          hint={daily.ok ? `${bepUnits} ${t('common.units')} · ${daily.value}${t('common.perDay')}` : undefined}
          needs={['fixed costs', 'product margins']}
        />
        <KpiTile
          label="Cash runway"
          value={runway.ok ? runway.value : null}
          suffix="months"
          provenance="Calculated"
          needs={['cash on hand', 'monthly outflow']}
        />
      </div>

      {/* 1. Monthly expense breakdown */}
      <Section
        title="Monthly expense breakdown"
        description="Where the money goes each month, ranked."
        provenance="Calculated"
      >
        {!expenses.ok ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
            <BarChart data={expenses.byCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" unit=" RM" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) => `RM${Number(value).toFixed(2)} (${Math.round((value / expenses.total) * 100)}%)`}
                  />
                }
              />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} fill={CHART_COLORS.positive} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* 2. Break-even chart with loss/profit regions */}
      <Section
        title="Break-even analysis"
        description={
          reference
            ? `Revenue vs total cost as units sold increases, using ${reference.name} (RM${reference.price.toFixed(2)} price, RM${reference.cost.toFixed(2)} cost) as the reference product.`
            : 'Revenue vs total cost as units sold increases.'
        }
        provenance="Calculated"
        note="An actual calculation from your own figures, not a prediction. The shaded regions are loss (left of the crossing) and profit (right)."
      >
        {series.length === 0 ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
              <ComposedChart data={series} margin={{ left: -4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="units" unit=" u" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis unit=" RM" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(value) => `RM${Number(value).toFixed(2)}`} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea x1={0} x2={bepUnits} fill="#f43f5e" fillOpacity={0.07} />
                <ReferenceArea x1={bepUnits} x2={maxUnits} fill={CHART_COLORS.positive} fillOpacity={0.07} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalCost" name="Total cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="fixedCost" name="Fixed cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <ReferenceDot
                  x={bepUnits}
                  y={Math.round(bepUnits * reference.price * 100) / 100}
                  r={5}
                  fill={CHART_COLORS.positive}
                  stroke="none"
                />
                {assumedUnits !== null && <ReferenceLine x={assumedUnits} stroke="#38bdf8" strokeDasharray="3 3" />}
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-4">
              <label htmlFor="assumed-units" className="block text-[11px] font-medium text-glow-text/50">
                Assumed units sold: <span className="font-semibold text-glow-text">{units}</span>
                {bepUnits ? ` · break-even is ${bepUnits}` : ''}
              </label>
              <input
                id="assumed-units"
                type="range"
                min={0}
                max={maxUnits}
                value={units}
                onChange={(event) => setAssumedUnits(Number(event.target.value))}
                className="mt-2 w-full accent-glow-brand"
              />
            </div>
          </>
        )}
      </Section>

      {/* 3. Cost structure */}
      <Section
        title="Cost structure"
        description="Fixed costs stay the same whatever you sell; variable costs move with volume."
        provenance="Calculated"
      >
        {!expenses.ok ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              <div
                className="bg-glow-brand"
                style={{ width: `${expenses.fixedSharePct}%` }}
                title={`Fixed ${expenses.fixedSharePct}%`}
              />
              <div className="bg-amber-400" style={{ width: `${100 - expenses.fixedSharePct}%` }} title="Variable" />
            </div>
            <p className="mt-2 text-[11px] text-glow-text/50">
              Fixed {money0(expenses.fixed)} ({expenses.fixedSharePct}%) · Variable {money0(expenses.variable)}
            </p>

            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-glow-text/40">
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 font-medium">Control</th>
                </tr>
              </thead>
              <tbody>
                {expenses.byCategory.map((row) => (
                  <tr key={row.category} className="border-t border-glow-border/60">
                    <td className="py-1.5 pr-3 text-glow-text/80">{row.category}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-glow-text/70">RM{row.amount.toFixed(2)}</td>
                    <td className="py-1.5 pr-3 text-glow-text/50">
                      {row.kind === 'variable' ? 'Varies with sales' : 'Recurring'}
                    </td>
                    <td className="py-1.5 text-glow-text/50">{row.controllable ? 'Controllable' : 'Committed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Section>

      {capital.ok && (
        <Section title="Startup capital requirement" provenance="Calculated">
          <p className="text-xs text-glow-text/70">
            Estimated setup capital {money0(capital.total)}
            {capital.cashNeeded !== capital.total && <> · with a {capital.monthsBuffer}-month buffer {money0(capital.cashNeeded)}</>}
          </p>
          {capital.assumptions.map((assumption) => (
            <p key={assumption} className="mt-1 text-[11px] text-glow-text/40">
              {assumption}
            </p>
          ))}
        </Section>
      )}
    </div>
  )
}
