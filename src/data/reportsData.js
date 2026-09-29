/** Mock fixtures for the Reports and Export page (Phase 10). */

export const executiveSummaryPreview =
  'Overall sentiment held steady at 74.2% this week (+6.3% WoW), led by strong TikTok reception of the new product launch. Crisis risk eased to 18% following resolution of the delivery-delay incident. Revenue forecast for the next 30 days sits at RM 75,900 (91% model accuracy), and market opportunity softened slightly as a competitor entered the mid-market segment. Recommended focus: courier capacity in Klang Valley and a bilingual FAQ campaign addressing refund questions.'

export const reportTemplates = [
  {
    id: 'weekly',
    name: 'Weekly Performance Report',
    description: 'Sentiment, mentions, and KPI summary for the past 7 days.',
    lastGenerated: '2026-07-07',
    modes: ['startup', 'ecommerce'],
  },
  {
    id: 'monthly',
    name: 'Monthly Business Report',
    description: 'Full monthly rollup across sentiment, forecasting, and crisis events.',
    lastGenerated: '2026-06-30',
    modes: ['startup', 'ecommerce'],
  },
  {
    id: 'investor',
    name: 'Investor Update',
    description: 'Key metrics and growth narrative formatted for stakeholders.',
    lastGenerated: '2026-06-15',
    modes: ['startup'],
  },
  {
    id: 'health',
    name: 'Startup Health Report',
    description: 'Composite business health score with contributing factors.',
    lastGenerated: '2026-07-01',
    modes: ['startup'],
  },
  {
    id: 'sentiment',
    name: 'Sentiment Deep-Dive',
    description: 'Detailed sentiment breakdown by platform, language, and region.',
    lastGenerated: '2026-07-08',
    modes: ['startup', 'ecommerce'],
  },
  {
    id: 'forecast',
    name: 'Forecast Accuracy Report',
    description: 'Forecast vs. actuals reconciliation and model accuracy audit.',
    lastGenerated: '2026-06-28',
    modes: ['startup', 'ecommerce'],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Analytics Report',
    description: 'Shopee, TikTok Shop and marketplace review performance across your product catalog.',
    lastGenerated: '2026-07-05',
    modes: ['ecommerce'],
  },
]

export const exportFormats = [
  { id: 'pdf', label: 'PDF' },
  { id: 'excel', label: 'Excel' },
  { id: 'csv', label: 'CSV' },
  { id: 'powerpoint', label: 'PowerPoint' },
]
