/** Mock fixtures for the Sentiment Analysis page (Phase 5). */

export const sentimentScores = [
  { id: 'positive', label: 'Positive', value: 58.4, delta: 4.2 },
  { id: 'neutral', label: 'Neutral', value: 26.1, delta: -1.8 },
  { id: 'negative', label: 'Negative', value: 15.5, delta: -2.4 },
]

export const sentimentTrend = [
  { date: 'Jul 04', positive: 62, neutral: 24, negative: 14 },
  { date: 'Jul 05', positive: 59, neutral: 27, negative: 14 },
  { date: 'Jul 06', positive: 64, neutral: 24, negative: 12 },
  { date: 'Jul 07', positive: 61, neutral: 26, negative: 13 },
  { date: 'Jul 08', positive: 66, neutral: 22, negative: 12 },
  { date: 'Jul 09', positive: 68, neutral: 21, negative: 11 },
  { date: 'Jul 10', positive: 65, neutral: 23, negative: 12 },
]

export const emotionAnalysis = [
  { emotion: 'Joy', value: 38 },
  { emotion: 'Trust', value: 24 },
  { emotion: 'Anticipation', value: 16 },
  { emotion: 'Surprise', value: 10 },
  { emotion: 'Anger', value: 7 },
  { emotion: 'Sadness', value: 5 },
]

export const influentialPosts = [
  {
    id: 'post-1',
    platform: 'tiktok',
    language: 'en',
    text: 'Just tried the new InsightAid dashboard demo and honestly the crisis detection alerts are a game changer for my small business.',
    sentiment: 'positive',
    confidence: 0.94,
    engagement: 18200,
    mode: 'startup',
  },
  {
    id: 'post-2',
    platform: 'x',
    language: 'ms',
    text: 'Penghantaran lambat minggu ni, harap boleh diperbaiki secepat mungkin sebab pelanggan dah mula merungut.',
    sentiment: 'negative',
    confidence: 0.87,
    engagement: 6400,
    mode: 'ecommerce',
  },
  {
    id: 'post-3',
    platform: 'tiktok',
    language: 'zh',
    text: '这个产品的包装设计很好看,但是价格对学生党来说有点贵。',
    sentiment: 'neutral',
    confidence: 0.71,
    engagement: 4100,
    mode: 'ecommerce',
  },
  {
    id: 'post-4',
    platform: 'x',
    language: 'en',
    text: 'Customer support resolved my refund in under an hour. Genuinely impressed with the response time.',
    sentiment: 'positive',
    confidence: 0.91,
    engagement: 9800,
    mode: 'startup',
  },
  {
    id: 'post-5',
    platform: 'tiktok',
    language: 'ms',
    text: 'Produk baru ni memang power, dah order untuk seluruh keluarga!',
    sentiment: 'positive',
    confidence: 0.89,
    engagement: 15300,
    mode: 'ecommerce',
  },
  {
    id: 'post-6',
    platform: 'x',
    language: 'zh',
    text: '客服态度冷淡,问题也没有真正解决,有点失望。',
    sentiment: 'negative',
    confidence: 0.82,
    engagement: 3200,
    mode: 'startup',
  },
  {
    id: 'post-7',
    platform: 'tiktok',
    language: 'en',
    text: 'Ordered via our Shopee store and it arrived a day early with a handwritten thank-you note — small touches like this keep me coming back.',
    sentiment: 'positive',
    confidence: 0.9,
    engagement: 11400,
    mode: 'ecommerce',
  },
]

export const regionBreakdown = [
  { state: 'Selangor', score: 78, mentions: 4820 },
  { state: 'Kuala Lumpur', score: 74, mentions: 4310 },
  { state: 'Penang', score: 69, mentions: 2680 },
  { state: 'Johor', score: 66, mentions: 2150 },
  { state: 'Sabah', score: 71, mentions: 1240 },
  { state: 'Sarawak', score: 73, mentions: 1080 },
  { state: 'Perak', score: 62, mentions: 940 },
]
