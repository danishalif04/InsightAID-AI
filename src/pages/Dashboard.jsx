import { useEffect, useState } from 'react'
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
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Info,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import Skeleton from '@/components/ui/Skeleton'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { PATHS } from '@/routes/paths'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatDelta } from '@/utils/formatters'
import { getProfile } from '@/services/businessProfileService'
import BusinessPlanningPanel from '@/components/common/BusinessPlanningPanel'
import {
  dailyMentionVolume,
  executiveSummary,
  kpis,
  latestRecommendations,
  platformDistribution,
  recentAlerts,
  sentimentTrend,
  trendingKeywords,
} from '@/data/dashboardData'

const ALERT_TONES = { high: 'danger', medium: 'warning', low: 'info' }

function KpiCard({ label, display, delta, forecast, confidence, invertDelta }) {
  const isGood = invertDelta ? delta <= 0 : delta >= 0
  const DeltaIcon = delta >= 0 ? ArrowUp : ArrowDown

  return (
    <Card bodyClassName="p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{display}</p>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            isGood ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
          }`}
        >
          <DeltaIcon className="size-3" aria-hidden="true" />
          {formatDelta(delta)}
        </span>
      </div>
      <div className="mt-4 border-t border-line pt-3 dark:border-line-dark">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Forecast: {forecast}</span>
          <span>{confidence}% confidence</span>
        </div>
        <ProgressBar value={confidence} className="mt-2" />
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { notify } = useNotifications()
  const { mode, modeConfig } = useMode()
  const [loading, setLoading] = useState(true)
  const [businessProfile, setBusinessProfile] = useState(null)
  const [dismissedBanner, setDismissedBanner] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    getProfile()
      .then(setBusinessProfile)
      .catch(() => {})
  }, [])

  const showOnboardingBanner = businessProfile && !businessProfile.exists && !dismissedBanner
  const showPlanningPanel = businessProfile?.exists && businessProfile.dataAvailabilityPath === 'no_data'

  return (
    <div className="space-y-6">
      {showPlanningPanel && (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Business Planning Mode</p>
          <BusinessPlanningPanel
            values={businessProfile.values}
            provenance={businessProfile.provenance}
            dataAvailabilityPath={businessProfile.dataAvailabilityPath}
          />
        </div>
      )}

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
                <p className="text-sm font-semibold text-white">AI Executive Summary</p>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-accent-300">
                  {modeConfig.label}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-200">
                {executiveSummary[mode].headline}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => notify('Executive summary regenerated.')}
          >
            Regenerate
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sentiment Trend" description="Last 14 days, by sentiment label" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={sentimentTrend} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="positive"
                name="Positive"
                stackId="sentiment"
                stroke={CHART_COLORS.positive}
                fill={CHART_COLORS.positive}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="neutral"
                name="Neutral"
                stackId="sentiment"
                stroke={CHART_COLORS.neutral}
                fill={CHART_COLORS.neutral}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="negative"
                name="Negative"
                stackId="sentiment"
                stroke={CHART_COLORS.negative}
                fill={CHART_COLORS.negative}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Platform Distribution" description="Share of mentions by platform">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Pie
                data={platformDistribution}
                dataKey="value"
                nameKey="platform"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                strokeWidth={2}
                stroke="var(--color-surface)"
              >
                {platformDistribution.map((entry) => (
                  <Cell
                    key={entry.platform}
                    fill={entry.platform === 'TikTok' ? CHART_COLORS.tiktok : CHART_COLORS.x}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Daily Mention Volume" description="Mentions by platform, last 7 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyMentionVolume} margin={{ left: -20 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tiktok" name="TikTok" fill={CHART_COLORS.tiktok} radius={[4, 4, 0, 0]} />
              <Bar dataKey="x" name="X" fill={CHART_COLORS.x} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Trending Keywords" description="Most mentioned this week">
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.map((item) => (
              <Chip key={item.keyword}>
                #{item.keyword} <span className="ml-1 text-slate-400">{item.mentions.toLocaleString()}</span>
              </Chip>
            ))}
          </div>
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
          <ul className="space-y-3">
            {recentAlerts.map((alert) => (
              <li key={alert.id} className="flex gap-3 rounded-lg border border-line p-3 dark:border-line-dark">
                <span className="mt-0.5 shrink-0">
                  {alert.level === 'high' ? (
                    <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
                  ) : (
                    <Info className="size-4 text-slate-400" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{alert.title}</p>
                    <Badge tone={ALERT_TONES[alert.level]}>{alert.level}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{alert.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Latest AI Recommendations"
          description="Highest-impact suggestions right now"
          actions={
            <Link
              to={PATHS.recommendations}
              className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              View all
            </Link>
          }
        >
          <ul className="space-y-3">
            {latestRecommendations.map((rec) => (
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
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Impact score: {rec.impact}%</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
