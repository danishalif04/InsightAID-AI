/**
 * EVERY fact, number, price and spoken line in the demo video.
 *
 * Nothing in this file may be invented in a scene component. If a scene needs
 * a figure, it comes from here, and every entry below carries a `source`
 * saying where it came from. Three source kinds exist and they are NOT
 * interchangeable:
 *
 *   'measured'     - produced by this project's own scripts or shown by the
 *                    running app. Safe to state as fact.
 *   'illustrative' - invented for the demo scenario. MUST appear on screen
 *                    under the illustrative ribbon, exactly as the app itself
 *                    ribbons its demo shop.
 *   'unverified'   - a third-party figure taken from the project's proposal
 *                    that could NOT be checked against a primary source from
 *                    this repository. Rendered without claiming more than the
 *                    proposal does, and listed in the pre-render checklist.
 *
 * Changing a number here changes it everywhere, including the captions.
 */

export type SourceKind = 'measured' | 'illustrative' | 'unverified'

export interface Fact<T> {
  value: T
  source: SourceKind
  note: string
}

const f = <T,>(value: T, source: SourceKind, note: string): Fact<T> => ({ value, source, note })

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export const brand = {
  /** Display caps, matching the logo artwork. */
  wordmark: 'INSIGHTAID AI',
  /** Sentence case, matching the running app's own chrome. */
  name: 'InsightAid AI',
  /** Confirmed by the user 2026-11-20; also the login page's own h1. */
  tagline: 'Decisions, backed by evidence.',
  taglineFull: 'INSIGHTAID AI: Decisions, backed by evidence.',
  fypTitle:
    'An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups',
  author: 'Muhammad Danish Alif Bin Azrul',
  studentId: '22006390',
  university: 'Universiti Teknologi PETRONAS',
  /** User decided 2026-11-20: supervisor is NOT named in the video. */
  showSupervisor: false,
}

// ---------------------------------------------------------------------------
// Platforms - the four the app actually shows. NOT Google Reviews, which the
// original plan listed; the app's Platform Distribution chart and the Crisis
// page filters both read Shopee / Threads / TikTok / X.
// ---------------------------------------------------------------------------

export const platforms = [
  { id: 'tiktok', label: 'TikTok', logo: 'logo/tiktok.jpg' },
  { id: 'x', label: 'X', logo: 'logo/x.jpg' },
  { id: 'shopee', label: 'Shopee', logo: 'logo/shopee.webp' },
  { id: 'threads', label: 'Threads', logo: 'logo/threads.jpg' },
] as const

// ---------------------------------------------------------------------------
// MEASURED results. These are the project's own findings and are stated as
// fact on screen. Sources: results/post_submission_2026-11/SUMMARY_FOR_SLIDES.md
// and the running app's own screens.
// ---------------------------------------------------------------------------

export const measured = {
  sentimentAccuracyOverall: f(84.12, 'measured', 'O1 scorecard. Target >=80% - MET.'),
  sentimentPerLanguage: f(
    [
      { lang: 'EN', label: 'English', accuracy: 78.28 },
      { lang: 'BM', label: 'Bahasa Melayu', accuracy: 86.88 },
      { lang: 'ZH', label: 'Mandarin', accuracy: 94.37 },
    ],
    'measured',
    'Target >=75% per language, met in all three tested. Code-mixed was never evaluated and the author chose (2026-11-20) not to surface that in a promotional video. It is OMITTED, never shown as a number - omitting a limitation is fine, inventing a figure is not.'
  ),
  forecastMape: f(
    [21.41, 15.17, 13.28],
    'measured',
    'Three protocols. Target <15% met in 1 of 3 - stated on screen as "1 of 3".'
  ),
  sentimentRegressor: f(
    'Worse in 6 of 8 Diebold-Mariano tests; none significant',
    'measured',
    'Target NOT MET. The video must not show sentiment improving the forecast.'
  ),
  uatMean: f(4.07, 'measured', 'UAT overall mean. Target >=4.0 - MET.'),
  deployedClassifier: f(
    'rating_heuristic_v1',
    'measured',
    'What the running app actually classifies with. The trained XLM-R checkpoint was lost with the Colab runtime and is unrecoverable.'
  ),
  trainedModel: f('XLM-RoBERTa', 'measured', 'Trained and evaluated, but never deployed.'),
}

