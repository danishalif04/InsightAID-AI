import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Heart, Users } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import ChartTooltip from '@/components/ui/ChartTooltip'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import ChartCard from '@/components/charts/ChartCard'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { useAsyncData } from '@/hooks/useAsyncData'
import { CHART_COLORS } from '@/theme/chartTheme'
import { capitalize } from '@/utils/formatters'
import { getSocialIntelligenceData } from '@/services/socialIntelligenceService'
import { selectDefaultPlatform } from '@/utils/socialAnalytics'

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
  const { status, data, error, reload } = useAsyncData(getSocialIntelligenceData, [])
  const [selectedPlatform, setSelectedPlatform] = useState(null)

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
              subtitle="Last 7 days"
              readingGuide="Day-to-day volume for just this platform; compare against the other platform tabs to see where conversation is concentrated."
              surface="glow"
              ariaLabel={`${platformLabel} mention volume over the last 7 days`}
              status={status}
              data={data}
              error={error}
              reload={reload}
              emptyWhen={(d) => d.mentionVolumeSeries.length === 0 || !effectivePlatform}
              emptyMessage="No mention-volume history yet."
            >
              {(d) => (
                <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md}>
                  <BarChart data={d.mentionVolumeSeries} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit=" mentions" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey={effectivePlatform} name="Mentions" fill={platformColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
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

          <GlowSection title="Top Influencers" description={`Highest-follower accounts mentioning the brand on ${platformLabel}`}>
            <p className="text-sm italic text-glow-text/50">
              Unavailable — author identity is deliberately anonymized during ingestion, and no follower-count field is captured.
            </p>
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
