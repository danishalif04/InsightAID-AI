/** Mock fixtures for the Crisis Detection Center (Phase 6). */

export const CRISIS_LEVELS = ['low', 'medium', 'high', 'critical']

export const currentCrisis = {
  level: 'medium',
  riskScore: 42,
}

export const statusCards = [
  { id: 'negative-spike', label: 'Negative Spike', value: '+184%', description: 'vs 24h baseline' },
  { id: 'mention-spike', label: 'Mention Spike', value: '+92%', description: 'vs 24h baseline' },
  { id: 'anomaly-score', label: 'Anomaly Score', value: '6.4 / 10', description: 'model confidence 91%' },
  { id: 'affected-platforms', label: 'Affected Platforms', value: 'TikTok, X', description: '2 of 2 monitored' },
]

export const anomalyTrend = [
  { hour: '00:00', mentions: 210, threshold: 260 },
  { hour: '01:00', mentions: 190, threshold: 258 },
  { hour: '02:00', mentions: 175, threshold: 255 },
  { hour: '03:00', mentions: 168, threshold: 252 },
  { hour: '04:00', mentions: 172, threshold: 250 },
  { hour: '05:00', mentions: 188, threshold: 250 },
  { hour: '06:00', mentions: 240, threshold: 252 },
  { hour: '07:00', mentions: 310, threshold: 255 },
  { hour: '08:00', mentions: 420, threshold: 260 },
  { hour: '09:00', mentions: 480, threshold: 262 },
  { hour: '10:00', mentions: 560, threshold: 265 },
  { hour: '11:00', mentions: 690, threshold: 268 },
  { hour: '12:00', mentions: 820, threshold: 270 },
  { hour: '13:00', mentions: 910, threshold: 272 },
  { hour: '14:00', mentions: 860, threshold: 272 },
  { hour: '15:00', mentions: 780, threshold: 270 },
  { hour: '16:00', mentions: 705, threshold: 268 },
  { hour: '17:00', mentions: 640, threshold: 265 },
  { hour: '18:00', mentions: 590, threshold: 263 },
  { hour: '19:00', mentions: 510, threshold: 262 },
  { hour: '20:00', mentions: 430, threshold: 260 },
  { hour: '21:00', mentions: 360, threshold: 258 },
  { hour: '22:00', mentions: 290, threshold: 256 },
  { hour: '23:00', mentions: 245, threshold: 255 },
]

export const rootCauseSummary = {
  summary:
    'The spike correlates with a viral TikTok video (2.1M views) reporting delayed deliveries in the Klang Valley area. Negative sentiment concentrated around the keywords "delivery" and "refund" between 08:00 and 15:00, coinciding with a 3rd-party courier outage.',
  recommendedActions: [
    'Issue a public acknowledgement on TikTok and X within the next 2 hours.',
    'Escalate the courier outage with the logistics partner and publish an ETA.',
    'Offer proactive refund/credit to affected orders flagged in the last 48 hours.',
    'Monitor the #delivery hashtag hourly until mention volume returns to baseline.',
  ],
}

export const historicalCrisisLog = [
  {
    id: 'log-1',
    date: '2026-06-22',
    level: 'high',
    trigger: 'Payment gateway downtime',
    duration: '3h 40m',
    resolution: 'Resolved — gateway failover restored service',
  },
  {
    id: 'log-2',
    date: '2026-06-08',
    level: 'medium',
    trigger: 'Negative review cluster on X',
    duration: '6h 10m',
    resolution: 'Resolved — customer service follow-up campaign',
  },
  {
    id: 'log-3',
    date: '2026-05-19',
    level: 'critical',
    trigger: 'Product recall announcement backlash',
    duration: '1d 4h',
    resolution: 'Resolved — public statement + refund program',
  },
  {
    id: 'log-4',
    date: '2026-05-02',
    level: 'low',
    trigger: 'Minor shipping delay complaints',
    duration: '2h 05m',
    resolution: 'Resolved — automatic customer notification',
  },
]
