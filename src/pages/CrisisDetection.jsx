import { useMemo, useState } from 'react'
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  SaveAll,
  ShieldAlert,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import ChartTooltip from '@/components/ui/ChartTooltip'
import ChartCard from '@/components/charts/ChartCard'
import RiskGauge from '@/components/charts/RiskGauge'
import SignalMatrix from '@/components/charts/SignalMatrix'
import SyncedStack from '@/components/charts/SyncedStack'
import CrisisReplay from '@/components/charts/CrisisReplay'
import FilterBar from '@/components/charts/FilterBar'
import Sparkline from '@/components/charts/Sparkline'
import { renderCrisisBands } from '@/components/charts/CrisisBands'
import {
  AXIS_LINE_DEFAULTS,
  AXIS_TICK_DEFAULTS,
  CHART_HEIGHTS,
  GRID_DEFAULTS,
} from '@/components/charts/chartDefaults'
import FilterProvider from '@/contexts/FilterProvider'
import { useFilters } from '@/hooks/useFilters'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { CRISIS_COLORS, FORECAST_COLORS, PLATFORM_COLORS } from '@/config/colorTokens'
import { RISK_LEVEL_THRESHOLDS } from '@/config/crisisThresholds'
import {
  buildCrisisDailySeries,
  getCrisisHistory,
  runCrisisDetection,
  saveCrisisEvent,
} from '@/services/crisisService'
import { fetchProcessedRows } from '@/services/socialDataService'
import { fetchRawSalesPayloads } from '@/services/salesService'
import { computeDailySalesSeries, normalizeSalesRows } from '@/utils/salesSeries'
import {
  buildEpisodeStages,
  computeCrisisHistory,
  computeRevenueLag,
  groupCrisisEpisodes,
  selectFocusEpisode,
} from '@/utils/crisisHistory'
import { buildRootCauseSankey, selectEvidencePosts } from '@/utils/crisisEvidence'
import { formatCurrencyMYR, formatPercent } from '@/utils/formatters'

const RISK_LEVELS = ['normal', 'warning', 'critical']

const LEVEL_META = {
  normal: { label: 'Normal', color: CRISIS_COLORS.normal, tone: 'neutral' },
  warning: { label: 'Warning', color: CRISIS_COLORS.warning, tone: 'warning' },
  critical: { label: 'Critical', color: CRISIS_COLORS.critical, tone: 'danger' },
}

/** Same radial-spotlight shape as designTokens.js's glowBackground(), but
 * tinted by the real current risk level instead of always emerald — "glow
 * colour by level" is explicit in the redesign brief for this page
 * specifically, so this stays local rather than changing the shared
 * (always-emerald) helper every other page's hero also uses. */
function levelGlowBackground(hexColor, opacity = 0.22) {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  return `radial-gradient(60% 50% at 50% -10%, rgba(${r}, ${g}, ${b}, ${opacity}) 0%, rgba(${r}, ${g}, ${b}, 0) 70%)`
}

const SIGNAL_IDS = [
  'negative_ratio_level',
  'negative_ratio_velocity',
  'mention_volume_level',
  'mention_volume_velocity',
  'rating_deterioration',
  'sentiment_anomaly',
  'review_volume_anomaly',
]

const SIGNAL_LABELS = {
  negative_ratio_level: 'Negative sentiment ratio',
  negative_ratio_velocity: 'Negative sentiment velocity',
  mention_volume_level: 'Mention volume',
  mention_volume_velocity: 'Mention volume velocity',
  rating_deterioration: 'Rating deterioration',
  sentiment_anomaly: 'Sentiment anomaly',
  review_volume_anomaly: 'Review volume anomaly',
}

/** Combines several useAsyncData() results into one ChartCard-compatible
 * {status, data, error} bundle — loading if any is loading, the first
 * error if any errored, otherwise success with `data` as the array of
 * each result's own data, in order. Lets one ChartCard (e.g. the
 * SyncedStack section, which needs both history AND sales data) honor the
 * same 5-state contract as every single-source chart. */
function combineAsync(...results) {
  if (results.some((r) => r.status === 'loading'))
    return { status: 'loading', data: null, error: null }
  const errored = results.find((r) => r.status === 'error')
  if (errored) return { status: 'error', data: null, error: errored.error }
  const unavailable = results.find((r) => r.status === 'unavailable')
  if (unavailable) return { status: 'unavailable', data: null, error: unavailable.error }
  return { status: 'success', data: results.map((r) => r.data), error: null }
}

