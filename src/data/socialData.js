/** Mock fixtures for the Social Media Intelligence page (Phase 9). */

export const platformComparison = [
  { platform: 'TikTok', mentionVolume: 11240, virality: 7.8, engagement: 9.4, topLanguage: 'Bahasa Melayu', sentimentScore: 76 },
  { platform: 'X', mentionVolume: 7460, virality: 5.2, engagement: 4.1, topLanguage: 'English', sentimentScore: 68 },
]

export const mentionVolume7d = {
  tiktok: [
    { date: 'Mon', mentions: 1240 },
    { date: 'Tue', mentions: 1380 },
    { date: 'Wed', mentions: 1290 },
    { date: 'Thu', mentions: 1510 },
    { date: 'Fri', mentions: 1670 },
    { date: 'Sat', mentions: 1820 },
    { date: 'Sun', mentions: 1590 },
  ],
  x: [
    { date: 'Mon', mentions: 860 },
    { date: 'Tue', mentions: 910 },
    { date: 'Wed', mentions: 870 },
    { date: 'Thu', mentions: 1020 },
    { date: 'Fri', mentions: 1140 },
    { date: 'Sat', mentions: 1260 },
    { date: 'Sun', mentions: 1080 },
  ],
}

export const trendingHashtags = [
  { hashtag: 'productlaunch', mentions: 3240, platform: 'tiktok' },
  { hashtag: 'insightaid', mentions: 2680, platform: 'tiktok' },
  { hashtag: 'customerservice', mentions: 2110, platform: 'x' },
  { hashtag: 'pricing', mentions: 1870, platform: 'x' },
  { hashtag: 'delivery', mentions: 1420, platform: 'tiktok' },
  { hashtag: 'newfeature', mentions: 1180, platform: 'x' },
]

export const topInfluencers = [
  { handle: '@fatinreviews', platform: 'tiktok', followers: 482000, virality: 8.9, engagement: 12.4, sentiment: 'positive' },
  { handle: '@klsavvy', platform: 'x', followers: 156000, virality: 6.1, engagement: 5.8, sentiment: 'neutral' },
  { handle: '@growthwithzul', platform: 'tiktok', followers: 298000, virality: 7.4, engagement: 9.7, sentiment: 'positive' },
  { handle: '@marketwatchmy', platform: 'x', followers: 91000, virality: 4.2, engagement: 3.9, sentiment: 'negative' },
  { handle: '@dailyunbox', platform: 'tiktok', followers: 214000, virality: 6.8, engagement: 8.2, sentiment: 'positive' },
]

export const topPosts = [
  {
    id: 'sp-1',
    platform: 'tiktok',
    text: 'This dashboard literally caught our sentiment dip before I even noticed complaints coming in 🙌',
    likes: 24800,
    shares: 3600,
  },
  {
    id: 'sp-2',
    platform: 'x',
    text: 'Refund processed in under an hour after I flagged it. Customer service actually reads the feed apparently.',
    likes: 9100,
    shares: 1400,
  },
  {
    id: 'sp-3',
    platform: 'tiktok',
    text: 'Unboxing the new packaging — still think the price is a bit steep for students but quality is solid.',
    likes: 15600,
    shares: 2100,
  },
  {
    id: 'sp-4',
    platform: 'x',
    text: 'Delivery delay again this week. Third time this month, need a real fix not just an apology tweet.',
    likes: 4200,
    shares: 2800,
  },
]
