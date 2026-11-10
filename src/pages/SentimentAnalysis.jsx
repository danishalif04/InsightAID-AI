import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { ArrowDown, ArrowUp, CalendarDays, Download, MessageSquare, Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import { Input, Select } from '@/components/ui/Input'
import ChartTooltip from '@/components/ui/ChartTooltip'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import ChartCard from '@/components/charts/ChartCard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatDelta } from '@/utils/formatters'
import { downloadCsv } from '@/utils/csvExport'
import { getSentimentAnalysisData } from '@/services/sentimentAnalysisService'

const LANGUAGE_LABELS = { en: 'EN', ms: 'MY', zh: 'ZH', 'ms-en': 'MY/EN', unknown: '—' }
const SENTIMENT_TONE = { positive: 'success', neutral: 'neutral', negative: 'danger' }
const SCORE_TONE = {
  positive: 'text-glow-brand',
  neutral: 'text-glow-text/70',
  negative: 'text-danger',
}

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

export default function SentimentAnalysis() {
  const { notify } = useNotifications()
  const [keyword, setKeyword] = useState('')
  const [language, setLanguage] = useState('all')
  const [platform, setPlatform] = useState('all')
  // Index into sentimentScoresSeries, not a date string — null means
  // "no explicit pick yet", which resolves to the latest (today) day below.
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)

  const { status, data, error, reload } = useAsyncData(getSentimentAnalysisData, [])

  const scoresSeries = data?.sentimentScoresSeries ?? []
  const activeIndex = selectedDayIndex != null && selectedDayIndex < scoresSeries.length
    ? selectedDayIndex
    : scoresSeries.length - 1
  const activeDay = scoresSeries[activeIndex] ?? null
  const isLatestDay = activeIndex === scoresSeries.length - 1
  const activeHashtags = (activeDay && data?.trendingHashtagsByDate?.[activeDay.date]) ?? []

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
      <PageHero
        eyebrow="Customer Voice"
        title="Sentiment Analysis"
        highlight="Analysis"
        description="What customers are actually saying, by day, language, and platform — in their own words."
        actions={
          <Button variant="secondary" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <GlowSection>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Search" icon={Search} placeholder="Search posts, keywords..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
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
      </GlowSection>

      {status === 'error' ? (
        <GlowSection>
          <EmptyState icon={MessageSquare} message={error?.message ?? 'Could not load sentiment data.'} actionLabel="Retry" onAction={reload} />
        </GlowSection>
      ) : status !== 'success' || !data ? (
        <GlowSection>
          <p className="text-sm text-glow-text/60">Loading sentiment data…</p>
        </GlowSection>
      ) : scoresSeries.length === 0 ? (
        <GlowSection>
          <EmptyState icon={MessageSquare} message="No sentiment data yet — upload reviews or social data via Dataset Management." />
        </GlowSection>
      ) : (
        <>
          <GlowSection className="flex flex-wrap items-center gap-2">
            <CalendarDays className="size-4 text-glow-text/40" aria-hidden="true" />
            <span className="text-sm font-medium text-glow-text/80">Viewing day:</span>
            <Select className="w-auto" value={String(activeIndex)} onChange={(event) => setSelectedDayIndex(Number(event.target.value))}>
              {scoresSeries.map((day, index) => (
                <option key={day.date} value={index}>
                  {day.label}
                  {index === scoresSeries.length - 1 ? ' (Today)' : ''}
                </option>
              ))}
            </Select>
            {!isLatestDay && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDayIndex(null)}>
                Back to Today
              </Button>
            )}
          </GlowSection>

          {activeDay?.cards == null ? (
            <GlowSection>
              <EmptyState icon={MessageSquare} message={`No sentiment data for ${activeDay?.label} — no rated posts that day.`} />
            </GlowSection>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {activeDay.cards.map((score) => {
                const hasDelta = score.delta != null
                const DeltaIcon = score.delta >= 0 ? ArrowUp : ArrowDown
                const isGoodDelta = score.id === 'negative' ? score.delta <= 0 : score.delta >= 0
                return (
                  <GlowSection key={score.id}>
                    <p className="text-xs font-medium text-glow-text/50">{score.label}</p>
                    <p className={`mt-2 text-3xl font-semibold tabular-nums ${SCORE_TONE[score.id]}`}>{score.value}%</p>
                    {hasDelta && (
                      <span className={`mt-2 inline-flex items-center gap-0.5 text-xs font-medium ${isGoodDelta ? 'text-glow-brand' : 'text-danger'}`}>
                        <DeltaIcon className="size-3" aria-hidden="true" />
                        {formatDelta(score.delta)} vs. 7 days before
                      </span>
                    )}
                  </GlowSection>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Sentiment Trend"
              subtitle="Last 7 days, by sentiment label"
              readingGuide="Pick a day above to see that day's exact split; use this chart to spot when sentiment started shifting."
              surface="glow"
              height="lg"
              ariaLabel="Sentiment trend line chart over the last 7 days, positive, neutral, and negative"
              className="lg:col-span-2"
              status={status}
              data={data}
              error={error}
              reload={reload}
              emptyWhen={(d) => d.sentimentTrend.length === 0}
              emptyMessage="No sentiment history yet."
            >
              {(d) => (
                <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
                  <LineChart data={d.sentimentTrend} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />} />
                    {activeDay && !isLatestDay && (
                      <ReferenceLine x={activeDay.label} stroke={CHART_COLORS.forecast} strokeDasharray="4 4" label={{ value: 'Viewing', position: 'top', fontSize: 11, fill: CHART_COLORS.forecast }} />
                    )}
                    <Line type="monotone" dataKey="positive" name="Positive" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="neutral" name="Neutral" stroke={CHART_COLORS.neutral} strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="negative" name="Negative" stroke={CHART_COLORS.negative} strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <GlowSection title="Emotion Analysis" description="Breakdown of detected emotions">
              <p className="text-sm italic text-glow-text/50">
                Unavailable — this project only has 3-class sentiment (positive/neutral/negative); no emotion classifier is implemented.
              </p>
            </GlowSection>
          </div>

          <GlowSection title="Trending Hashtags" description={`From real captured posts — ${activeDay?.label ?? 'selected day'}${isLatestDay ? ' (Today)' : ''}`}>
            {activeHashtags.length === 0 ? (
              <EmptyState icon={MessageSquare} message={`No hashtags captured on ${activeDay?.label ?? 'this day'}.`} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeHashtags.map((item) => (
                  <Chip key={item.hashtag}>
                    #{item.hashtag} <span className="ml-1 text-glow-text/40">{item.mentions.toLocaleString()}</span>
                  </Chip>
                ))}
              </div>
            )}
          </GlowSection>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GlowSection title="Most Influential Posts" description={`${filteredPosts.length} posts matching filters`} className="lg:col-span-1">
              {filteredPosts.length === 0 ? (
                <EmptyState icon={MessageSquare} message="No posts match the current filters." />
              ) : (
                <ol className="space-y-3">
                  {filteredPosts.map((post, index) => (
                    <li key={post.id} className="rounded-xl border border-glow-border bg-glow-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-glow-text/40">#{index + 1}</span>
                        <Badge tone="neutral">{post.platform === 'tiktok' ? 'TikTok' : post.platform === 'x' ? 'X' : (post.platform ?? 'Unknown')}</Badge>
                        <Badge tone="neutral">{LANGUAGE_LABELS[post.language] ?? post.language}</Badge>
                        {post.sentiment ? (
                          <Badge tone={SENTIMENT_TONE[post.sentiment]} className="ml-auto">
                            {post.sentiment}
                            {post.sentimentConfidence != null ? ` · ${Math.round(post.sentimentConfidence * 100)}%` : ''}
                          </Badge>
                        ) : (
                          <Badge tone="neutral" className="ml-auto">no rating</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-glow-text/80">{post.text}</p>
                      <p className="mt-1.5 text-xs text-glow-text/40">{post.engagement.toLocaleString()} engagements</p>
                    </li>
                  ))}
                </ol>
              )}
            </GlowSection>

            <GlowSection title="Region Breakdown" description="Sentiment score and mention volume by state">
              <p className="text-sm italic text-glow-text/50">
                Unavailable — no location field is captured during data ingestion, so posts can't be attributed to a state.
              </p>
            </GlowSection>
          </div>
        </>
      )}
    </div>
  )
}