async function loadHistory(resolvedRange, platforms) {
  const series = await buildCrisisDailySeries({
    from: resolvedRange.from,
    to: resolvedRange.to,
    platforms,
  })
  const history = computeCrisisHistory(series)
  const episodes = groupCrisisEpisodes(history)
  return { history, episodes }
}

async function loadDailySales(resolvedRange) {
  const payloads = await fetchRawSalesPayloads()
  const rows = normalizeSalesRows(payloads).filter((row) => {
    if (resolvedRange.from && row.date < resolvedRange.from) return false
    if (resolvedRange.to && row.date > resolvedRange.to) return false
    return true
  })
  return computeDailySalesSeries(rows)
}

async function loadEvidenceRows(resolvedRange, platforms) {
  const rows = await fetchProcessedRows({
    limit: 2000,
    from: resolvedRange.from,
    to: resolvedRange.to,
  })
  if (platforms.length === 0) return rows
  const platformSet = new Set(platforms)
  return rows.filter((row) => platformSet.has(row.platform))
}

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function SignalList({ signals, title, description }) {
  return (
    <GlowSection title={title} description={description}>
      {!signals || signals.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          message="No daily sentiment/mention data available yet — upload data via Dataset Management first."
        />
      ) : (
        <ul className="space-y-3">
          {signals.map((signal) => (
            <li
              key={signal.id}
              className="flex items-start gap-3 rounded-2xl border border-glow-border bg-white/[0.02] p-3"
            >
              {signal.level === 'insufficient_data' ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-glow-text/40" aria-hidden="true" />
              ) : signal.level === 'normal' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-glow-brand" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: LEVEL_META[signal.level]?.color }}
                  aria-hidden="true"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-glow-text">
                    {SIGNAL_LABELS[signal.id] ?? signal.id}
                  </p>
                  {signal.level !== 'insufficient_data' && signal.level !== 'normal' && (
                    <Badge tone={LEVEL_META[signal.level].tone}>
                      {LEVEL_META[signal.level].label}
                    </Badge>
                  )}
                  {signal.level === 'insufficient_data' && (
                    <Badge tone="neutral">Not enough data</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-glow-text/50">{signal.evidence}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlowSection>
  )
}

function CrisisDetectionContent() {
  const { modeConfig } = useMode()
  const { notify } = useNotifications()
  const { filters, resolvedRange } = useFilters()
  const [saving, setSaving] = useState(false)
  const [viewedDate, setViewedDate] = useState(null)

  const platformsKey = (filters.platforms ?? []).join(',')

  const currentAsync = useAsyncData(runCrisisDetection, [])
  const historyAsync = useAsyncData(
    () => loadHistory(resolvedRange, filters.platforms ?? []),
    [resolvedRange.from, resolvedRange.to, platformsKey]
  )
  const salesAsync = useAsyncData(
    () => loadDailySales(resolvedRange),
    [resolvedRange.from, resolvedRange.to]
  )
  const evidenceRowsAsync = useAsyncData(
    () => loadEvidenceRows(resolvedRange, filters.platforms ?? []),
    [resolvedRange.from, resolvedRange.to, platformsKey]
  )
  const logAsync = useAsyncData(getCrisisHistory, [])

  const history = useMemo(() => historyAsync.data?.history ?? [], [historyAsync.data])
  const episodes = historyAsync.data?.episodes ?? []
  const dailySalesSeries = useMemo(() => salesAsync.data ?? [], [salesAsync.data])
  const availablePlatforms = useMemo(
    () =>
      [
        ...new Set((evidenceRowsAsync.data ?? []).map((row) => row.platform).filter(Boolean)),
      ].sort(),
    [evidenceRowsAsync.data]
  )

  const focusEpisode = selectFocusEpisode(episodes, viewedDate)
  const lag = focusEpisode ? computeRevenueLag(focusEpisode, dailySalesSeries) : null
  const stages = buildEpisodeStages(focusEpisode, history)

  // The hero shows either the LIVE result (today, unfiltered by date range
  // — always the real current state) or, once a day is clicked/replayed,
  // that historical day's point from `history` instead ("time travel" —
  // spec 4.1(b)). Both shapes are normalized to the same {riskScore,
  // riskLevel, allSignals, asOfDate, isLive} so SignalList/RiskGauge never
  // need to know which source they're looking at.
  const displayed = viewedDate
    ? (() => {
        const point = history.find((p) => p.date === viewedDate)
        return point
          ? {
              riskScore: point.riskScore,
              riskLevel: point.riskLevel,
              dataSufficient: point.dataSufficient,
              allSignals: point.signals,
              asOfDate: point.date,
              isLive: false,
            }
          : null
      })()
    : currentAsync.data
      ? { ...currentAsync.data, asOfDate: 'Today', isLive: true }
      : null

  const levelMeta = displayed ? LEVEL_META[displayed.riskLevel] : LEVEL_META.normal
  const levelIndex = displayed ? RISK_LEVELS.indexOf(displayed.riskLevel) : 0

  const handleLog = async () => {
    if (!currentAsync.data) return
    setSaving(true)
    try {
      await saveCrisisEvent(currentAsync.data)
      notify('Detection logged to history.')
      logAsync.reload()
    } catch (error) {
      notify(`Could not log this detection: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Replay steps through the focus episode plus 2 days of context on each
  // side, clipped to whatever's actually in the loaded history.
  const replayDates = useMemo(() => {
    if (!focusEpisode || history.length === 0) return []
    const allDates = history.map((point) => point.date)
    const startIndex = Math.max(0, allDates.indexOf(focusEpisode.start) - 2)
    const endIndex = Math.min(allDates.length - 1, allDates.indexOf(focusEpisode.end) + 2)
    return allDates.slice(startIndex, endIndex + 1)
  }, [focusEpisode, history])

  const stackData = combineAsync(historyAsync, salesAsync)
  const salesByDate = useMemo(
    () => new Map(dailySalesSeries.map((d) => [d.date, d.revenue])),
    [dailySalesSeries]
  )
  const mergedStackRows = useMemo(
    () =>
      history.map((point) => ({
        date: point.date,
        mentionVolume: point.mentionVolume,
        negativeRatioPercent:
          point.negativeRatio != null ? Math.round(point.negativeRatio * 1000) / 10 : null,
        avgRating: point.avgRating,
        commentVolume: point.commentVolume,
        revenue: salesByDate.get(point.date) ?? null,
      })),
    [history, salesByDate]
  )

  const sankeyRows = evidenceRowsAsync.data ?? []
  const evidencePosts = selectEvidencePosts(sankeyRows, focusEpisode, 6)

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={modeConfig.label}
        title="Early-Warning Crisis Detection"
        highlight="Crisis"
        description="A live risk score computed from this business's own recent history — never a fixed threshold that would be unfair to a small business versus a large one."
        actions={
          <>
            {viewedDate && (
              <Button icon={RotateCcw} variant="glowSecondary" onClick={() => setViewedDate(null)}>
                Back to Live
              </Button>
            )}
            <Button
              icon={RefreshCw}
              variant="glowSecondary"
              loading={currentAsync.status === 'loading'}
              onClick={currentAsync.reload}
            >
              Refresh
            </Button>
            <Button
              icon={SaveAll}
              variant="glowBrand"
              loading={saving}
              disabled={!currentAsync.data || Boolean(viewedDate)}
              onClick={handleLog}
            >
              Log to history
            </Button>
          </>
        }
      />

      {/* The hero gauge, per the brief: "make the risk level a big hero
          gauge/meter... with glow colour by level" — the whole card's own
          background glow shifts with the real risk level, not just the
          gauge ring itself. */}
      <div
        className="relative overflow-hidden rounded-3xl border border-glow-border bg-glow-surface-elevated p-6 sm:p-8"
        style={{ backgroundImage: levelGlowBackground(levelMeta.color) }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <RiskGauge
              riskScore={displayed?.riskScore ?? 0}
              riskLevel={displayed?.riskLevel ?? 'normal'}
              asOfDate={displayed?.asOfDate}
              size={160}
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-glow-text/50">
                {displayed?.isLive === false ? 'Viewing a past day' : 'Current Crisis Level'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-3xl font-semibold" style={{ color: levelMeta.color }}>
                  {levelMeta.label}
                </p>
                <Badge tone={levelMeta.tone}>Risk score {displayed?.riskScore ?? 0} / 100</Badge>
                {displayed && !displayed.dataSufficient && (
                  <Badge tone="neutral">Limited data</Badge>
                )}
              </div>
              <div className="mt-4 flex overflow-hidden rounded-full">
                {RISK_LEVELS.map((level, index) => (
                  <span
                    key={level}
                    className="h-2 w-16 border-r-2 border-glow-surface-elevated last:border-r-0"
                    style={{
                      backgroundColor:
                        index <= levelIndex ? LEVEL_META[level].color : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterBar availablePlatforms={availablePlatforms} />

      <SignalList
        signals={displayed?.allSignals}
        title="Detected Signals"
        description={
          displayed?.isLive === false
            ? `Explaining ${displayed.asOfDate} — every signal that day could compute, with measurable evidence.`
            : 'Every signal this run could compute, with measurable evidence — never an unexplained AI-generated label.'
        }
      />

      <ChartCard
        surface="glow"
        title="Risk Timeline"
        subtitle="Click any day to see what the system knew at that point — shaded bands are detected episodes"
        method="real"
        methodNote="Risk score re-run per historical day from the same rule engine as the live detector (src/utils/crisisDetection.js), never a separate model."
        readingGuide="Each point is one day's risk score, 0-100. The shaded bands mark periods the system flagged as a real episode. Click any point to see exactly which signals fired that day."
        height="hero"
        ariaLabel={`Risk score over ${history.length} days, peaking at ${Math.max(0, ...history.map((p) => p.riskScore))} out of 100`}
        status={historyAsync.status}
        data={historyAsync.data}
        error={historyAsync.error}
        reload={historyAsync.reload}
        emptyWhen={(data) => !data?.history?.length}
        csvRows={(data) =>
          data?.history?.map((p) => ({
            date: p.date,
            riskScore: p.riskScore,
            riskLevel: p.riskLevel,
          }))
        }
        csvFilename="crisis-risk-timeline.csv"
      >
        {() => (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.hero}>
            <LineChart
              data={history}
              margin={{ left: -20, top: 8, right: 8, bottom: 0 }}
              onClick={(event) => event?.activeLabel && setViewedDate(event.activeLabel)}
            >
              <CartesianGrid {...GRID_DEFAULTS} />
              <XAxis dataKey="date" tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} />
              <YAxis
                domain={[0, 100]}
                tick={AXIS_TICK_DEFAULTS}
                {...AXIS_LINE_DEFAULTS}
                width={32}
              />
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}/100`} />} />
              {renderCrisisBands(episodes)}
              <ReferenceLine
                y={RISK_LEVEL_THRESHOLDS.warning}
                stroke={CRISIS_COLORS.warning}
                strokeDasharray="4 2"
                label={{
                  value: 'Warning',
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: CRISIS_COLORS.warning,
                }}
              />
              <ReferenceLine
                y={RISK_LEVEL_THRESHOLDS.critical}
                stroke={CRISIS_COLORS.critical}
                strokeDasharray="4 2"
                label={{
                  value: 'Critical',
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: CRISIS_COLORS.critical,
                }}
              />
              {viewedDate && <ReferenceLine x={viewedDate} stroke={FORECAST_COLORS.forecast} strokeWidth={2} />}
              <Line
                type="monotone"
                dataKey="riskScore"
                name="Risk score"
                stroke={FORECAST_COLORS.forecast}
                strokeWidth={2}
                dot={(props) =>
                  episodes.some(
                    (episode) =>
                      props.payload.date >= episode.start && props.payload.date <= episode.end
                  ) ? (
                    <circle
                      key={props.payload.date}
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={CRISIS_COLORS.critical}
                    />
                  ) : (
                    <circle key={props.payload.date} r={0} />
                  )
                }
                isAnimationActive={false}
              />
              <Brush dataKey="date" height={24} travellerWidth={8} stroke={FORECAST_COLORS.forecast} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        surface="glow"
        title="Signal Matrix"
        subtitle="7 signals x every day in range — color intensity = severity, click a cell to time-travel to that day"
        method="real"
        methodNote="Each cell re-runs the same real rule evaluation as the Risk Timeline, one signal at a time."
        readingGuide="Each row is one of the 7 signals this system checks; each column is a day. A darker cell means that signal was more severe that day. Click a cell to jump to that day on every other chart."
        height={160 + SIGNAL_IDS.length * 20}
        ariaLabel="Heatmap of 7 crisis signals across the selected date range"
        status={historyAsync.status}
        data={historyAsync.data}
        error={historyAsync.error}
        reload={historyAsync.reload}
        emptyWhen={(data) => !data?.history?.length}
      >
        {() => (
          <SignalMatrix
            history={history}
            signalIds={SIGNAL_IDS}
            signalLabels={SIGNAL_LABELS}
            selectedDate={viewedDate}
            onSelectDate={setViewedDate}
            focusEpisode={focusEpisode}
          />
        )}
      </ChartCard>

      <ChartCard
        surface="glow"
        title="Multi-Signal View"
        subtitle="Mention volume, negative sentiment, average rating, comment volume, and daily revenue — one crosshair"
        method="real"
        methodNote="Revenue comes from your own uploaded sales data (src/utils/salesSeries.js); everything else from daily_aggregates/processed_data — the same real tables the rest of this page reads."
        readingGuide="Five real numbers on the same timeline, stacked so you can compare them. Hover anywhere to see all five values for that exact day at once — useful for spotting which one moved first."
        height={5 * 120 + 40}
        ariaLabel="Five synced daily metrics: mentions, negative ratio, average rating, comment volume, and revenue"
        status={stackData.status}
        data={stackData.data}
        error={stackData.error}
        emptyWhen={() => mergedStackRows.length === 0}
      >
        {() => (
          <div>
            <SyncedStack
              panels={[
                { key: 'mentionVolume', label: 'Mention volume', color: PLATFORM_COLORS.tiktok },
                {
                  key: 'negativeRatioPercent',
                  label: 'Negative sentiment %',
                  color: CRISIS_COLORS.critical,
                  format: (v) => formatPercent(v / 100),
                },
                { key: 'avgRating', label: 'Average rating', color: FORECAST_COLORS.baseline },
                { key: 'commentVolume', label: 'Comment volume', color: PLATFORM_COLORS.x },
                {
                  key: 'revenue',
                  label: 'Daily revenue',
                  color: FORECAST_COLORS.actual,
                  format: (v) => formatCurrencyMYR(v),
                },
              ]}
              data={mergedStackRows}
              highlightDate={viewedDate}
            />
            {focusEpisode && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {lag
                  ? `Revenue visibly dropped ${lag.lagDays} day(s) after the first signal fired — from a ${formatCurrencyMYR(lag.baselineRevenue)}/day baseline down to ${formatCurrencyMYR(lag.dropRevenue)} on ${lag.dropDate}.`
                  : 'Not enough sales history around this episode to compute a real signal-to-revenue lag.'}
              </p>
            )}
          </div>
        )}
      </ChartCard>

      {focusEpisode ? (
        <p className="text-sm text-glow-text/60">
          Drilling into the episode{' '}
          <span className="font-medium text-glow-text">
            {focusEpisode.start} — {focusEpisode.end}
          </span>{' '}
          ({LEVEL_META[focusEpisode.riskLevel].label} peak).
        </p>
      ) : (
        <GlowSection>
          <p className="text-sm italic text-glow-text/60">
            No crisis episode detected in the selected range — the Sankey, evidence wall, episode
            timeline, and replay below have nothing to show.
          </p>
        </GlowSection>
      )}

      <ChartCard
        surface="glow"
        title="Root-Cause Breakdown"
        subtitle="Platform -> aspect -> product, for negative posts inside the focused episode"
        method="heuristic"
        methodNote="Aspects come from a transparent multilingual keyword lexicon (src/utils/aspects.js), not a trained classifier — see 'Keyword lexicon (heuristic)'. Product is only shown where a review actually captured one."
        readingGuide="Read left to right: which platform the complaint came from, what it was actually about, and — where known — which product. A thicker band means more posts took that path."
        height="lg"
        ariaLabel="Sankey diagram from platform through complaint aspect to product for the focused crisis episode"
        status={evidenceRowsAsync.status}
        data={sankeyRows}
        error={evidenceRowsAsync.error}
        reload={evidenceRowsAsync.reload}
        emptyWhen={(rows) => !focusEpisode || !buildRootCauseSankey(rows, focusEpisode)}
        emptyMessage="No negative posts in this episode's window — nothing to trace a root cause from."
      >
        {(rows) => {
          const sankeyData = buildRootCauseSankey(rows, focusEpisode)
          if (!sankeyData) return null
          return (
            <>
              <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
                <Sankey
                  data={sankeyData}
                  nodePadding={16}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  link={{ stroke: '#94a3b8', strokeOpacity: 0.35 }}
                  node={({ x, y, width, height, index }) => {
                    const node = sankeyData.nodes[index]
                    const fill =
                      node.category === 'platform'
                        ? (PLATFORM_COLORS[node.name] ?? CRISIS_COLORS.normal)
                        : node.category === 'aspect'
                          ? CRISIS_COLORS.warning
                          : FORECAST_COLORS.scenario
                    return (
                      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9}>
                        <title>{node.name}</title>
                      </rect>
                    )
                  }}
                >
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(value, name) => `${value} post(s) — ${name}`} />
                    }
                  />
                </Sankey>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-glow-text/40">
                {sankeyData.productAttributedCount} of {sankeyData.totalNegativePosts} negative
                posts had a product captured (review-template rows only) — the rest flow straight
                from platform to aspect.
              </p>
            </>
          )
        }}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlowSection
          className="lg:col-span-2"
          title="Evidence Wall"
          description="Representative negative posts from the focused episode, in their original language"
        >
          {evidencePosts.length === 0 ? (
            <EmptyState message="No negative posts to show for this episode/range." />
          ) : (
            <ul className="space-y-3">
              {evidencePosts.map((post) => (
                <li key={post.id} className="rounded-2xl border border-glow-border bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{post.platform ?? 'unknown'}</Badge>
                    <Badge tone="neutral">{post.language ?? 'unknown'}</Badge>
                    <span className="text-xs text-glow-text/40">{post.date}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-glow-text/80">{post.text}</p>
                  {post.aspects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.aspects.map((aspect) => (
                        <Badge key={aspect} tone="warning">
                          {aspect}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlowSection>

        <GlowSection
          title="Episode Timeline"
          description="How this episode actually unfolded, in real computed day-offsets"
        >
          {stages.length === 0 ? (
            <EmptyState message="No focused episode to show a timeline for." />
          ) : (
            <ol className="space-y-4">
              {stages.map((stage) => (
                <li key={stage.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-glow-brand/15 text-xs font-semibold text-glow-brand">
                    +{stage.daysSinceStart ?? '?'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-glow-text">{stage.label}</p>
                    <p className="text-xs text-glow-text/50">
                      {stage.date ?? 'not reached in the loaded range'}
                      {stage.signalId && ` — ${SIGNAL_LABELS[stage.signalId] ?? stage.signalId}`}
                      {stage.riskScore != null && ` — risk score ${stage.riskScore}/100`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs italic text-glow-text/40">
            No precision/recall is shown — this project has no ground-truth crisis label to score
            against, so accuracy can't honestly be measured, only the detection itself demonstrated.
          </p>
        </GlowSection>
      </div>

      <GlowSection
        title="Crisis Replay"
        description="Step day-by-day through the focused episode — every section above follows along"
      >
        {replayDates.length === 0 ? (
          <EmptyState message="No focused episode to replay." />
        ) : (
          <CrisisReplay
            dates={replayDates}
            value={viewedDate ?? replayDates[0]}
            onChange={setViewedDate}
          />
        )}
      </GlowSection>

      <GlowSection title="Detection History" description="Past logged detections for this business">
        {logAsync.status === 'loading' ? (
          <p className="text-sm text-glow-text/60">Loading…</p>
        ) : (logAsync.data ?? []).length === 0 ? (
          <EmptyState message='No detections logged yet — click "Log to history" above to record the current result.' />
        ) : (
          <Table
            columns={[
              {
                key: 'detected_at',
                label: 'Detected',
                render: (row) => new Date(row.detected_at).toLocaleString(),
              },
              {
                key: 'risk_level',
                label: 'Level',
                render: (row) => (
                  <Badge tone={LEVEL_META[row.risk_level]?.tone ?? 'neutral'}>
                    {LEVEL_META[row.risk_level]?.label ?? row.risk_level}
                  </Badge>
                ),
              },
              { key: 'risk_score', label: 'Score' },
              {
                key: 'triggered_signals',
                label: 'Triggered',
                render: (row) => row.triggered_signals?.length ?? 0,
              },
              {
                key: 'data_sufficient',
                label: 'Data',
                render: (row) => (row.data_sufficient ? 'Sufficient' : 'Limited'),
              },
              {
                key: 'trend',
                label: 'Trend',
                render: (row) => {
                  const cutoff = new Date(row.detected_at).toISOString().slice(0, 10)
                  const points = history
                    .filter((point) => point.date <= cutoff)
                    .slice(-14)
                    .map((point) => point.riskScore)
                  return (
                    <Sparkline
                      points={points}
                      color={LEVEL_META[row.risk_level]?.color ?? '#64748b'}
                    />
                  )
                },
              },
            ]}
            data={logAsync.data}
            getRowKey={(row) => row.id}
          />
        )}
      </GlowSection>
    </div>
  )
}

export default function CrisisDetection() {
  return (
    <FilterProvider>
      <CrisisDetectionContent />
    </FilterProvider>
  )
}
