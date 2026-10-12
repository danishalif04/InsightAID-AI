import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import { Input, Select } from '@/components/ui/Input'
import ChartTooltip from '@/components/ui/ChartTooltip'
import AsyncSection from '@/components/common/AsyncSection'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatDelta } from '@/utils/formatters'
import { downloadCsv } from '@/utils/csvExport'
import { getSentimentAnalysisData } from '@/services/sentimentAnalysisService'

const LANGUAGE_LABELS = { en: 'EN', ms: 'MY', zh: 'ZH', 'ms-en': 'MY/EN', unknown: '—' }
const SENTIMENT_TONE = { positive: 'success', neutral: 'neutral', negative: 'danger' }
const SCORE_TONE = {
  positive: 'text-accent-600 dark:text-accent-400',
  neutral: 'text-slate-500 dark:text-slate-400',
  negative: 'text-danger',
}

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

export default function SentimentAnalysis() {
  const { notify } = useNotifications()
  const [keyword, setKeyword] = useState('')
  const [language, setLanguage] = useState('all')
  const [platform, setPlatform] = useState('all')

  const { status, data, error, reload } = useAsyncData(getSentimentAnalysisData, [])

  const filteredPosts = useMemo(() => {
    const posts = data?.posts ?? []
    return posts.filter((post) => {
      const matchesKeyword = keyword.trim() ? post.text.toLowerCase().includes(keyword.trim().toLowerCase()) : true
      const matchesLanguage = language === 'all' || post.language === language
      const matchesPlatform = platform === 'all' || post.platform === platform
      return matchesKeyword && matchesLanguage && matchesPlatform
    })
  }, [data, keyword, language, platform])

  const handleExport = () => {
    if (filteredPosts.length === 0) {
      notify('Nothing to export for the current filters.')
      return
    }
    downloadCsv(
      'sentiment-posts.csv',
      filteredPosts.map((post) => ({
        platform: post.platform,
        language: post.language,
        sentiment: post.sentiment ?? '',
        sentimentConfidence: post.sentimentConfidence ?? '',
        engagement: post.engagement,
        text: post.text,
      }))
    )
  }

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
              <option value="ms-en">Code-mixed (MY/EN)</option>
            </Select>
            <Select label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option value="all">All platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X</option>
            </Select>
          </div>
          <Button variant="secondary" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </Card>

      <AsyncSection status={status} data={data} error={error} reload={reload}>
        {(pageData) => (
          <>
            {pageData.sentimentScores === null ? (
              <Card>
                <EmptyNote>No sentiment data yet — upload reviews or social data via Dataset Management.</EmptyNote>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {pageData.sentimentScores.map((score) => {
                  const hasDelta = score.delta != null
                  const DeltaIcon = score.delta >= 0 ? ArrowUp : ArrowDown
                  const isGoodDelta = score.id === 'negative' ? score.delta <= 0 : score.delta >= 0
                  return (
                    <Card key={score.id} bodyClassName="p-5">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{score.label}</p>
                      <p className={`mt-2 text-2xl font-semibold ${SCORE_TONE[score.id]}`}>{score.value}%</p>
                      {hasDelta && (
                        <span
                          className={`mt-2 inline-flex items-center gap-0.5 text-xs font-medium ${
                            isGoodDelta ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
                          }`}
                        >
                          <DeltaIcon className="size-3" aria-hidden="true" />
                          {formatDelta(score.delta)} WoW
                        </span>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Sentiment Trend" description="Last 7 days, by sentiment label" className="lg:col-span-2">
                {pageData.sentimentTrend.length === 0 ? (
                  <EmptyNote>No sentiment history yet.</EmptyNote>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={pageData.sentimentTrend} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />} />
                      <Line type="monotone" dataKey="positive" name="Positive" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="neutral" name="Neutral" stroke={CHART_COLORS.neutral} strokeWidth={2} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="negative" name="Negative" stroke={CHART_COLORS.negative} strokeWidth={2} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <UnavailableCard
                title="Emotion Analysis"
                description="Breakdown of detected emotions"
                reason="Unavailable — this project only has 3-class sentiment (positive/neutral/negative); no emotion classifier is implemented."
              />
            </div>

            <Card title="Trending Hashtags" description="From real captured posts">
              {pageData.trendingHashtags.length === 0 ? (
                <EmptyNote>No hashtags captured yet.</EmptyNote>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pageData.trendingHashtags.map((item) => (
                    <Chip key={item.hashtag}>
                      #{item.hashtag} <span className="ml-1 text-slate-400">{item.mentions.toLocaleString()}</span>
                    </Chip>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Most Influential Posts" description={`${filteredPosts.length} posts matching filters`}>
                {filteredPosts.length === 0 ? (
                  <EmptyNote>No posts match the current filters.</EmptyNote>
                ) : (
                  <ol className="space-y-3">
                    {filteredPosts.map((post, index) => (
                      <li key={post.id} className="rounded-lg border border-line p-3 dark:border-line-dark">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                          <Badge tone="neutral">{post.platform === 'tiktok' ? 'TikTok' : post.platform === 'x' ? 'X' : (post.platform ?? 'Unknown')}</Badge>
                          <Badge tone="neutral">{LANGUAGE_LABELS[post.language] ?? post.language}</Badge>
                          {post.sentiment ? (
                            <Badge tone={SENTIMENT_TONE[post.sentiment]} className="ml-auto">
                              {post.sentiment}
                              {post.sentimentConfidence != null ? ` · ${Math.round(post.sentimentConfidence * 100)}%` : ''}
                            </Badge>
                          ) : (
                            <Badge tone="neutral" className="ml-auto">
                              no rating
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{post.text}</p>
                        <p className="mt-1.5 text-xs text-slate-400">{post.engagement.toLocaleString()} engagements</p>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <UnavailableCard
                title="Region Breakdown"
                description="Sentiment score and mention volume by state"
                reason="Unavailable — no location field is captured during data ingestion, so posts can't be attributed to a state."
              />
            </div>
          </>
        )}
      </AsyncSection>
    </div>
  )
}
