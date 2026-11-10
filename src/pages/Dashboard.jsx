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
  CheckCircle2,
  ClipboardList,
  Hash,
  Lightbulb,
  PackageSearch,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import ChartCard from '@/components/charts/ChartCard'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import StatTile from '@/components/ui/StatTile'
import EmptyState from '@/components/ui/EmptyState'
import PageHero from '@/components/ui/PageHero'
import InfoPopover from '@/components/ui/InfoPopover'
import GranularityToggle from '@/components/ui/GranularityToggle'
import { aggregateToMonthly } from '@/utils/chartGranularity'
import AsyncSection from '@/components/common/AsyncSection'
import Skeleton from '@/components/ui/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMode } from '@/hooks/useMode'
import { useUIMode } from '@/hooks/useUIMode'
import SeniorModePanel from '@/components/common/SeniorModePanel'
import { PATHS } from '@/routes/paths'
import { CHART_COLORS } from '@/theme/chartTheme'
import { PLATFORM_COLORS as PLATFORM_COLOR_MAP } from '@/config/colorTokens'
import { capitalize, formatCurrencyMYR } from '@/utils/formatters'
import { getProfile } from '@/services/businessProfileService'
import { getDashboardData } from '@/services/dashboardService'
import BusinessPlanningPanel from '@/components/common/BusinessPlanningPanel'
import BusinessOverviewCard from '@/components/common/BusinessOverviewCard'

const ALERT_TONES = { warning: 'warning', critical: 'danger' }
const RISK_TONES = { normal: 'text-glow-brand', warning: 'text-amber-400', critical: 'text-rose-400' }
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

/** Same local-section pattern every redesigned page defines (Social
 * Intelligence, Crisis Detection, etc.) — not extracted to a shared
 * component yet, consistent with how those pages did it. */
function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

const RANK_BAR_TONES = {
  brand: { bar: 'bg-glow-brand', text: 'text-glow-brand' },
  rose: { bar: 'bg-rose-400', text: 'text-rose-400' },
}

/** Ranked bar-fill list — same visual pattern Social Intelligence's
 * Trending Hashtags already uses, reused here for "Product Performance"
 * instead of a Recharts bar chart, since this is just two short (<=5-row)
 * ranked lists, not a chart that benefits from axes/gridlines. Width is
 * relative to the TOP product's revenue (shared across both lists) so a
 * reader can visually compare a "low performing" bar's real distance from
 * the best performer, not just rank it against its own list's max. */
/** Real product photo when the uploaded sales data carries one (an
 * optional `image_url` column — see salesSeries.js's normalizeSalesRow),
 * a plain package icon otherwise. Never a stock/guessed image standing in
 * for a real product — the real Embun Botanica account has no image_url
 * column at all, so every one of its products correctly falls back to
 * the icon rather than showing anything fabricated. `onError` also falls
 * back to the icon if a given URL 404s/fails to load, rather than
 * showing a broken-image glyph. */
