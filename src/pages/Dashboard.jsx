import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import AsyncSection from '@/components/common/AsyncSection'
import Skeleton from '@/components/ui/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMode } from '@/hooks/useMode'
import { useUIMode } from '@/hooks/useUIMode'
import SeniorModePanel from '@/components/common/SeniorModePanel'
import { PATHS } from '@/routes/paths'
import { CHART_COLORS } from '@/theme/chartTheme'
import { PLATFORM_COLORS as PLATFORM_COLOR_MAP } from '@/config/colorTokens'
import { capitalize, formatCurrencyMYR, formatDelta } from '@/utils/formatters'
import { getProfile } from '@/services/businessProfileService'
import { getDashboardData } from '@/services/dashboardService'
import BusinessPlanningPanel from '@/components/common/BusinessPlanningPanel'
import PageHero from '@/components/ui/PageHero'

const ALERT_TONES = { warning: 'warning', critical: 'danger' }
// Phase 6 chart audit: this used to be a positional array (color depended on
// render order, not platform identity — could flip between renders, and
// reused sentiment colors CHART_COLORS.positive/.neutral for an unrelated
// category). Now a stable per-platform lookup from the one real source of
// truth (src/config/colorTokens.js), same as Crisis Detection/Social
// Intelligence already do.
const platformColor = (platform) => PLATFORM_COLOR_MAP[platform] ?? CHART_COLORS.neutral

function humanizeSignalId(id) {
  return capitalize(id.replace(/_/g, ' '))
}

function EmptyNote({ children }) {
  return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
}

