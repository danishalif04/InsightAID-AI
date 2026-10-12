import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Heart } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import ChartTooltip from '@/components/ui/ChartTooltip'
import AsyncSection from '@/components/common/AsyncSection'
import { useAsyncData } from '@/hooks/useAsyncData'
import { CHART_COLORS } from '@/theme/chartTheme'
import { capitalize } from '@/utils/formatters'
import { getSocialIntelligenceData } from '@/services/socialIntelligenceService'

const PLATFORM_COLORS = [CHART_COLORS.tiktok, CHART_COLORS.x, CHART_COLORS.positive, CHART_COLORS.neutral]

function EmptyNote({ children }) {
  return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
}

function UnavailableCard({ title, description, reason }) {
  return (
    <Card title={title} description={description}>
      <p className="text-sm italic text-slate-500 dark:text-slate-400">{reason}</p>
    </Card>
  )
}

export default function SocialIntelligence() {
  const { status, data, error, reload } = useAsyncData(getSocialIntelligenceData, [])
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  const platforms = data?.platformComparison.map((p) => p.platform) ?? []
  const effectivePlatform = selectedPlatform ?? platforms[0] ?? null
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
      <AsyncSection status={status} data={data} error={error} reload={reload}>
        {(pageData) => {
          const platformSeries = pageData.mentionVolumeSeries

          return (
            <>
              {platforms.length > 0 && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    {platforms.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedPlatform(option)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          effectivePlatform === option
                            ? 'bg-accent-500 text-white'
                            : 'border border-line text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark'
                        }`}
                      >
                        {capitalize(option)}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <Card title="Platform Comparison" description="Real mention volume, average engagement, and sentiment per platform">
                {pageData.platformComparison.length === 0 ? (
                  <EmptyNote>No platform data yet — upload social/review data via Dataset Management.</EmptyNote>
                ) : (
                  <Table
                    columns={[
                      { key: 'platform', label: 'Platform', render: (row) => capitalize(row.platform) },
                      { key: 'mentionVolume', label: 'Mentions', align: 'right', render: (row) => row.mentionVolume.toLocaleString() },
                      { key: 'avgEngagement', label: 'Avg. Engagement', align: 'right', render: (row) => (row.avgEngagement != null ? row.avgEngagement.toLocaleString() : '—') },
                      { key: 'topLanguage', label: 'Top Language', render: (row) => row.topLanguage ?? '—' },
                      {
                        key: 'sentimentScorePercent',
                        label: 'Sentiment',
                        align: 'right',
                        render: (row) => (row.sentimentScorePercent != null ? <Badge tone="success">{row.sentimentScorePercent}%</Badge> : '—'),
                      },
                    ]}
                    data={pageData.platformComparison}
                    getRowKey={(row) => row.platform}
                  />
                )}
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title={`${platformLabel} Mention Volume`} description="Last 7 days">
                  {platformSeries.length === 0 || !effectivePlatform ? (
                    <EmptyNote>No mention-volume history yet.</EmptyNote>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={platformSeries} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey={effectivePlatform} name="Mentions" fill={platformColor} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card title="Trending Hashtags" description="From real captured posts, across all platforms">
                  {filteredHashtags.length === 0 ? (
                    <EmptyNote>No hashtags captured yet.</EmptyNote>
                  ) : (
                    <ul className="space-y-3">
                      {filteredHashtags.map((item) => (
                        <li key={item.hashtag}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-200">#{item.hashtag}</span>
                            <span className="text-slate-500 dark:text-slate-400">{item.mentions.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                            <div className="h-full rounded-full bg-accent-500" style={{ width: `${(item.mentions / maxHashtag) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <UnavailableCard
                title="Top Influencers"
                description={`Highest-follower accounts mentioning the brand on ${platformLabel}`}
                reason="Unavailable — author identity is deliberately anonymized during ingestion (author_id_hash), and no follower-count field is captured."
              />

              <Card title="Top Posts" description={`Highest-engagement real posts on ${platformLabel}`}>
                {filteredPosts.length === 0 ? (
                  <EmptyNote>No posts for this platform yet.</EmptyNote>
                ) : (
                  <ul className="space-y-3">
                    {filteredPosts.map((post) => (
                      <li key={post.id} className="rounded-lg border border-line p-3 dark:border-line-dark">
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{post.text}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Heart className="size-3.5" aria-hidden="true" /> {post.engagement.toLocaleString()}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )
        }}
      </AsyncSection>
    </div>
  )
}