function ProductThumb({ imageUrl, product }) {
  const [failed, setFailed] = useState(false)
  if (!imageUrl || failed) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-glow-surface text-glow-text/30">
        <PackageSearch className="size-4" aria-hidden="true" />
      </span>
    )
  }
  return (
    <img
      src={imageUrl}
      alt={product}
      className="size-8 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function ProductRankList({ heading, tone, products, maxRevenue }) {
  const { bar, text } = RANK_BAR_TONES[tone]
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-glow-text/50">{heading}</p>
      <ul className="mt-3 space-y-3">
        {products.map((item) => (
          <li key={item.product}>
            <div className="mb-1 flex items-center gap-2 text-xs">
              <ProductThumb imageUrl={item.imageUrl} product={item.product} />
              <span className="min-w-0 flex-1 truncate font-medium text-glow-text/80">{item.product}</span>
              <span className={`shrink-0 font-semibold ${text}`}>{formatCurrencyMYR(item.revenue)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-glow-surface">
              <div
                className={`h-full rounded-full ${bar}`}
                style={{ width: `${maxRevenue > 0 ? Math.max(4, (item.revenue / maxRevenue) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
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
          <div key={i} className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 lg:col-span-2">
          <Skeleton className="h-full min-h-[220px] w-full" />
        </div>
        <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
          <Skeleton className="h-full min-h-[220px] w-full" />
        </div>
      </div>
    </>
  )
}

function DashboardBody({ data, granularity, onGranularityChange }) {
  const platforms = data.platformComparison.map((p) => p.platform)
  const { uiMode } = useUIMode()
  const positiveScore = data.sentimentScores?.find((score) => score.id === 'positive') ?? null
  const crisis = data.crisis
  const lastForecastPoint =
    data.bestForecastRow?.forecast_points?.[data.bestForecastRow.forecast_points.length - 1]
  const gradientId = useId()

  // getDashboardData() already fetched a year of history once `granularity`
  // is 'month' (see dashboardService.js) — bucketing into calendar months
  // happens here, in the page, so the service stays a plain data fetch.
  const isMonthly = granularity === 'month'
  const sentimentTrendData = isMonthly
    ? aggregateToMonthly(data.sentimentTrend, { avgKeys: ['positive', 'neutral', 'negative'] })
    : data.sentimentTrend
  const mentionVolumeData = isMonthly
    ? aggregateToMonthly(data.mentionVolumeSeries, { sumKeys: platforms })
    : data.mentionVolumeSeries

  const hasKpis = positiveScore?.value != null || !!crisis || lastForecastPoint?.predicted != null

  return (
    <>
      {uiMode === 'senior' && (
        <SeniorModePanel recommendations={data.recommendations} sentimentScore={positiveScore} />
      )}

      {!hasKpis ? (
        <EmptyState
          icon={ClipboardList}
          message="No KPIs computable yet — upload sales, review, or social data via Dataset Management."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positiveScore?.value != null && (
            <StatTile
              label="Overall Sentiment (Positive)"
              value={positiveScore.value}
              unit="%"
              delta={positiveScore.delta != null ? Math.round(positiveScore.delta * 10) / 10 : null}
              guide="Share of recent reviews/posts classified positive, from the rating-heuristic sentiment model. The delta compares against the prior period of the same length."
            />
          )}

          {crisis && (
            <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4 shadow-[0_0_0_1px_rgba(34,197,94,0.06),0_12px_32px_-16px_rgba(34,197,94,0.35)]">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-glow-text/50">
                Crisis Risk
                <InfoPopover
                  label="About Crisis Risk"
                  guide="A 0-100 score from 7 real signals (negative-sentiment level/velocity, mention-volume level/velocity, rating deterioration, sentiment anomaly, review-volume anomaly), each compared against this business's own recent baseline — never a fixed threshold. See Crisis Detection for the full breakdown."
                />
              </p>
              <p className={`mt-1.5 text-4xl font-bold tracking-tight ${RISK_TONES[crisis.riskLevel] ?? 'text-glow-text'}`}>
                {capitalize(crisis.riskLevel)}
              </p>
              <p className="mt-2 text-xs text-glow-text/50">
                Risk score {crisis.riskScore}/100{crisis.dataSufficient ? '' : ' · limited data'}
              </p>
            </div>
          )}

          {lastForecastPoint?.predicted != null && (
            <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4 shadow-[0_0_0_1px_rgba(34,197,94,0.06),0_12px_32px_-16px_rgba(34,197,94,0.35)]">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-glow-text/50">
                Revenue Forecast
                <InfoPopover
                  label="About Revenue Forecast"
                  guide="The next predicted day's revenue from this account's best-performing forecasting model run (see Forecasting for the full comparison). MAPE is that model's average forecast error on past data — lower is more accurate."
                />
              </p>
              <p className="mt-1.5 text-4xl font-bold tracking-tight tabular-nums text-glow-text">
                {formatCurrencyMYR(lastForecastPoint.predicted)}
              </p>
              {data.bestForecastRow.mape != null && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-glow-brand/15 px-2 py-0.5 text-xs font-semibold text-glow-brand">
                  <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
                  Model MAPE: {data.bestForecastRow.mape}%
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Sentiment Trend"
          subtitle={
            isMonthly
              ? 'By calendar month, by sentiment label — shows whether customer sentiment is improving or worsening over time; each month\'s three bands always add up to 100%.'
              : 'Last 14 days, by sentiment label — shows whether customer sentiment is improving or worsening over time; each day\'s three bands always add up to 100%.'
          }
          readingGuide="Each bar is split into positive/neutral/negative shares that always add to 100%. A growing green band over time means sentiment is improving. Switch Day/Month above to zoom out to a longer trend."
          surface="glow"
          className="lg:col-span-2"
          ariaLabel={`Sentiment trend area chart, by ${granularity}, split into positive, neutral, and negative shares`}
          status="success"
          data={sentimentTrendData}
          emptyWhen={(rows) => rows.length === 0}
          emptyMessage="No sentiment history yet."
          headerActions={<GranularityToggle value={granularity} onChange={onGranularityChange} />}
        >
          {(trend) => (
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
              <AreaChart data={trend} margin={{ left: -20 }}>
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
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
        </ChartCard>

        <ChartCard
          title="Platform Distribution"
          subtitle="Mentions by platform, ranked highest to lowest — shows which channel generates the most conversation right now, so attention or budget can follow it."
          readingGuide="Bars are ranked longest to shortest by mention volume — the top bar is where most of the conversation is happening right now."
          surface="glow"
          ariaLabel="Platform distribution bar chart, ranked by mention volume"
          status="success"
          data={data.platformComparison}
          emptyWhen={(rows) => rows.length === 0}
          emptyMessage="No platform data yet."
        >
          {(comparison) => {
            // Phase 6 chart audit: this used to be a 4-slice donut.
            // Cleveland & McGill (1984) rank angle/area judgment below
            // position/length — and the master prompt explicitly bars any
            // pie/donut past 3 slices. A ranked horizontal bar makes
            // "which platform leads" readable at a glance instead of
            // requiring angle comparison. Recharts matches <Cell> children
            // to data points by INDEX, so the Cell list must iterate the
            // SAME sorted array as `data`.
            const ranked = [...comparison].sort((a, b) => b.mentionVolume - a.mentionVolume)
            return (
              <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
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
          }}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={isMonthly ? 'Monthly Mention Volume' : 'Daily Mention Volume'}
          subtitle={
            isMonthly
              ? 'Mentions by platform, by calendar month.'
              : 'Mentions by platform, last 7 days — a sudden same-day spike across platforms is often the first visible sign of a developing issue.'
          }
          readingGuide="Each bar is one period, split by platform. Switch Day/Month above to zoom out to a longer trend."
          surface="glow"
          className="lg:col-span-2"
          ariaLabel={`Mention volume bar chart, by platform, by ${granularity}`}
          status="success"
          data={mentionVolumeData}
          emptyWhen={(rows) => rows.length === 0}
          emptyMessage="No mention-volume history yet."
          headerActions={<GranularityToggle value={granularity} onChange={onGranularityChange} />}
        >
          {(series) => (
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
              <BarChart data={series} margin={{ left: -20 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey={isMonthly ? 'label' : 'date'} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
        </ChartCard>

        <GlowSection title="Trending Hashtags" description="From real captured posts">
          {data.trendingHashtags.length === 0 ? (
            <EmptyState icon={Hash} message="No hashtags captured yet." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.trendingHashtags.map((item) => (
                <Chip key={item.hashtag}>
                  #{item.hashtag} <span className="ml-1 text-glow-text/40">{item.mentions.toLocaleString()}</span>
                </Chip>
              ))}
            </div>
          )}
        </GlowSection>
      </div>

      <GlowSection
        title="Product Performance"
        description="Ranked by real revenue from your uploaded sales data — not units sold, so a cheap, high-volume item doesn't outrank a pricier one it's actually behind."
      >
        {data.topProducts.length === 0 ? (
          <EmptyState icon={PackageSearch} message="No product-level sales data yet — upload a sales dataset with a product column via Dataset Management." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ProductRankList
              heading="Top performing"
              tone="brand"
              products={data.topProducts}
              maxRevenue={data.topProducts[0]?.revenue ?? 1}
            />
            <ProductRankList
              heading="Low performing"
              tone="rose"
              products={data.bottomProducts}
              maxRevenue={data.topProducts[0]?.revenue ?? 1}
            />
          </div>
        )}
      </GlowSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlowSection
          title="Recent Alerts"
          description="Latest crisis-detection signals"
          className="relative"
        >
          <Link
            to={PATHS.crisis}
            className="absolute right-5 top-5 text-xs font-medium text-glow-brand hover:underline sm:right-6 sm:top-6"
          >
            View all
          </Link>
          {!crisis || crisis.triggeredSignals.length === 0 ? (
            <EmptyState icon={AlertTriangle} message="No active crisis signals right now." />
          ) : (
            <ul className="space-y-3">
              {crisis.triggeredSignals.map((signal) => (
                <li key={signal.id} className="flex gap-3 rounded-xl border border-glow-border p-3">
                  <span className="mt-0.5 shrink-0">
                    <AlertTriangle className="size-4 text-rose-400" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-glow-text">{humanizeSignalId(signal.id)}</p>
                      <Badge tone={ALERT_TONES[signal.level] ?? 'neutral'}>{signal.level}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-glow-text/50">{signal.evidence}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlowSection>

        <GlowSection
          title="Latest AI Recommendations"
          description="Highest-priority suggestions right now"
          className="relative"
        >
          <Link
            to={PATHS.recommendations}
            className="absolute right-5 top-5 text-xs font-medium text-glow-brand hover:underline sm:right-6 sm:top-6"
          >
            View all
          </Link>
          {data.recommendations.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              message="No recommendations right now — nothing is fabricated to fill this space."
            />
          ) : (
            <ul className="space-y-3">
              {data.recommendations.map((rec) => (
                <li key={rec.id} className="flex gap-3 rounded-xl border border-glow-border p-3">
                  <span className="mt-0.5 shrink-0">
                    <Lightbulb className="size-4 text-glow-brand" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{rec.category}</Badge>
                      <Badge tone={rec.priority === 'high' ? 'danger' : 'warning'}>{rec.priority}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-glow-text">{rec.title}</p>
                    {rec.evidence?.[0] && <p className="mt-1 text-xs text-glow-text/50">{rec.evidence[0]}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlowSection>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { mode, modeConfig } = useMode()
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [granularity, setGranularity] = useState('day')

  const { data: businessProfile } = useAsyncData(getProfile, [])
  const { status, data, error, reload } = useAsyncData(
    () => getDashboardData(mode, { granularity }),
    [mode, granularity]
  )

  const showOnboardingBanner = businessProfile && !businessProfile.exists && !dismissedBanner
  const showPlanningPanel =
    businessProfile?.exists && businessProfile.dataAvailabilityPath === 'no_data'

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Executive Overview"
        title="Business Health, at a Glance"
        highlight="Glance"
        description="Real sentiment, crisis risk, and revenue signals — recomputed from your own data on every visit."
      />

      {showPlanningPanel ? (
        <div className="space-y-6">
          {mode === 'startup' && <BusinessOverviewCard values={businessProfile.values} />}
          <p className="mb-3 text-sm font-semibold text-glow-text">Business Planning Mode</p>
          <BusinessPlanningPanel
            values={businessProfile.values}
            provenance={businessProfile.provenance}
            dataAvailabilityPath={businessProfile.dataAvailabilityPath}
          />
        </div>
      ) : (
        <>
          {showOnboardingBanner && (
            <GlowSection>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-glow-brand/15">
                  <ClipboardList className="size-4 text-glow-brand" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-glow-text">Set up your business profile</p>
                  <p className="mt-0.5 text-xs text-glow-text/60">
                    Tell us about your business — with or without existing data — so InsightAid can
                    tailor this dashboard to you.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={PATHS.onboarding}>
                    <Button variant="glowBrand" size="sm">
                      Get started
                    </Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDismissedBanner(true)}
                    aria-label="Dismiss"
                    className="rounded-lg p-1.5 text-glow-text/40 hover:bg-white/5 hover:text-glow-text"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </GlowSection>
          )}

          <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-6 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_16px_48px_-20px_rgba(34,197,94,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-glow-brand/15">
                  <Sparkles className="size-4 text-glow-brand" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-glow-text">Executive Summary</p>
                    <span className="rounded-full bg-glow-brand/15 px-2.5 py-1 text-xs font-medium text-glow-brand">
                      {modeConfig.label}
                    </span>
                  </div>
                  {status === 'loading' ? (
                    <Skeleton className="mt-2 h-4 w-72" />
                  ) : (
                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-glow-text/70">
                      {data?.executiveSummary ?? 'Not enough data yet.'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="glowSecondary"
                size="sm"
                icon={RefreshCw}
                className="shrink-0"
                onClick={reload}
              >
                Refresh
              </Button>
            </div>
          </div>

          <AsyncSection
            status={status}
            data={data}
            error={error}
            reload={reload}
            loadingSkeleton={<DashboardBodySkeleton />}
          >
            {(dashboardData) => (
              <DashboardBody data={dashboardData} granularity={granularity} onGranularityChange={setGranularity} />
            )}
          </AsyncSection>
        </>
      )}
    </div>
  )
}
