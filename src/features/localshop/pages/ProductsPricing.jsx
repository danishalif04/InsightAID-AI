import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Store } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { CHART_COLORS } from '@/theme/chartTheme'
import { magnitudeStep } from '@/config/colorTokens'
import { useTheme } from '@/hooks/useTheme'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { costPressure, marginTable, mitigationOptions } from '../engine'

const money = (value) => `RM${Number(value).toFixed(2)}`

export default function ProductsPricing() {
  const { t } = useLang()
  const { isDark } = useTheme()
  const { shop, setShop, hasShop, loadDemo } = useShop()
  const [selectedId, setSelectedId] = useState(null)
  const [costIncrease, setCostIncrease] = useState(0.5)

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const table = marginTable(shop.products)
  const selected = shop.products.find((p) => p.id === (selectedId ?? shop.products[0]?.id))

  const updateProduct = (id, field, raw) => {
    const value = raw === '' ? null : Number(raw)
    setShop((current) => ({
      ...current,
      products: current.products.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }))
  }

  // The pricing assistant is pure engine output — no LLM involved.
  const pressure =
    selected && typeof selected.price === 'number' && typeof selected.cost === 'number'
      ? costPressure(selected.price, selected.cost, selected.cost + Number(costIncrease || 0))
      : null
  const options = pressure?.ok ? mitigationOptions(pressure) : null

  // Top 12 keeps the ranked bar readable; the table below carries the rest.
  const chartRows = table.rows.slice(0, 12).map((row) => ({ name: row.name, marginPct: row.marginPct }))
  // Ramp spans this chart's own range, so the shading spreads across
  // whatever margins the shop's products actually occupy.
  const marginValues = chartRows.map((row) => Number(row.marginPct) || 0)
  const marginRange = marginValues.length
    ? { min: Math.min(...marginValues), max: Math.max(...marginValues) }
    : { min: 0, max: 0 }

  return (
    <div className="space-y-5">
      <Section
        title="Gross margin by product"
        description="Ranked highest to lowest. (Selling price − unit cost) ÷ selling price."
        provenance="Calculated"
        note={table.note}
      >
        {chartRows.length === 0 ? (
          <p className="text-xs text-glow-text/50">{t('common.notEnough')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
            <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
              {/* Sequential ramp, not one flat colour and not a hue per
                  product: these bars are the same measure at different
                  sizes, so the shade carries the same information the
                  length does. A hue per product would colour by rank. */}
              <Bar dataKey="marginPct" name="Gross margin" radius={[0, 4, 4, 0]}>
                {chartRows.map((row) => (
                  <Cell key={row.name} fill={magnitudeStep(row.marginPct, { ...marginRange, isDark, hue: 'green' })} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <Section
        title="Product catalogue"
        description="Edit a cost or price and the margin updates immediately."
        provenance="Your input"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-glow-text/40">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Unit cost (RM)</th>
                <th className="py-2 pr-3 font-medium">Selling price (RM)</th>
                <th className="py-2 pr-3 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {shop.products.map((product) => {
                const row = table.rows.find((r) => r.id === product.id)
                return (
                  <tr key={product.id} className="border-t border-glow-border/60">
                    <td className="py-1.5 pr-3 text-glow-text/80">{product.name}</td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="number"
                        step="0.01"
                        aria-label={`${product.name} unit cost`}
                        value={product.cost ?? ''}
                        onChange={(event) => updateProduct(product.id, 'cost', event.target.value)}
                        className="w-24 rounded-lg border border-glow-border bg-transparent px-2 py-1 text-xs text-glow-text"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="number"
                        step="0.01"
                        aria-label={`${product.name} selling price`}
                        value={product.price ?? ''}
                        onChange={(event) => updateProduct(product.id, 'price', event.target.value)}
                        className="w-24 rounded-lg border border-glow-border bg-transparent px-2 py-1 text-xs text-glow-text"
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium text-glow-text">
                      {row ? `${row.marginPct}%` : <span className="text-glow-text/30">N/A</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Product pricing assistant"
        description="What a cost increase would do to this product's margin."
        provenance="Calculated"
        note="These are options to consider. Nothing is applied automatically, and no supplier is contacted."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Product"
            value={selected?.id ?? ''}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {shop.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Input
            label="Unit cost increase (RM)"
            type="number"
            step="0.10"
            value={costIncrease}
            onChange={(event) => setCostIncrease(event.target.value)}
          />
        </div>

        {pressure?.ok ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs leading-relaxed text-glow-text/70">
              {selected.name}: if the unit cost rises from {money(pressure.oldCost)} to {money(pressure.newCost)} while
              the price stays at {money(pressure.price)}, the gross margin falls from{' '}
              <span className="font-semibold text-glow-text">{pressure.marginBeforePct}%</span> to{' '}
              <span className="font-semibold text-glow-text">{pressure.marginAfterPct}%</span>
              {pressure.priceToHoldMargin && (
                <>
                  . Holding the original margin would need a price of{' '}
                  <span className="font-semibold text-glow-text">{money(pressure.priceToHoldMargin)}</span>
                </>
              )}
              .
            </p>
            <ul className="space-y-1.5">
              {options?.options?.map((option) => (
                <li key={option.id} className="rounded-xl border border-glow-border p-2.5 text-[11px]">
                  <span className="font-medium text-glow-text/80">{option.label}</span>
                  <p className="mt-0.5 text-glow-text/50">{option.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-xs text-glow-text/50">{t('common.notEnough')}</p>
        )}
      </Section>
    </div>
  )
}
