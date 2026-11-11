import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Save, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useNotifications } from '@/hooks/useNotifications'
import { getStartupCapital, saveStartupCapital } from '@/services/startupCapitalService'
import { ILLUSTRATIVE_STARTUP_CAPITAL } from '@/utils/illustrativeExample'
import { formatCurrencyMYR } from '@/utils/formatters'
import { CHART_COLORS } from '@/theme/chartTheme'

/**
 * Startup Capital Planner (knowledge_updated_nov2026.md item 3). One-off
 * setup costs vs. the owner's available capital — a straightforward sum
 * and a difference, not a prediction. "Sufficient" is never claimed; only
 * the real gap (or surplus) number is shown.
 */

const ITEMS = [
  { id: 'rental_deposit', label: 'Rental Deposit' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'initial_stock', label: 'Initial Stock' },
  { id: 'licences', label: 'Licences & Registration' },
  { id: 'utilities_deposit', label: 'Utilities Deposits' },
  { id: 'marketing_setup', label: 'Marketing' },
  { id: 'emergency_reserve', label: 'Emergency Reserve' },
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

export default function StartupCapitalPlanner() {
  const { notify } = useNotifications()
  const [items, setItems] = useState({})
  const [availableCapital, setAvailableCapital] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getStartupCapital()
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setAvailableCapital(result.availableCapital ?? '')
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  const updateItem = (id, raw) => {
    const numeric = Number.parseFloat(raw)
    setItems((current) => ({ ...current, [id]: Number.isFinite(numeric) ? numeric : undefined }))
  }

  const enteredRows = ITEMS.map((item) => ({ label: item.label, amount: items[item.id] }))
    .filter((row) => typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const availableNumeric = availableCapital === '' ? null : Number.parseFloat(availableCapital)

  // Preview-only fallback: with nothing entered yet, the allocation chart
  // and totals show the illustrative example rather than rendering empty.
  // `items`/`availableCapital` (what Save persists) are never touched by it.
  const isIllustrative = enteredRows.length === 0
  const rows = isIllustrative
    ? ITEMS.map((item) => ({ label: item.label, amount: ILLUSTRATIVE_STARTUP_CAPITAL.items[item.id] }))
        .filter((row) => typeof row.amount === 'number' && row.amount > 0)
        .sort((a, b) => b.amount - a.amount)
    : enteredRows
  const totalCapital = rows.reduce((sum, row) => sum + row.amount, 0)

  const effectiveAvailable =
    isIllustrative && (availableNumeric === null || !Number.isFinite(availableNumeric))
      ? ILLUSTRATIVE_STARTUP_CAPITAL.availableCapital
      : availableNumeric
  const fundingGap =
    typeof effectiveAvailable === 'number' && Number.isFinite(effectiveAvailable)
      ? Math.round((effectiveAvailable - totalCapital) * 100) / 100
      : null

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveStartupCapital({ items, availableCapital: availableNumeric })
      notify('Startup capital plan saved.')
    } catch {
      notify('Could not save your startup capital plan — please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <GlowSection
      title="Startup Capital Planner"
      description="How much money you need before opening or expanding — a sum of your own entered figures, nothing guessed."
    >
      {isIllustrative && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-glow-text/70">
            <span className="font-semibold text-amber-400">Illustrative example</span> — the totals and chart below
            show a sample setup budget. Type your own figures into the fields and they replace it immediately;
            only what you type is ever saved.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <Input
            key={item.id}
            label={item.label}
            type="number"
            value={items[item.id] ?? ''}
            onChange={(e) => updateItem(item.id, e.target.value)}
          />
        ))}
      </div>

      <div className="mt-4 max-w-xs">
        <Input
          label="Available Capital (optional)"
          type="number"
          value={availableCapital}
          onChange={(e) => setAvailableCapital(e.target.value)}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-glow-border p-3">
          <p className="text-[11px] text-glow-text/50">Estimated startup capital</p>
          <p className="mt-1 text-lg font-semibold text-glow-text">{formatCurrencyMYR(totalCapital)}</p>
        </div>
        {fundingGap !== null && (
          <div className="rounded-2xl border border-glow-border p-3">
            <p className="text-[11px] text-glow-text/50">{fundingGap >= 0 ? 'Capital surplus' : 'Funding gap'}</p>
            <p className={`mt-1 text-lg font-semibold ${fundingGap < 0 ? 'text-rose-400' : 'text-glow-text'}`}>
              {formatCurrencyMYR(Math.abs(fundingGap))}
            </p>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-glow-text/70">
            Startup capital allocation{isIllustrative ? ' (illustrative example)' : ''}
          </p>
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.sm}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" RM" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<ChartTooltip formatter={(value) => formatCurrencyMYR(value)} />} />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} fill={CHART_COLORS.neutral} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <Button variant="glowBrand" size="sm" icon={Save} loading={saving} className="mt-5" onClick={handleSave}>
        Save plan
      </Button>
    </GlowSection>
  )
}