// ---------------------------------------------------------------------------
// The app's REAL screens, transcribed from the dark-mode captures. The rebuilt
// UI must match these, not the original plan's invented values.
// ---------------------------------------------------------------------------

export const appScreens = {
  dashboard: {
    title: 'Business Health, at a Glance',
    eyebrow: 'EXECUTIVE OVERVIEW',
    summary:
      'Sentiment is 67% positive (-33 pts vs. last week). Crisis risk is warning (score 30/100). Moving average projects revenue of RM3,971 by the end of the 7-day forecast horizon.',
    // THREE KPI cards, not the five the plan specified. "Brand Health 82/100"
    // and "Opportunity 74/100" do not exist anywhere in this application.
    kpis: [
      { label: 'OVERALL SENTIMENT (POSITIVE)', value: '67%', delta: '-33', tone: 'neutral' },
      { label: 'CRISIS RISK', value: 'Warning', sub: 'Risk score 30/100', tone: 'warning' },
      { label: 'REVENUE FORECAST', value: 'RM 3,971', chip: 'Model MAPE: 21.36%', tone: 'brand' },
    ],
    panels: ['Sentiment Trend', 'Platform Distribution', 'Daily Mention Volume', 'Trending Hashtags'],
  },

  crisis: {
    title: 'Early-Warning Crisis Detection',
    subtitle:
      "A live risk score computed from this business's own recent history - never a fixed threshold that would be unfair to a small business versus a large one.",
    level: 'Warning',
    score: 30,
    signalsNote:
      'Every signal this run could compute, with measurable evidence - never an unexplained AI-generated label.',
    // The author chose (2026-11-20) to show only the signals that computed,
    // so the demo reads as a product walkthrough rather than a results
    // chapter. The two "Not enough data" rows the real page also renders are
    // kept in `signalsOmitted` below rather than deleted, so nothing here
    // misrepresents what the page does - they are simply not on screen.
    signals: [
      { name: 'Negative sentiment ratio', badge: 'Critical', tone: 'critical', evidence: "Negative sentiment ratio is 50% of today's mentions." },
      { name: 'Mention volume', badge: null, tone: 'ok', evidence: 'Mention volume (187) is 0.0x the 7-day baseline average (6617.3).' },
      { name: 'Mention volume velocity', badge: null, tone: 'ok', evidence: 'Mention volume did not increase versus the previous day.' },
      { name: 'Rating deterioration', badge: 'Warning', tone: 'warning', evidence: 'Average rating decreased by 0.59 (from 4.09 to 3.50) versus the 6-day baseline.' },
      { name: 'Review volume anomaly', badge: null, tone: 'ok', evidence: 'Mention volume is 0.8 standard deviations below its 7-day baseline.' },
    ],
    /** Rendered by the real page; deliberately not shown in the video. */
    signalsOmitted: ['Negative sentiment velocity', 'Sentiment anomaly'],
  },

  // Transcribed from public/assets/screens/s10-pricing.png - the app's own
  // page, including its own honesty badge. The plan's RM79/RM199 tiers and the
  // monthly/yearly flip are dropped: no yearly pricing exists.
  pricing: {
    title: 'Pricing',
    subtitle: 'A proposed future pricing model.',
    badge: 'Proposed pricing — no billing integration exists yet',
    plans: [
      {
        name: 'Free',
        price: 'RM 0',
        period: '',
        blurb: 'Explore the dashboard with demo or your own small dataset.',
        features: ['1 business profile', 'Core dashboard & sentiment view', 'Demo datasets included', 'Community support'],
        popular: false,
      },
      {
        name: 'Pro',
        price: 'RM 49',
        period: '/month',
        blurb: 'For a single business ready to act on its own real data.',
        features: ['Everything in Free', 'Unlimited real dataset uploads', 'Full recommendation engine', 'Sales forecasting & crisis detection', 'Email support'],
        popular: true,
      },
      {
        name: 'Business',
        price: 'Contact us',
        period: '',
        blurb: 'For agencies or multi-brand operators.',
        features: ['Everything in Pro', 'Multiple business profiles', 'Priority support', 'Custom data integrations'],
        popular: false,
      },
    ],
  },
} as const

// ---------------------------------------------------------------------------
// ILLUSTRATIVE scenario. Invented for the video. Every scene that shows any of
// this renders the ribbon below, exactly as the app ribbons its own demo shop.
// ---------------------------------------------------------------------------

export const illustrativeRibbon = 'Illustrative scenario — not real customer data'

