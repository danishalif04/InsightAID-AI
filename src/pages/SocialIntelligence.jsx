import { useId, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Heart, Users } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import ChartTooltip from '@/components/ui/ChartTooltip'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import ChartCard from '@/components/charts/ChartCard'
import GranularityToggle from '@/components/ui/GranularityToggle'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { useAsyncData } from '@/hooks/useAsyncData'
import { CHART_COLORS } from '@/theme/chartTheme'
import { capitalize } from '@/utils/formatters'
import { aggregateToMonthly } from '@/utils/chartGranularity'
import { getSocialIntelligenceData } from '@/services/socialIntelligenceService'
import { selectDefaultPlatform } from '@/utils/socialAnalytics'
import { computeEngagementBySentiment } from '@/utils/postBreakdowns'
import { SENTIMENT_COLORS } from '@/config/colorTokens'

const PLATFORM_COLORS = [CHART_COLORS.tiktok, CHART_COLORS.x, CHART_COLORS.positive, CHART_COLORS.neutral]

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

export default function SocialIntelligence() {
  const [granularity, setGranularity] = useState('day')
  const { status, data, error, reload } = useAsyncData(
    () => getSocialIntelligenceData({ granularity }),
    [granularity]
  )
  const isMonthly = granularity === 'month'
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const gradientId = useId()

  const platforms = data?.platformComparison.map((p) => p.platform) ?? []
  const effectivePlatform =
    selectedPlatform ?? selectDefaultPlatform(data?.platformComparison ?? []) ?? platforms[0] ?? null
  const platformColorIndex = Math.max(0, platforms.indexOf(effectivePlatform))
  const platformColor = PLATFORM_COLORS[platformColorIndex % PLATFORM_COLORS.length]
  const platformLabel = effectivePlatform ? capitalize(effectivePlatform) : 'Platform'

  const filteredHashtags = useMemo(() => data?.trendingHashtags ?? [], [data])
  const filteredPosts = useMemo(
    () => (data?.posts ?? []).filter((post) => post.platform === effectivePlatform),
    [data, effectivePlatform]
  )
  const maxHashtag = Math.max(...filteredHashtags.map((item) => item.mentions), 1)
  const reach = useMemo(() => computeEngagementBySentiment(filteredPosts), [filteredPosts])

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Social Listening"
        title="Social Intelligence"
        highlight="Intelligence"
        description="Real post volume, engagement, and sentiment across every platform you're tracking."
      />

      {status === 'error' ? (
        <GlowSection>
          <EmptyState icon={Users} message={error?.message ?? 'Could not load social data.'} actionLabel="Retry" onAction={reload} />
        </GlowSection>
      ) : status !== 'success' || !data ? (
        <GlowSection>
          <p className="text-sm text-glow-text/60">Loading social intelligence…</p>
        </GlowSection>
      ) : (
        <>
          {platforms.length > 0 && (
            <GlowSection>
              <div className="flex flex-wrap items-center gap-2">
                {platforms.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedPlatform(option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      effectivePlatform === option
                        ? 'bg-glow-brand text-glow-bg'
                        : 'border border-glow-border text-glow-text/70 hover:bg-glow-surface'
                    }`}
                  >
                    {capitalize(option)}
                  </button>
                ))}
              </div>
            </GlowSection>
          )}

          <GlowSection title="Platform Comparison" description="Real post count, engagement volume, and sentiment per platform">
            {data.platformComparison.length === 0 ? (
              <EmptyState icon={Users} message="No platform data yet — upload social/review data via Dataset Management." />
            ) : (
              <Table
                columns={[
                  { key: 'platform', label: 'Platform', render: (row) => capitalize(row.platform) },
                  { key: 'postCount', label: 'Posts', align: 'right', render: (row) => row.postCount.toLocaleString() },
                  { key: 'mentionVolume', label: 'Engagement Volume', align: 'right', render: (row) => row.mentionVolume.toLocaleString() },
                  { key: 'avgEngagement', label: 'Avg. Engagement', align: 'right', render: (row) => (row.avgEngagement != null ? row.avgEngagement.toLocaleString() : '—') },
                  { key: 'topLanguage', label: 'Top Language', render: (row) => row.topLanguage ?? '—' },
                  {
                    key: 'sentimentScorePercent',
                    label: 'Sentiment',
                    align: 'right',
                    render: (row) =>
                      row.sentimentScorePercent != null ? (
                        <Badge tone="success">{row.sentimentScorePercent}%</Badge>
                      ) : (
                        <span
                          className="italic text-glow-text/40"
                          title="No rated reviews captured for this platform yet — this platform's posts come from a template with no rating column, so the rating-heuristic sentiment score can never be computed for it."
                        >
                          — (no ratings)
                        </span>
                      ),
                  },
                ]}
                data={data.platformComparison}
                getRowKey={(row) => row.platform}
              />
            )}
          </GlowSection>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title={`${platformLabel} Mention Volume`}
              subtitle={isMonthly ? 'By calendar month' : 'Last 7 days'}
              readingGuide="Volume for just this platform; compare against the other platform tabs to see where conversation is concentrated. Switch Day/Month to zoom out to a longer trend."
              surface="glow"
              ariaLabel={`${platformLabel} mention volume, by ${granularity}`}
              status={status}
              data={data}
              error={error}
              reload={reload}
              emptyWhen={(d) => d.mentionVolumeSeries.length === 0 || !effectivePlatform}
              emptyMessage="No mention-volume history yet."
              headerActions={<GranularityToggle value={granularity} onChange={setGranularity} />}
            >
              {(d) => {
                const series = isMonthly
                  ? aggregateToMonthly(d.mentionVolumeSeries, { sumKeys: [effectivePlatform] })
                  : d.mentionVolumeSeries
                return (
                <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
                  <BarChart data={series} margin={{ left: -20 }}>
                    <defs>
                      <linearGradient id={`${gradientId}-bar`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={platformColor} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={platformColor} stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey={isMonthly ? 'label' : 'date'} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" mentions" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey={effectivePlatform} name="Mentions" fill={`url(#${gradientId}-bar)`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )
              }}
            </ChartCard>

            <GlowSection title="Trending Hashtags" description="From real captured posts, across all platforms">
              {filteredHashtags.length === 0 ? (
                <EmptyState icon={Users} message="No hashtags captured yet." />
              ) : (
                <ul className="space-y-3">
                  {filteredHashtags.map((item) => (
                    <li key={item.hashtag}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-glow-text/80">#{item.hashtag}</span>
                        <span className="text-glow-text/50">{item.mentions.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-glow-surface">
                        <div className="h-full rounded-full bg-glow-brand" style={{ width: `${(item.mentions / maxHashtag) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </GlowSection>
          </div>

          {/* Replaces the old "Top Influencers" panel. That one could never
              show anything, and deliberately so: author identity is
              anonymised at ingestion and no follower count is captured,
              because PDPA 2010 forbids storing personal identifiers from
              scraped comments (CLAUDE.md rule 7). Ranking people is the one
              thing this system must not do.

              Ranking SENTIMENT by reach needs no identity at all, and asks a
              more useful question: do negative posts travel further than
              positive ones? That ratio is the mechanism crisis detection
              exists to catch. */}
          <GlowSection
            title="Reach by Sentiment"
            description={`Engagement carried by each sentiment on ${platformLabel} — no author identity is stored, so accounts are never ranked`}
          >
            {reach.rated === 0 ? (
              <EmptyState
                icon={Users}
                message="No rated posts with engagement figures on this platform yet."
              />
            ) : (
              <div className="space-y-4">
                {reach.negativeToPositiveRatio !== null && (
                  <div className="rounded-2xl border border-glow-border bg-glow-surface p-3">
                    <p className="text-2xl font-semibold text-glow-text">
                      {reach.negativeToPositiveRatio}×
                    </p>
                    <p className="text-xs text-glow-text/60">
                      {reach.negativeToPositiveRatio > 1
                        ? 'Negative posts carry more engagement than positive ones here — complaints are travelling further than praise.'
                        : 'Negative posts carry less engagement than positive ones here.'}
                    </p>
                  </div>
                )}
                <ul className="space-y-2">
                  {reach.groups.map((group) => (
                    <li key={group.sentiment} className="flex items-center gap-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SENTIMENT_COLORS[group.sentiment] }}
                        aria-hidden="true"
                      />
                      <span className="w-20 shrink-0 text-xs capitalize text-glow-text/70">{group.sentiment}</span>
                      <span className="text-xs text-glow-text/50">
                        {group.count} post{group.count === 1 ? '' : 's'}
                      </span>
                      <span className="ml-auto text-right text-xs text-glow-text/70">
                        mean {group.mean.toLocaleString()} · median {group.median.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
                {/* Median is shown beside mean on purpose: engagement is
                    long-tailed and a single viral post can make the mean
                    describe something that never typically happens. */}
                <p className="text-[11px] text-glow-text/40">
                  Median is shown beside the mean because engagement is long-tailed — one viral post can pull the mean far from what a typical post gets.
                </p>
              </div>
            )}
          </GlowSection>

          <GlowSection title="Top Posts" description={`Highest-engagement real posts on ${platformLabel}`}>
            {filteredPosts.length === 0 ? (
              <EmptyState icon={Users} message="No posts for this platform yet." />
            ) : (
              <ul className="space-y-3">
                {filteredPosts.map((post) => (
                  <li key={post.id} className="rounded-xl border border-glow-border bg-glow-surface p-3">
                    <p className="text-sm leading-relaxed text-glow-text/80">{post.text}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-glow-text/50">
                      <span className="flex items-center gap-1">
                        <Heart className="size-3.5" aria-hidden="true" /> {post.engagement.toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlowSection>
        </>
      )}
    </div>
  )
}
