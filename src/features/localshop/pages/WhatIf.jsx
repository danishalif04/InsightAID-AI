import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RotateCcw, Sparkles, Store } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { Select } from '@/components/ui/Input'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { CHART_COLORS } from '@/theme/chartTheme'
import KpiTile from '../components/KpiTile'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { breakEvenUnits, grossMarginPct, marginTable, monthlyExpenses, operatingResult, scenarioSet } from '../engine'

const money = (value) => `RM${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`

function Slider({ label, value, min, max, step, onChange, format }) {
  const id = `whatif-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[11px] font-medium text-glow-text/60">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-glow-text">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-glow-brand"
      />
    </div>
  )
}

export default function WhatIf() {
  const { t } = useLang()
  const { shop, hasShop, loadDemo } = useShop()

  const baseline = useMemo(() => {
    if (!shop) return null
    const expenses = monthlyExpenses(shop.expenses)
    const fixed = expenses.ok ? expenses.fixed : 0
    const top = marginTable(shop.products).rows[0] ?? null
    return {
      productId: top?.id ?? null,
      price: top?.price ?? 0,
      cost: top?.cost ?? 0,
      fixed,
      units: top ? Math.ceil(fixed / Math.max(top.price - top.cost, 0.01)) : 0,
    }
  }, [shop])

  const [state, setState] = useState(baseline)
  useEffect(() => setState(baseline), [baseline])

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }
  if (!state) return null

  const selectProduct = (id) => {
    const product = shop.products.find((p) => p.id === id)
    if (!product) return
    setState((current) => ({ ...current, productId: id, price: product.price ?? 0, cost: product.cost ?? 0 }))
  }

  const result = operatingResult(state.units, state.price, state.cost, state.fixed)
  const margin = grossMarginPct(state.price, state.cost)
  const bep = breakEvenUnits(state.fixed, state.price, state.cost)
  const scenarios = scenarioSet({ units: state.units, price: state.price, varCost: state.cost, fixed: state.fixed })

  const chartRows = scenarios.ok
    ? scenarios.scenarios.map((scenario) => ({
        name: scenario.name === 'current' ? 'Current plan' : scenario.name === 'optimistic' ? 'Optimistic' : 'Conservative',
        operatingResult: scenario.value ?? 0,
      }))
    : []

  const loss = result.ok && result.value < 0

  return (
    <div className="space-y-5">
      <Section
        title={t('nav.whatif')}
        description={t('common.simulation')}
        provenance="Assumption"
        actions={
          <Button variant="glowSecondary" size="sm" icon={RotateCcw} onClick={() => setState(baseline)}>
            Reset scenario
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Select label="Product" value={state.productId ?? ''} onChange={(event) => selectProduct(event.target.value)}>
              {shop.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
            <Slider
              label="Selling price"
              value={state.price}
              min={0}
              max={Math.max(50, Math.ceil(state.price * 3))}
              step={0.1}
              onChange={(price) => setState((c) => ({ ...c, price }))}
              format={money}
            />
            <Slider
              label="Unit cost"
              value={state.cost}
              min={0}
              max={Math.max(50, Math.ceil(state.cost * 3))}
              step={0.1}
              onChange={(cost) => setState((c) => ({ ...c, cost }))}
              format={money}
            />
            <Slider
              label="Monthly fixed costs"
              value={state.fixed}
              min={0}
              max={Math.max(10000, Math.ceil(state.fixed * 3))}
              step={50}
              onChange={(fixed) => setState((c) => ({ ...c, fixed }))}
              format={money}
            />
            <Slider
              label="Assumed monthly units sold"
              value={state.units}
              min={0}
              max={Math.max(2000, Math.ceil(state.units * 3))}
              step={5}
              onChange={(units) => setState((c) => ({ ...c, units }))}
              format={(value) => `${value} ${t('common.units')}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 self-start">
            <KpiTile
              label="Contribution per unit"
              value={money(Math.round((state.price - state.cost) * 100) / 100)}
              provenance="Calculated"
            />
            <KpiTile label="Gross margin" value={margin.ok ? margin.value : null} suffix="%" provenance="Calculated" />
            <KpiTile label="Break-even units" value={bep.ok ? bep.value : null} provenance="Calculated" />
            <div className={`rounded-2xl border p-4 ${loss ? 'border-rose-500/40 bg-rose-500/5' : 'border-glow-border bg-glow-surface-elevated'}`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-glow-text/50">Monthly operating result</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${loss ? 'text-rose-400' : 'text-glow-text'}`}>
                {result.ok ? money(result.value) : '—'}
              </p>
            </div>
          </div>
        </div>

        {result.ok && (
          <p className="mt-4 text-xs leading-relaxed text-glow-text/70">
            {loss
              ? `Under these assumptions the business would run an estimated monthly shortfall of ${money(Math.abs(result.value))}. Consider reviewing price, unit cost or fixed expenses.`
              : `Under these assumptions the business would run an estimated monthly surplus of ${money(result.value)}.`}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-glow-border p-3 text-[11px] text-glow-text/50">
          <span>You change inputs</span>
          <span aria-hidden="true">→</span>
          <span>App recalculates</span>
          <span aria-hidden="true">→</span>
          <span>AI explains the verified result</span>
          <span aria-hidden="true">→</span>
          <span className="font-medium text-glow-text/70">You decide</span>
        </div>
      </Section>

      <Section
        title="Three scenarios"
        description="Conservative assumes 20% fewer units and 10% higher costs; optimistic assumes 20% more units."
        provenance="Assumption"
        note={scenarios.ok ? scenarios.assumptionNote : undefined}
      >
        {chartRows.length === 0 ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.sm}>
            <BarChart data={chartRows} margin={{ left: -8, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis unit=" RM" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(value) => money(value)} />} />
              <Bar dataKey="operatingResult" name="Operating result" radius={[4, 4, 0, 0]}>
                {chartRows.map((row) => (
                  <Cell key={row.name} fill={row.operatingResult < 0 ? '#f43f5e' : CHART_COLORS.positive} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-glow-text/40">
          <Sparkles className="size-3" aria-hidden="true" />
          Ask the AI assistant to explain these figures — it only ever receives the verified numbers above.
        </p>
      </Section>
    </div>
  )
}