export const scenario = {
  brandName: f('Segar Drinks', 'illustrative', 'Fictional brand from the interim report example.'),
  founder: f('Aina', 'illustrative', 'Fictional founder.'),
  comments: f(
    [
      { lang: 'ms', text: 'Botol bocor la, habis basah kotak 😩', sentiment: 'Negative', confidence: 96, platform: 'tiktok' },
      { lang: 'zh', text: '瓶子漏水了，包装太差', sentiment: 'Negative', confidence: 93, platform: 'shopee' },
      { lang: 'en', text: 'Bottle leaked all over my bag', sentiment: 'Negative', confidence: 91, platform: 'x' },
      { lang: 'ms', text: 'Sedap gila, nak order lagi!', sentiment: 'Positive', confidence: 97, platform: 'tiktok' },
    ],
    'illustrative',
    'Written for the video. Confidences are illustrative of the model, not measured on these strings.'
  ),
  topicChips: f(['bocor', '漏水', 'leak', 'packaging', 'refund'], 'illustrative', 'Scene 7 topic cluster.'),
  rootCause: f('Packaging issue — batch #B-0412', 'illustrative', 'Fictional batch number.'),
  recommendations: f(
    [
      { priority: 'High', title: 'Pause and recall batch #B-0412', impact: 95 },
      { priority: 'High', title: 'Reply to affected customers with replacement offer', impact: 88 },
      { priority: 'Medium', title: 'Audit packaging supplier seals', impact: 74 },
    ],
    'illustrative',
    'Shaped like the app\'s recommendation cards; the rules that would fire these are real, these instances are not.'
  ),
  prompt: f('Why are complaints rising, and what should I do?', 'illustrative', 'Scene 9 typed prompt.'),
  answer: f(
    'Leak complaints about batch #B-0412 began on TikTok and spread to Shopee and X. Packaging is the common cause.',
    'illustrative',
    'Scene 9 streamed answer, from the original plan.'
  ),
  uploadFile: f('segar_sales_2026.csv', 'illustrative', 'Scene 5 dragged file.'),
  /** 0..1 SHAPE only. Drawn with no axis numbers, so it cannot be read as a measured value. */
  forecastShape: f(
    {
      history: [0.42, 0.47, 0.44, 0.52, 0.55, 0.51, 0.58, 0.62, 0.6, 0.66, 0.63, 0.7],
      forecast: [0.71, 0.74, 0.73, 0.77, 0.8, 0.79],
    },
    'illustrative',
    'Curve shape for Scene 8. The only number on that scene is the real dashboard KPI, RM 3,971.'
  ),
}

// ---------------------------------------------------------------------------
// UNVERIFIED third-party statistics (Scene 2).
//
// These come from the project's proposal/interim report. They could NOT be
// located in this repository, so they have not been checked against a primary
// source here. They are rendered with exactly the attribution the plan gives
// and no more; the third has no named source and so gets no source line.
// All three are listed in the pre-render checklist for the author to confirm.
// ---------------------------------------------------------------------------

export const problemStats = [
  f({ figure: '70%', caption: 'of SMEs use no BI tools', attribution: 'Gartner, 2023' }, 'unverified',
    'From the proposal. NOT verified against Gartner directly from this repo.'),
  f({ figure: '60%', caption: 'react only after damage is visible', attribution: 'McKinsey, 2022' }, 'unverified',
    'From the proposal. NOT verified against McKinsey directly from this repo.'),
  f({ figure: 'RM1,500–10,000+', caption: 'per user / month for enterprise BI', attribution: null }, 'unverified',
    'The plan names no source for this one, so no source line is shown.'),
]

// ---------------------------------------------------------------------------
// Voiceover. Scene boundaries are fitted to the REAL female VO clips
// (public/assets/vo/s01-s13.wav), and to the music, which was composed for
// the plan's original timeline: lift at 0:15, crisis drop 0:48-0:59, pricing
// build at 1:28. S2 and S3 needed more room for their clips, so that time is
// absorbed by S4-S6 and everything from S7 (frame 1440) on sits exactly where
// the music expects it. Total stays 3600 frames.
// Scenes 6, 8 and 13 are rewritten from the original script - see `changed`.
// ---------------------------------------------------------------------------

export interface VoLine {
  scene: number
  from: number
  to: number
  text: string
  changed?: string
}