function KpiCard({ label, display, delta, footer }) {
  const DeltaIcon = delta >= 0 ? ArrowUp : ArrowDown
  return (
    <Card bodyClassName="p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{display}</p>
        {delta != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              delta >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
            }`}
          >
            <DeltaIcon className="size-3" aria-hidden="true" />
            {formatDelta(delta)}
          </span>
        )}
      </div>
      {footer && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-slate-500 dark:border-line-dark dark:text-slate-400">
          {footer}
        </p>
      )}
    </Card>
  )
}

function buildKpis(data) {
  const kpis = []

  const positive = data.sentimentScores?.find((score) => score.id === 'positive')
  if (positive?.value != null) {
    kpis.push({
      id: 'sentiment',
      label: 'Overall Sentiment (Positive)',
      display: `${positive.value}%`,
      delta: positive.delta,
    })
  }

  if (data.crisis) {
    kpis.push({
      id: 'crisis',
      label: 'Crisis Risk',
      display: capitalize(data.crisis.riskLevel),
      footer: `Risk score ${data.crisis.riskScore}/100${data.crisis.dataSufficient ? '' : ' · limited data'}`,
    })
  }

  const lastForecastPoint =
    data.bestForecastRow?.forecast_points?.[data.bestForecastRow.forecast_points.length - 1]
  if (lastForecastPoint?.predicted != null) {
    kpis.push({
      id: 'forecast',
      label: 'Revenue Forecast',
      display: formatCurrencyMYR(lastForecastPoint.predicted),
      footer:
        data.bestForecastRow.mape != null ? `Model MAPE: ${data.bestForecastRow.mape}%` : null,
    })
  }

  return kpis
}

/** Real skeleton for the dashboard body's loading state — shaped like the
 * actual layout (KPI row + 3 chart cards) instead of a bare "Loading…"
 * line, so the page doesn't read as stuck during its several real,
 * parallel Supabase round-trips (see dashboardService.getDashboardData). */
function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} bodyClassName="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" bodyClassName="p-5">
          <Skeleton className="h-full min-h-[220px] w-full" />
        </Card>
        <Card bodyClassName="p-5">
          <Skeleton className="h-full min-h-[220px] w-full" />
        </Card>
      </div>
    </>
  )
}

function DashboardBody({ data }) {
  const kpis = buildKpis(data)
  const platforms = data.platformComparison.map((p) => p.platform)
  const { uiMode } = useUIMode()
  const positiveScore = data.sentimentScores?.find((score) => score.id === 'positive') ?? null
  const gradientId = useId()

  return (
    <>
      {uiMode === 'senior' && (
        <SeniorModePanel recommendations={data.recommendations} sentimentScore={positiveScore} />
      )}

      {kpis.length === 0 ? (
        <Card>
          <EmptyNote>
            No KPIs computable yet — upload sales, review, or social data via Dataset Management.
          </EmptyNote>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Sentiment Trend"
          description="Last 14 days, by sentiment label — shows whether customer sentiment is improving or worsening over time; each day's three bands always add up to 100%."
          className="lg:col-span-2"
        >
          {data.sentimentTrend.length === 0 ? (
            <EmptyNote>No sentiment history yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.sentimentTrend} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id={`${gradientId}-positive`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.positive} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CHART_COLORS.positive} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-neutral`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.neutral} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.neutral} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-negative`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.negative} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.negative} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  content={
                    <ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />
                  }
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="positive"
                  name="Positive"
                  stackId="sentiment"
                  stroke={CHART_COLORS.positive}
                  fill={`url(#${gradientId}-positive)`}
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  name="Neutral"
                  stackId="sentiment"
                  stroke={CHART_COLORS.neutral}
                  fill={`url(#${gradientId}-neutral)`}
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  name="Negative"
                  stackId="sentiment"
                  stroke={CHART_COLORS.negative}
                  fill={`url(#${gradientId}-negative)`}
                  strokeWidth={2}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title="Platform Distribution"
          description="Mentions by platform, ranked highest to lowest — shows which channel generates the most conversation right now, so attention or budget can follow it."
        >
          {data.platformComparison.length === 0 ? (
            <EmptyNote>No platform data yet.</EmptyNote>
          ) : (
            // Phase 6 chart audit: this was a 4-slice donut. Cleveland &
            // McGill (1984) rank angle/area judgment below position/length —
            // and the master prompt explicitly bars any pie/donut past 3
            // slices. A ranked horizontal bar makes "which platform leads"
            // readable at a glance instead of requiring angle comparison.
            // Recharts matches <Cell> children to data points by INDEX, so
            // the Cell list must iterate the SAME sorted array as `data`.
            (() => {
              const ranked = [...data.platformComparison].sort((a, b) => b.mentionVolume - a.mentionVolume)
              return (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ranked} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" mentions" />
                    <YAxis
                      type="category"
                      dataKey="platform"
                      tickFormatter={capitalize}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip content={<ChartTooltip formatter={(value) => `${value.toLocaleString()} mentions`} />} />
                    <Bar dataKey="mentionVolume" name="Mentions" radius={[0, 4, 4, 0]}>
                      {ranked.map((entry) => (
                        <Cell key={entry.platform} fill={platformColor(entry.platform)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            })()
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Daily Mention Volume"
          description="Mentions by platform, last 7 days — a sudden same-day spike across platforms is often the first visible sign of a developing issue."
          className="lg:col-span-2"
        >
          {data.mentionVolumeSeries.length === 0 ? (
            <EmptyNote>No mention-volume history yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.mentionVolumeSeries} margin={{ left: -20 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {platforms.map((platform) => (
                  <Bar
                    key={platform}
                    dataKey={platform}
                    name={capitalize(platform)}
                    fill={platformColor(platform)}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Trending Hashtags" description="From real captured posts">
          {data.trendingHashtags.length === 0 ? (
            <EmptyNote>No hashtags captured yet.</EmptyNote>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.trendingHashtags.map((item) => (
                <Chip key={item.hashtag}>
                  #{item.hashtag}{' '}
                  <span className="ml-1 text-slate-400">{item.mentions.toLocaleString()}</span>
                </Chip>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Recent Alerts"
          description="Latest crisis-detection signals"
          actions={
            <Link
              to={PATHS.crisis}
              className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              View all
            </Link>
          }
        >
          {!data.crisis || data.crisis.triggeredSignals.length === 0 ? (
            <EmptyNote>No active crisis signals right now.</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {data.crisis.triggeredSignals.map((signal) => (
                <li
                  key={signal.id}
                  className="flex gap-3 rounded-lg border border-line p-3 dark:border-line-dark"
                >
                  <span className="mt-0.5 shrink-0">
                    <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {humanizeSignalId(signal.id)}
                      </p>
                      <Badge tone={ALERT_TONES[signal.level] ?? 'neutral'}>{signal.level}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {signal.evidence}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Latest AI Recommendations"
          description="Highest-priority suggestions right now"
          actions={
            <Link
              to={PATHS.recommendations}
              className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              View all
            </Link>
          }
        >
          {data.recommendations.length === 0 ? (
            <EmptyNote>
              No recommendations right now — nothing is fabricated to fill this space.
            </EmptyNote>
          ) : (
            <ul className="space-y-3">
              {data.recommendations.map((rec) => (
                <li
                  key={rec.id}
                  className="flex gap-3 rounded-lg border border-line p-3 dark:border-line-dark"
                >
                  <span className="mt-0.5 shrink-0">
                    <Lightbulb className="size-4 text-accent-500" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{rec.category}</Badge>
                      <Badge tone={rec.priority === 'high' ? 'danger' : 'warning'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                      {rec.title}
                    </p>
                    {rec.evidence?.[0] && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {rec.evidence[0]}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { mode, modeConfig } = useMode()
  const [dismissedBanner, setDismissedBanner] = useState(false)

  const { data: businessProfile } = useAsyncData(getProfile, [])
  const { status, data, error, reload } = useAsyncData(() => getDashboardData(mode), [mode])

  const showOnboardingBanner = businessProfile && !businessProfile.exists && !dismissedBanner
  const showPlanningPanel =
    businessProfile?.exists && businessProfile.dataAvailabilityPath === 'no_data'

  return (
    <div className="space-y-6">
      {/* Redesign-v2 foundation demo (docs/redesign-v2/PLAN.md) — PageHero
          used here as the worked example; the rest of this page's layout
          is untouched, its own redesign step comes later. */}
      <PageHero
        eyebrow="Executive Overview"
        title="Business Health, at a Glance"
        highlight="Glance"
        description="Real sentiment, crisis risk, and revenue signals — recomputed from your own data on every visit."
      />

      {showPlanningPanel ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Business Planning Mode
          </p>
          <BusinessPlanningPanel
            values={businessProfile.values}
            provenance={businessProfile.provenance}
            dataAvailabilityPath={businessProfile.dataAvailabilityPath}
          />
        </div>
      ) : (
        <>
          {showOnboardingBanner && (
            <Card bodyClassName="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-600/15">
                  <ClipboardList
                    className="size-4 text-accent-600 dark:text-accent-400"
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Set up your business profile
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tell us about your business — with or without existing data — so InsightAid can
                    tailor this dashboard to you.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={PATHS.onboarding}>
                    <Button size="sm">Get started</Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDismissedBanner(true)}
                    aria-label="Dismiss"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-canvas hover:text-slate-700 dark:hover:bg-canvas-dark dark:hover:text-slate-200"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-brand-900 bg-brand-950" bodyClassName="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="size-4 text-accent-400" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">Executive Summary</p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-accent-300">
                      {modeConfig.label}
                    </span>
                  </div>
                  {status === 'loading' ? (
                    <Skeleton className="mt-2 h-4 w-72 bg-white/15" />
                  ) : (
                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-200">
                      {data?.executiveSummary ?? 'Not enough data yet.'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={reload}
              >
                Refresh
              </Button>
            </div>
          </Card>

          <AsyncSection
            status={status}
            data={data}
            error={error}
            reload={reload}
            loadingSkeleton={<DashboardBodySkeleton />}
          >
            {(dashboardData) => <DashboardBody data={dashboardData} />}
          </AsyncSection>
        </>
      )}
    </div>
  )
}
