import { useEffect, useId, useMemo, useState } from 'react'
import { AlertTriangle, ChefHat } from 'lucide-react'
import PageHero from '@/components/ui/PageHero'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import StatTile from '@/components/ui/StatTile'
import EmptyState from '@/components/ui/EmptyState'
import PageLoader from '@/components/common/PageLoader'
import { useMode } from '@/hooks/useMode'
import { fetchPrepPlannerData } from '@/services/prepPlannerService'
import koperasiBundle from '@/data/koperasiSiswaMaju.json'
import {
  PLANNER_DEFAULTS,
  buildItemSeries,
  buildPrepPlan,
  fromKoperasiBundle,
  simulateWaste,
  wasteSaving,
} from '@/utils/prepPlanner'

const SAMPLE = fromKoperasiBundle(koperasiBundle)

function Slider({ label, value, onChange, max = 50, step = 5 }) {
  const id = useId()
  return (
    <div className="min-w-[220px] flex-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-glow-brand"
      />
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return 'N/A'
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

const rm = (v) => `RM ${v.toFixed(2)}`

export default function PrepPlanner() {
  const { modeConfig } = useMode()
  const [own, setOwn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [source, setSource] = useState(null) // 'own' | 'sample'
  const [bufferPct, setBufferPct] = useState(PLANNER_DEFAULTS.bufferPct)
  const [flagReductionPct, setFlagReductionPct] = useState(PLANNER_DEFAULTS.flagReductionPct)

  useEffect(() => {
    let cancelled = false
    fetchPrepPlannerData()
      .then((data) => {
        if (cancelled) return
        setOwn(data)
        setSource(data.salesRows.length > 0 ? 'own' : 'sample')
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(error)
        setSource('sample')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasOwn = (own?.salesRows.length ?? 0) > 0
  const data = source === 'own' && hasOwn ? own : SAMPLE
  const isSample = data === SAMPLE

  const series = useMemo(() => buildItemSeries(data.salesRows), [data])
  const plan = useMemo(
    () => buildPrepPlan({ series, items: data.items, reviews: data.reviews, bufferPct, flagReductionPct }),
    [series, data, bufferPct, flagReductionPct],
  )
  const replay = useMemo(
    () => simulateWaste({ series, items: data.items, reviews: data.reviews, bufferPct, flagReductionPct }),
    [series, data, bufferPct, flagReductionPct],
  )
  const saving = wasteSaving(replay.totals)
  const flaggedCount = plan.rows.filter((r) => r.flag).length

  if (loading) return <PageLoader />

  const planColumns = [
    { key: 'item', label: 'Item' },
    {
      key: 'forecast', label: 'Expected sales', align: 'right',
      render: (r) => (r.forecast == null ? 'N/A' : r.forecast.toFixed(1)),
    },
    {
      key: 'quantity', label: 'Prepare / order', align: 'right',
      render: (r) => <span className="font-semibold tabular-nums">{r.quantity ?? 'N/A'}</span>,
    },
    {
      key: 'flag', label: 'Reviews',
      render: (r) =>
        r.flag ? (
          <Badge tone={r.flag.freshness ? 'danger' : 'warning'} icon={AlertTriangle}>
            {r.flag.freshness ? 'Freshness complaint' : 'Negative review'} ({r.flag.count})
          </Badge>
        ) : (
          <Badge tone="neutral">No complaints</Badge>
        ),
    },
    { key: 'rule', label: 'Why', render: (r) => <span className="text-xs text-slate-500 dark:text-slate-400">{r.rule}</span> },
  ]

  const replayColumns = [
    { key: 'item', label: 'Item' },
    { key: 'days', label: 'Days', align: 'right' },
    { key: 'lw', label: 'Wasted, last week habit', align: 'right', render: (r) => r.lastWeek.wasteUnits },
    { key: 'fc', label: 'Wasted, forecast', align: 'right', render: (r) => r.forecast.wasteUnits },
    { key: 'lws', label: 'Short, last week habit', align: 'right', render: (r) => r.lastWeek.stockoutUnits },
    { key: 'fcs', label: 'Short, forecast', align: 'right', render: (r) => r.forecast.stockoutUnits },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={modeConfig?.label}
        title="Prep & Stock Planner"
        highlight="Stock Planner"
        description="How much to prepare or order for the next opening day, with the reason for every number."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!isSample ? 'primary' : 'secondary'}
              disabled={!hasOwn}
              onClick={() => setSource('own')}
              title={hasOwn ? undefined : 'Your uploaded sales have no per item quantities yet'}
            >
              Your data
            </Button>
            <Button size="sm" variant={isSample ? 'primary' : 'secondary'} onClick={() => setSource('sample')}>
              Sample: Koperasi Siswa Maju
            </Button>
          </div>
        }
      />

      {isSample && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Badge tone="warning">Synthetic sample data</Badge>
          <span>
            A fictional campus cooperative generated for this demo. No real shop or customer is shown.
            {!hasOwn && ' Upload sales with product and quantity columns to plan with your own data.'}
            {loadError && ' Your data could not be loaded, so the sample is shown.'}
          </span>
        </div>
      )}

      <Card title="Settings" description="Both habits in the replay below use the same safety buffer.">
        <div className="flex flex-wrap gap-6">
          <Slider label="Safety buffer" value={bufferPct} onChange={setBufferPct} />
          <Slider label="Cut for items named in negative reviews" value={flagReductionPct} onChange={setFlagReductionPct} />
        </div>
      </Card>

      {plan.rows.length === 0 ? (
        <EmptyState icon={ChefHat} message="No per item sales to plan from yet." />
      ) : (
        <Card
          title={`Plan for ${formatDate(plan.planDate)}`}
          description={`${plan.rows.length} items. ${flaggedCount} named in negative reviews in the last ${PLANNER_DEFAULTS.lookbackDays} days.`}
        >
          <Table columns={planColumns} data={plan.rows} getRowKey={(r) => r.item} />
        </Card>
      )}

      <Card
        title="Waste replay (simulation)"
        description={
          replay.from
            ? `Replays ${formatDate(replay.from)} to ${formatDate(replay.to)}: ordering what sold the same day last week, against ordering by the planner's forecast.${isSample ? ' Simulated on synthetic data.' : ''}`
            : 'Not enough history to replay.'
        }
      >
        {replay.items.length > 0 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Waste, last week habit" value={replay.totals.lastWeek.wasteRM} prefix="RM " decimals={2} />
              <StatTile label="Waste, forecast" value={replay.totals.forecast.wasteRM} prefix="RM " decimals={2} />
              <StatTile label="Simulated saving" value={saving.rm} prefix="RM " decimals={2} />
              <StatTile label="Saving" value={saving.pct} unit="%" decimals={1} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Units short (customers who could not buy): last week habit{' '}
              <strong>{replay.totals.lastWeek.stockoutUnits}</strong>, forecast{' '}
              <strong>{replay.totals.forecast.stockoutUnits}</strong>.{' '}
              {replay.totals.forecast.stockoutUnits > replay.totals.lastWeek.stockoutUnits
                ? 'The forecast runs out more often, so less waste comes partly from preparing less. Raise the buffer to trade waste for fewer sold out items.'
                : 'The forecast does not run out more often than the last week habit.'}
            </p>
            <Table columns={replayColumns} data={replay.items} getRowKey={(r) => r.item} />
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
              <li>Units sold are treated as demand. On sold out days real demand was higher, for both habits.</li>
              <li>Stock is used oldest first and thrown away when it reaches its shelf life. Waste is valued at unit cost ({rm(replay.totals.forecast.wasteRM)} is cost, not lost sales).</li>
              <li>Each day&apos;s order uses only sales and reviews from before that day. Both habits start with no stock.</li>
              {replay.excluded.length > 0 && (
                <li>Left out (no shelf life or cost known, or too little history): {replay.excluded.join(', ')}.</li>
              )}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={ChefHat}
            message="The replay needs at least five weeks of per item sales with a shelf life and a cost for each item."
          />
        )}
      </Card>
    </div>
  )
}
