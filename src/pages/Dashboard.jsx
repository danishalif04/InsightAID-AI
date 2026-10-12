import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList, Lightbulb, RefreshCw, Sparkles, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import AsyncSection from '@/components/common/AsyncSection'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMode } from '@/hooks/useMode'
import { PATHS } from '@/routes/paths'
import { CHART_COLORS } from '@/theme/chartTheme'
import { capitalize, formatCurrencyMYR, formatDelta } from '@/utils/formatters'
import { getProfile } from '@/services/businessProfileService'
import { getDashboardData } from '@/services/dashboardService'
import BusinessPlanningPanel from '@/components/common/BusinessPlanningPanel'

const ALERT_TONES = { warning: 'warning', critical: 'danger' }
const PLATFORM_COLORS = [CHART_COLORS.tiktok, CHART_COLORS.x, CHART_COLORS.positive, CHART_COLORS.neutral]

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
    kpis.push({ id: 'sentiment', label: 'Overall Sentiment (Positive)', display: `${positive.value}%`, delta: positive.delta })
  }

  if (data.crisis) {
    kpis.push({
      id: 'crisis',
      label: 'Crisis Risk',
      display: capitalize(data.crisis.riskLevel),
      footer: `Risk score ${data.crisis.riskScore}/100${data.crisis.dataSufficient ? '' : ' · limited data'}`,
    })
  }

  const lastForecastPoint = data.bestForecastRow?.forecast_points?.[data.bestForecastRow.forecast_points.length - 1]
  if (lastForecastPoint?.predicted != null) {
    kpis.push({
      id: 'forecast',
      label: 'Revenue Forecast',
      display: formatCurrencyMYR(lastForecastPoint.predicted),
      footer: data.bestForecastRow.mape != null ? `Model MAPE: ${data.bestForecastRow.mape}%` : null,
    })
  }

  return kpis
}

function DashboardBody({ data }) {
  const kpis = buildKpis(data)
  const platforms = data.platformComparison.map((p) => p.platform)

  return (
    <>
      {kpis.length === 0 ? (
        <Card>
          <EmptyNote>No KPIs computable yet — upload sales, review, or social data via Dataset Management.</EmptyNote>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sentiment Trend" description="Last 14 days, by sentiment label" className="lg:col-span-2">
          {data.sentimentTrend.length === 0 ? (
            <EmptyNote>No sentiment history yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.sentimentTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="positive" name="Positive" stackId="sentiment" stroke={CHART_COLORS.positive} fill={CHART_COLORS.positive} fillOpacity={0.25} strokeWidth={2} connectNulls={false} />
                <Area type="monotone" dataKey="neutral" name="Neutral" stackId="sentiment" stroke={CHART_COLORS.neutral} fill={CHART_COLORS.neutral} fillOpacity={0.25} strokeWidth={2} connectNulls={false} />
                <Area type="monotone" dataKey="negative" name="Negative" stackId="sentiment" stroke={CHART_COLORS.negative} fill={CHART_COLORS.negative} fillOpacity={0.25} strokeWidth={2} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Platform Distribution" description="Mentions by platform">
          {data.platformComparison.length === 0 ? (
            <EmptyNote>No platform data yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Pie
                  data={data.platformComparison}
                  dataKey="mentionVolume"
                  nameKey="platform"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="var(--color-surface)"
                >
                  {data.platformComparison.map((entry, index) => (
                    <Cell key={entry.platform} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Daily Mention Volume" description="Mentions by platform, last 7 days" className="lg:col-span-2">
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
                {platforms.map((platform, index) => (
                  <Bar key={platform} dataKey={platform} name={capitalize(platform)} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} radius={[4, 4, 0, 0]} />
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
                  #{item.hashtag} <span className="ml-1 text-slate-400">{item.mentions.toLocaleString()}</span>
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
            <Link to={PATHS.crisis} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
              View all
            </Link>
          }
        >
          {!data.crisis || data.crisis.triggeredSignals.length === 0 ? (
            <EmptyNote>No active crisis signals right now.</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {data.crisis.triggeredSignals.map((signal) => (
                <li key={signal.id} className="flex gap-3 rounded-lg border border-line p-3 dark:border-line-dark">
                  <span className="mt-0.5 shrink-0">
                    <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{humanizeSignalId(signal.id)}</p>
                      <Badge tone={ALERT_TONES[signal.level] ?? 'neutral'}>{signal.level}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{signal.evidence}</p>
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
            <Link to={PATHS.recommendations} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
              View all
            </Link>
          }
        >
          {data.recommendations.length === 0 ? (
            <EmptyNote>No recommendations right now — nothing is fabricated to fill this space.</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {data.recommendations.map((rec) => (
                <li key={rec.id} className="flex gap-3 rounded-lg border border-line p-3 dark:border-line-dark">
                  <span className="mt-0.5 shrink-0">
                    <Lightbulb className="size-4 text-accent-500" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{rec.category}</Badge>
                      <Badge tone={rec.priority === 'high' ? 'danger' : 'warning'}>{rec.priority}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">{rec.title}</p>
                    {rec.evidence?.[0] && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rec.evidence[0]}</p>}
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
  const showPlanningPanel = businessProfile?.exists && businessProfile.dataAvailabilityPath === 'no_data'

  return (
    <div className="space-y-6">
      {showPlanningPanel ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Business Planning Mode</p>
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
                  <ClipboardList className="size-4 text-accent-600 dark:text-accent-400" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Set up your business profile</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tell us about your business — with or without existing data — so InsightAid can tailor this dashboard to you.
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
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-200">
                    {status === 'loading' ? 'Loading…' : (data?.executiveSummary ?? 'Not enough data yet.')}
                  </p>
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

          <AsyncSection status={status} data={data} error={error} reload={reload}>
            {(dashboardData) => <DashboardBody data={dashboardData} />}
          </AsyncSection>
        </>
      )}
    </div>
  )
}
