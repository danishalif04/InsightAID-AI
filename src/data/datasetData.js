/** Mock fixtures for the Dataset Management page (Phase 11). */

export const apiConnections = [
  { id: 'tiktok', name: 'TikTok API', status: 'connected', lastSync: '5 minutes ago' },
  { id: 'x', name: 'X API', status: 'connected', lastSync: '12 minutes ago' },
  { id: 'internal', name: 'Internal Database', status: 'connected', lastSync: '1 minute ago' },
]

export const storageUsage = {
  usedGB: 34.2,
  totalGB: 100,
  languageBreakdown: [
    { language: 'English', code: 'en', percent: 48 },
    { language: 'Bahasa Melayu', code: 'ms', percent: 36 },
    { language: 'Mandarin', code: 'zh', percent: 16 },
  ],
}

export const recentImports = [
  { id: 'imp-1', file: 'tiktok_mentions_jul.csv', size: 18_400_000, records: 42_180, quality: 96, status: 'success' },
  { id: 'imp-2', file: 'x_mentions_jul.json', size: 9_800_000, records: 21_540, quality: 91, status: 'success' },
  { id: 'imp-3', file: 'customer_survey_q2.xlsx', size: 2_100_000, records: 1_240, quality: 88, status: 'success' },
  { id: 'imp-4', file: 'sales_transactions_jun.csv', size: 31_500_000, records: 68_920, quality: 74, status: 'warning' },
  { id: 'imp-5', file: 'support_tickets_jun.json', size: 4_300_000, records: 3_610, quality: 99, status: 'success' },
]
