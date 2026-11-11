import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, Store } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { Input } from '@/components/ui/Input'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { CHART_COLORS } from '@/theme/chartTheme'
import KpiTile from '../components/KpiTile'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { monthlyExpenses, STARTUP_CATEGORIES, startupCapital } from '../engine'

const money0 = (value) => `RM${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`

export default function StartupCapital() {
  const { t } = useLang()
  const { shop, setShop, hasShop, loadDemo } = useShop()
  const [monthsBuffer, setMonthsBuffer] = useState(3)

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const expenses = monthlyExpenses(shop.expenses)
  const monthlyFixed = expenses.ok ? expenses.fixed : null
  const capital = startupCapital(shop.startupItems, {
    availableCapital: shop.availableCapital,
    monthlyFixed,
    monthsBuffer: Number(monthsBuffer),
  })

  const updateItem = (categoryId, raw) => {
    const value = raw === '' ? undefined : Number(raw)
    setShop((current) => ({ ...current, startupItems: { ...current.startupItems, [categoryId]: value } }))
  }

  return (
    <div className="space-y-5">
      <Section
        title={t('nav.capital')}
        description="What you need before opening. Every figure below is a sum of what you entered — nothing is estimated for you."
        provenance="Your input"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STARTUP_CATEGORIES.map((category) => (
            <Input
              key={category.id}
              label={category.label}
              type="number"
              value={shop.startupItems?.[category.id] ?? ''}
              onChange={(event) => updateItem(category.id, event.target.value)}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Available capital (RM)"
            type="number"
            value={shop.availableCapital ?? ''}
            onChange={(event) =>
              setShop((current) => ({
                ...current,
                availableCapital: event.target.value === '' ? null : Number(event.target.value),
              }))
            }
          />
          <Input
            label="Months of operating buffer"
            type="number"
            min={0}
            max={12}
            value={monthsBuffer}
            onChange={(event) => setMonthsBuffer(event.target.value)}
          />
        </div>
      </Section>

      {capital.ok ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile label="Estimated setup capital" value={money0(capital.total)} provenance="Calculated" />
            <KpiTile
              label="Monthly operating estimate"
              value={monthlyFixed !== null ? money0(monthlyFixed) : null}
              provenance="Calculated"
              needs={['expense records']}
            />
            <KpiTile
              label={`Cash needed (${capital.monthsBuffer}-month buffer)`}
              value={money0(capital.cashNeeded)}
              provenance="Calculated"
            />
            <KpiTile
              label={capital.gap > 0 ? 'Funding gap' : 'Capital surplus'}
              value={capital.gap !== undefined ? money0(Math.abs(capital.gap)) : null}
              provenance="Calculated"
              needs={['available capital']}
            />
          </div>

          {capital.gap !== undefined && (
            <Section provenance="Calculated">
              <div className="flex items-start gap-3">
                {capital.shortfall ? (
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-glow-text/80">
                    You have {money0(capital.availableCapital)} against an estimated {money0(capital.cashNeeded)} needed
                    {capital.shortfall
                      ? ` — a shortfall of ${money0(capital.gap)}.`
                      : ` — a surplus of ${money0(Math.abs(capital.gap))}.`}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${capital.shortfall ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{
                        width: `${Math.min(100, Math.round((capital.availableCapital / capital.cashNeeded) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-glow-text/40">
                    This compares your figures. It does not say whether the business will succeed.
                  </p>
                </div>
              </div>
            </Section>
          )}

          <Section title="Capital allocation" provenance="Calculated">
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
              <BarChart data={capital.allocation} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" unit=" RM" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<ChartTooltip formatter={(value) => `${money0(value)} (${Math.round((value / capital.total) * 100)}%)`} />}
                />
                <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} fill={CHART_COLORS.neutral} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Still missing" description="Categories you have not filled in yet." provenance="Calculated">
            {capital.missingCategories.length === 0 ? (
              <p className="text-xs text-emerald-400">All eight categories are filled in.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {capital.missingCategories.map((label) => (
                  <li key={label} className="rounded-full border border-glow-border px-2.5 py-1 text-[11px] text-glow-text/60">
                    {label}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 space-y-1">
              {capital.assumptions.map((assumption) => (
                <li key={assumption} className="text-[11px] text-glow-text/40">
                  Assumption: {assumption}
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <Section>
          <p className="text-xs text-glow-text/50">Enter at least one setup cost above to see your capital estimate.</p>
        </Section>
      )}
    </div>
  )
}
