import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Heart, Repeat2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { CHART_COLORS } from '@/theme/chartTheme'
import { useMode } from '@/hooks/useMode'
import { mentionVolume7d, platformComparison, topInfluencers, topPosts, trendingHashtags } from '@/data/socialData'

const SENTIMENT_TONE = { positive: 'success', neutral: 'neutral', negative: 'danger' }

export default function SocialIntelligence() {
  const { mode } = useMode()
  const [platform, setPlatform] = useState('tiktok')
  const platformColor = platform === 'tiktok' ? CHART_COLORS.tiktok : CHART_COLORS.x
  const platformLabel = platform === 'tiktok' ? 'TikTok' : 'X'

  const filteredHashtags = useMemo(
    () => trendingHashtags.filter((item) => item.platform === platform && item.mode === mode),
    [platform, mode]
  )
  const filteredInfluencers = useMemo(
    () => topInfluencers.filter((item) => item.platform === platform && item.mode === mode),
    [platform, mode]
  )
  const filteredPosts = useMemo(
    () => topPosts.filter((item) => item.platform === platform && item.mode === mode),
    [platform, mode]
  )
  const maxHashtag = Math.max(...filteredHashtags.map((item) => item.mentions), 1)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2">
          {['tiktok', 'x'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPlatform(option)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                platform === option
                  ? 'bg-accent-500 text-white'
                  : 'border border-line text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark'
              }`}
            >
              {option === 'tiktok' ? 'TikTok' : 'X'}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Platform Comparison" description="Mention volume, virality, engagement, language, and sentiment">
        <Table
          columns={[
            { key: 'platform', label: 'Platform' },
            { key: 'mentionVolume', label: 'Mentions', align: 'right', render: (row) => row.mentionVolume.toLocaleString() },
            { key: 'virality', label: 'Virality', align: 'right', render: (row) => row.virality.toFixed(1) },
            { key: 'engagement', label: 'Engagement %', align: 'right', render: (row) => `${row.engagement.toFixed(1)}%` },
            { key: 'topLanguage', label: 'Top Language' },
            {
              key: 'sentimentScore',
              label: 'Sentiment',
              align: 'right',
              render: (row) => <Badge tone="success">{row.sentimentScore}%</Badge>,
            },
          ]}
          data={platformComparison}
          getRowKey={(row) => row.platform}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`${platformLabel} Mention Volume`} description="Last 7 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mentionVolume7d[platform]} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="mentions" name="Mentions" fill={platformColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Trending Hashtags" description={`Top hashtags on ${platformLabel}`}>
          <ul className="space-y-3">
            {filteredHashtags.map((item) => (
              <li key={item.hashtag}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">#{item.hashtag}</span>
                  <span className="text-slate-500 dark:text-slate-400">{item.mentions.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(item.mentions / maxHashtag) * 100}%`, backgroundColor: platformColor }}
                  />
                </div>
              </li>
            ))}
            {filteredHashtags.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hashtags for this platform.</p>
            )}
          </ul>
        </Card>
      </div>

      <Card title="Top Influencers" description={`Highest-virality accounts mentioning the brand on ${platformLabel}`}>
        <Table
          columns={[
            { key: 'handle', label: 'Handle' },
            { key: 'followers', label: 'Followers', align: 'right', render: (row) => row.followers.toLocaleString() },
            { key: 'virality', label: 'Virality', align: 'right', render: (row) => row.virality.toFixed(1) },
            { key: 'engagement', label: 'Engagement %', align: 'right', render: (row) => `${row.engagement.toFixed(1)}%` },
            {
              key: 'sentiment',
              label: 'Sentiment',
              align: 'right',
              render: (row) => <Badge tone={SENTIMENT_TONE[row.sentiment]}>{row.sentiment}</Badge>,
            },
          ]}
          data={filteredInfluencers}
          getRowKey={(row) => row.handle}
          emptyMessage="No influencers tracked for this platform yet."
        />
      </Card>

      <Card title="Top Posts" description={`Highest-engagement posts on ${platformLabel}`}>
        <ul className="space-y-3">
          {filteredPosts.map((post) => (
            <li key={post.id} className="rounded-lg border border-line p-3 dark:border-line-dark">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{post.text}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Heart className="size-3.5" aria-hidden="true" /> {post.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Repeat2 className="size-3.5" aria-hidden="true" /> {post.shares.toLocaleString()}
                </span>
              </div>
            </li>
          ))}
          {filteredPosts.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No posts for this platform.</p>
          )}
        </ul>
      </Card>
    </div>
  )
}