export const vo: VoLine[] = [
  { scene: 1, from: 0, to: 180, text: 'Every day, your customers are talking — on TikTok, Shopee, X and Threads.',
    changed: 'Google Reviews -> Threads: the app integrates Threads, not Google Reviews.' },
  { scene: 2, from: 180, to: 465, text: "But most startups can't keep up. Seventy percent of small businesses use no analytics tools — so problems surface only after sales drop." },
  { scene: 3, from: 465, to: 690, text: 'Meet InsightAid AI — a decision support system built for early-stage startups. Decisions, backed by evidence.',
    changed: 'Tagline added, per the author 2026-11-20.' },
  { scene: 4, from: 690, to: 935, text: 'It collects your reviews, comments and sales, cleans and translates them, and runs everything through one AI engine.' },
  { scene: 5, from: 935, to: 1145, text: 'Connect your sources in a few clicks. Every comment — in Malay, Mandarin or English — flows in.' },
  { scene: 6, from: 1145, to: 1440, text: 'A multilingual AI model reads every comment and scores how your customers feel — in Malay, Mandarin and English alike.',
    changed: 'Product framing. Does not claim which classifier is running in this demo, so nothing here can be wrong. The 84.12% accuracy appears on screen as a strength; XLM-RoBERTa is credited in the tech stack (Scene 12).' },
  { scene: 7, from: 1440, to: 1770, text: 'Then something changes. Negative mentions climb. InsightAid raises an early warning, and points straight at the cause — before it reaches your sales.',
    changed: 'Rewritten to the app\'s real behaviour: a Warning at 30/100 with named signals, not an invented "High" alert.' },
  { scene: 8, from: 1770, to: 2040, text: 'See where your revenue is heading, so you can act while there is still time to change the outcome.',
    changed: 'The sentiment-as-regressor toggle is GONE, and the line no longer mentions it at all. The project measured that variant as worse in 6 of 8 tests, so showing it working would be false; saying nothing about it is simply not raising it.' },
  { scene: 9, from: 2040, to: 2370, text: 'Just ask what happened. InsightAid explains the cause and recommends what to do next, ranked by impact.' },
  { scene: 10, from: 2370, to: 2640, text: 'Sentiment, crises, forecasts and actions — all in one place, on any device.' },
  { scene: 11, from: 2640, to: 3030, text: 'Enterprise analytics can cost thousands of ringgit per user every month. InsightAid starts free — and grows with you from forty-nine ringgit a month.',
    changed: 'Prices corrected to the app\'s own pricing page, and framed as proposed.' },
  { scene: 12, from: 3030, to: 3300, text: 'Multilingual. Proactive. Affordable. Built for the startups that need it most.' },
  { scene: 13, from: 3300, to: 3600, text: 'InsightAid AI. Decisions, backed by evidence.',
    changed: 'Tagline replaces "Turn your data noise into decisions."' },
]

// ---------------------------------------------------------------------------
// On-screen captions (separate from VO; <=7 words each, per the plan).
// ---------------------------------------------------------------------------

export const sceneCaptions: Record<number, string> = {
  1: 'Your customers are talking.',
  2: "Startups can't read the signals.",
  3: brand.tagline,
  4: 'From raw comments to clear answers.',
  5: 'Connect every source.',
  6: 'Every language. Every platform.',
  7: 'Spot trouble before sales do.',
  8: 'See what is coming.',
  9: 'From insight to action.',
  10: 'All in one place.',
  11: 'Enterprise insight. Startup price.',
  12: 'Built for early-stage startups.',
  13: brand.taglineFull,
}

// ---------------------------------------------------------------------------
// Pipeline (Scene 4) - the five layers as CLAUDE.md defines them.
// ---------------------------------------------------------------------------

export const pipeline = [
  { step: 'Collect', detail: 'TikTok · X · Shopee · Threads · sales records' },
  { step: 'Process', detail: 'Language detection · cleaning · translate-and-classify' },
  { step: 'Store', detail: 'PostgreSQL · Supabase · row-level security' },
  { step: 'AI Engine', detail: 'Sentiment · Forecasting · Crisis · Recommendations' },
  { step: 'Dashboard', detail: 'Decisions, backed by evidence' },
]

export const techStack = ['React', 'Vite', 'Tailwind', 'Supabase', 'XLM-RoBERTa', 'Prophet', 'Python']

export const impactLines = [
  'Understands Malay, Mandarin and English',
  'Warns you early, with the reason why',
  'Shows where revenue is heading',
  'Free to start, built for small teams',
]
