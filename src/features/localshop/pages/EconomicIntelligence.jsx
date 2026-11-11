import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Database, Info, Store } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { Select } from '@/components/ui/Input'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { CHART_COLORS } from '@/theme/chartTheme'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { readCpiSnapshot } from '../data/cpi'
import { costPressure, marginTable, mitigationOptions } from '../engine'

const PRESSURE_STEPS = [5, 10, 15, 20]
const money = (value) => `RM${Number(value).toFixed(2)}`

export default function EconomicIntelligence() {
  const { t } = useLang()
  const { shop, hasShop, loadDemo } = useShop()
  const [productId, setProductId] = useState(null)
  const [increasePct, setIncreasePct] = useState(10)

  const cpi = readCpiSnapshot()

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const rows = marginTable(shop.products).rows
  const selected = rows.find((row) => row.id === productId) ?? rows[0] ?? null
  const pressure = selected
    ? costPressure(selected.price, selected.cost, Math.round(selected.cost * (1 + increasePct / 100) * 100) / 100)
    : null
  const options = pressure?.ok ? mitigationOptions(pressure) : null

  return (
    <div className="space-y-5">
      {/* The separation note is persistent, not a one-off disclaimer. */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-glow-border bg-glow-brand/5 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-glow-brand" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-glow-text/60">
          National inflation is context only. It does not explain why your own supplier's price changed, and this
          screen never claims it did. Cost-pressure figures below come from your own recorded costs.
        </p>
      </div>

      <Section
        title="Inflation monitor"
        description="Malaysian CPI by state, overall vs food & non-alcoholic beverages."
        provenance={cpi.hasData ? 'Calculated' : undefined}
      >
        {cpi.hasData ? (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
              <BarChart data={cpi.rows} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="overall" name="CPI: Overall" radius={[0, 3, 3, 0]} fill={CHART_COLORS.neutral} />
                <Bar dataKey="food_beverages" name="CPI: Food & Beverages" radius={[0, 3, 3, 0]} fill={CHART_COLORS.positive} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-3 text-[11px] text-glow-text/40">
              Source: {cpi.source} · Period: {cpi.period} · Retrieved: {cpi.retrievedOn} · {cpi.unit}
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-glow-border p-6 text-center">
            <Database className="mx-auto size-5 text-glow-text/30" aria-hidden="true" />
            <p className="mt-2 text-xs text-glow-text/60">No CPI data loaded yet.</p>
            <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-glow-text/40">
              Figures are deliberately left empty rather than filled with placeholder numbers. Paste real DOSM values
              into <code className="rounded bg-white/5 px-1">src/features/localshop/data/cpi.snapshot.json</code> with
              their source, period and retrieval date, then set <code className="rounded bg-white/5 px-1">status</code>{' '}
              to <code className="rounded bg-white/5 px-1">loaded</code>.
            </p>
          </div>
        )}
      </Section>

      <Section title="Price watch" description="Observed price movements for selected goods.">
        <p className="text-xs text-glow-text/50">{cpi.priceWatch.note ?? 'No verified price source is connected.'}</p>
      </Section>

      <Section
        title="Cost pressure analysis"
        description="What an increase in one of YOUR recorded costs does to YOUR margin."
        provenance="Calculated"
      >
        {!selected ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Product" value={selected.id} onChange={(event) => setProductId(event.target.value)}>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-glow-text/50">
                  If the unit cost rises by {increasePct}%
                </span>
                <div className="flex gap-2">
                  {PRESSURE_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setIncreasePct(step)}
                      aria-pressed={increasePct === step}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        increasePct === step
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

            {pressure?.ok && (
              <>
                <p className="mt-4 text-xs leading-relaxed text-glow-text/70">
                  {selected.name}: unit cost {money(pressure.oldCost)} → {money(pressure.newCost)} at a price of{' '}
                  {money(pressure.price)} moves the gross margin from{' '}
                  <span className="font-semibold text-glow-text">{pressure.marginBeforePct}%</span> to{' '}
                  <span className="font-semibold text-glow-text">{pressure.marginAfterPct}%</span> (
                  {pressure.marginDeltaPp}pp).
                </p>

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-glow-text/40">
                    Mitigation options
                  </p>
                  <ul className="space-y-1.5">
                    {options?.options?.map((option) => (
                      <li key={option.id} className="rounded-xl border border-glow-border p-2.5 text-[11px]">
                        <span className="font-medium text-glow-text/80">{option.label}</span>
                        <p className="mt-0.5 text-glow-text/50">{option.detail}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-glow-text/40">
                    Options to consider. Nothing is applied automatically and no supplier is contacted.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </Section>
    </div>
  )
}
