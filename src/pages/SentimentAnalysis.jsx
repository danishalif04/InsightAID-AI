import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatDelta } from '@/utils/formatters'
import {
  emotionAnalysis,
  influentialPosts,
  regionBreakdown,
  sentimentScores,
  sentimentTrend,
} from '@/data/sentimentData'

const LANGUAGE_LABELS = { en: 'EN', ms: 'MY', zh: 'ZH' }
const SENTIMENT_TONE = { positive: 'success', neutral: 'neutral', negative: 'danger' }
const SCORE_TONE = {
  positive: 'text-accent-600 dark:text-accent-400',
  neutral: 'text-slate-500 dark:text-slate-400',
  negative: 'text-danger',
}

export default function SentimentAnalysis() {
  const { notify } = useNotifications()
  const [keyword, setKeyword] = useState('')
  const [language, setLanguage] = useState('all')
  const [platform, setPlatform] = useState('all')

  const filteredPosts = useMemo(() => {
    return influentialPosts.filter((post) => {
      const matchesKeyword = keyword.trim()
        ? post.text.toLowerCase().includes(keyword.trim().toLowerCase())
        : true
      const matchesLanguage = language === 'all' || post.language === language
      const matchesPlatform = platform === 'all' || post.platform === platform
      return matchesKeyword && matchesLanguage && matchesPlatform
    })
  }, [keyword, language, platform])

  const maxMentions = Math.max(...regionBreakdown.map((r) => r.mentions))
  const maxEmotion = Math.max(...emotionAnalysis.map((e) => e.value))

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Search"
              icon={Search}
              placeholder="Search posts, keywords..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="all">All languages</option>
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
              <option value="zh">Mandarin</option>
            </Select>
            <Select label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option value="all">All platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X</option>
            </Select>
          </div>
          <Button variant="secondary" icon={Download} onClick={() => notify('Sentiment report export started.')}>
            Export
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sentimentScores.map((score) => {
          const DeltaIcon = score.delta >= 0 ? ArrowUp : ArrowDown
          const isGoodDelta = score.id === 'negative' ? score.delta <= 0 : score.delta >= 0
          return (
            <Card key={score.id} bodyClassName="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{score.label}</p>
              <p className={`mt-2 text-2xl font-semibold ${SCORE_TONE[score.id]}`}>{score.value}%</p>
              <span
                className={`mt-2 inline-flex items-center gap-0.5 text-xs font-medium ${
                  isGoodDelta ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
                }`}
              >
                <DeltaIcon className="size-3" aria-hidden="true" />
                {formatDelta(score.delta)} WoW
              </span>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sentiment Trend" description="Last 7 days, by sentiment label" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sentimentTrend} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
              <Line type="monotone" dataKey="positive" name="Positive" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="neutral" name="Neutral" stroke={CHART_COLORS.neutral} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="negative" name="Negative" stroke={CHART_COLORS.negative} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Emotion Analysis" description="Breakdown of detected emotions">
          <ul className="space-y-3">
            {emotionAnalysis.map((item) => (
              <li key={item.emotion}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.emotion}</span>
                  <span className="text-slate-500 dark:text-slate-400">{item.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${(item.value / maxEmotion) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Most Influential Posts" description={`${filteredPosts.length} posts matching filters`}>
          <ol className="space-y-3">
            {filteredPosts.map((post, index) => (
              <li key={post.id} className="rounded-lg border border-line p-3 dark:border-line-dark">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                  <Badge tone="neutral">{post.platform === 'tiktok' ? 'TikTok' : 'X'}</Badge>
                  <Badge tone="neutral">{LANGUAGE_LABELS[post.language]}</Badge>
                  <Badge tone={SENTIMENT_TONE[post.sentiment]} className="ml-auto">
                    {post.sentiment} · {Math.round(post.confidence * 100)}%
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{post.text}</p>
                <p className="mt-1.5 text-xs text-slate-400">{post.engagement.toLocaleString()} engagements</p>
              </li>
            ))}
            {filteredPosts.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No posts match the current filters.
              </p>
            )}
          </ol>
        </Card>

        <Card title="Region Breakdown" description="Sentiment score and mention volume by state">
          <ul className="space-y-4">
            {regionBreakdown.map((region) => (
              <li key={region.state}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{region.state}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {region.score}% score · {region.mentions.toLocaleString()} mentions
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                    <div className="h-full rounded-full bg-accent-500" style={{ width: `${region.score}%` }} />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(region.mentions / maxMentions) * 100}%`, backgroundColor: CHART_COLORS.x }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent-500" /> Sentiment score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.x }} /> Mentions
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
