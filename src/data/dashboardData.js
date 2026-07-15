/** Mock fixtures for the Executive Dashboard (Phase 4). Replace with API data in the backend-integration phase. */

export const executiveSummary = {
  headline:
    'Overall sentiment is trending positive at 74.2% (+6.3% WoW), driven by strong TikTok reception of the new product launch. Crisis risk has eased to 18%, but market opportunity softened slightly as a competitor entered the mid-market segment.',
  generatedAt: '2026-07-10T08:00:00+08:00',
}

export const kpis = [
  {
    id: 'sentiment',
    label: 'Overall Sentiment',
    value: 74.2,
    display: '74.2%',
    delta: 6.3,
    forecast: '78.5%',
    confidence: 88,
  },
  {
    id: 'crisis',
    label: 'Crisis Risk',
    value: 18,
    display: '18%',
    delta: -4.1,
    forecast: '14%',
    confidence: 91,
    invertDelta: true,
  },
  {
    id: 'health',
    label: 'Business Health',
    value: 82,
    display: '82 / 100',
    delta: 3.2,
    forecast: '85 / 100',
    confidence: 84,
  },
  {
    id: 'revenue',
    label: 'Revenue Forecast',
    value: 67500,
    display: 'RM 67,500',
    delta: 12.4,
    forecast: 'RM 75,900',
    confidence: 79,
  },
  {
    id: 'opportunity',
    label: 'Market Opportunity',
    value: 61,
    display: '61 / 100',
    delta: -2.5,
    forecast: '58 / 100',
    confidence: 72,
  },
]

export const sentimentTrend = [
  { date: 'Jun 27', positive: 58, neutral: 28, negative: 14 },
  { date: 'Jun 28', positive: 61, neutral: 26, negative: 13 },
  { date: 'Jun 29', positive: 59, neutral: 29, negative: 12 },
  { date: 'Jun 30', positive: 64, neutral: 25, negative: 11 },
  { date: 'Jul 01', positive: 67, neutral: 22, negative: 11 },
  { date: 'Jul 02', positive: 63, neutral: 25, negative: 12 },
  { date: 'Jul 03', positive: 69, neutral: 21, negative: 10 },
  { date: 'Jul 04', positive: 71, neutral: 20, negative: 9 },
  { date: 'Jul 05', positive: 68, neutral: 22, negative: 10 },
  { date: 'Jul 06', positive: 72, neutral: 19, negative: 9 },
  { date: 'Jul 07', positive: 70, neutral: 21, negative: 9 },
  { date: 'Jul 08', positive: 73, neutral: 19, negative: 8 },
  { date: 'Jul 09', positive: 75, neutral: 17, negative: 8 },
  { date: 'Jul 10', positive: 74, neutral: 18, negative: 8 },
]

export const platformDistribution = [
  { platform: 'TikTok', value: 62 },
  { platform: 'X', value: 38 },
]

export const dailyMentionVolume = [
  { date: 'Mon', tiktok: 1240, x: 860 },
  { date: 'Tue', tiktok: 1380, x: 910 },
  { date: 'Wed', tiktok: 1290, x: 870 },
  { date: 'Thu', tiktok: 1510, x: 1020 },
  { date: 'Fri', tiktok: 1670, x: 1140 },
  { date: 'Sat', tiktok: 1820, x: 1260 },
  { date: 'Sun', tiktok: 1590, x: 1080 },
]

export const trendingKeywords = [
  { keyword: 'productlaunch', mentions: 3240 },
  { keyword: 'customerservice', mentions: 2110 },
  { keyword: 'pricing', mentions: 1870 },
  { keyword: 'delivery', mentions: 1420 },
  { keyword: 'newfeature', mentions: 1180 },
  { keyword: 'refund', mentions: 640 },
]

export const recentAlerts = [
  {
    id: 'alert-1',
    level: 'high',
    title: 'Negative sentiment spike detected on X',
    timestamp: '2026-07-10T06:45:00+08:00',
    description: 'Mentions of "delivery delay" rose 210% in the last 4 hours.',
  },
  {
    id: 'alert-2',
    level: 'medium',
    title: 'Unusual mention volume on TikTok',
    timestamp: '2026-07-09T21:10:00+08:00',
    description: 'A creator video crossed 500K views, driving a 3x mention surge.',
  },
  {
    id: 'alert-3',
    level: 'low',
    title: 'Competitor pricing campaign detected',
    timestamp: '2026-07-09T14:20:00+08:00',
    description: 'Social listening flagged a new competitor promotion in the mid-market segment.',
  },
]

export const latestRecommendations = [
  {
    id: 'rec-1',
    category: 'Marketing',
    title: 'Launch a TikTok reply campaign addressing delivery concerns',
    impact: 82,
    priority: 'high',
  },
  {
    id: 'rec-2',
    category: 'Operations',
    title: 'Increase courier capacity in Klang Valley for the next 2 weeks',
    impact: 76,
    priority: 'high',
  },
  {
    id: 'rec-3',
    category: 'Product',
    title: 'Fast-track the requested packaging size variant',
    impact: 64,
    priority: 'medium',
  },
]
