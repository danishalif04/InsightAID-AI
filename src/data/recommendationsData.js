/** Mock fixtures for the AI Recommendation Engine (Phase 8). */

export const CATEGORIES = ['Marketing', 'Operations', 'Customer Service', 'Product', 'Growth', 'Investment']

export const recommendations = [
  {
    id: 'rec-1',
    category: 'Marketing',
    priority: 'high',
    title: 'Launch a TikTok reply campaign addressing delivery concerns',
    impactScore: 82,
    confidence: 88,
    roi: 34,
    timeframe: '1–2 weeks',
    modes: ['startup', 'ecommerce'],
    reasoning:
      'Sentiment analysis shows 68% of negative mentions this week reference delivery delays, concentrated on TikTok. A direct, visible response from the brand has historically reduced negative sentiment velocity by 40% within 72 hours in similar cases.',
    actionChecklist: [
      { id: 'a1', label: 'Draft public response acknowledging delays', done: true },
      { id: 'a2', label: 'Record short-form video reply from founder', done: false },
      { id: 'a3', label: 'Pin response to top of TikTok profile', done: false },
    ],
  },
  {
    id: 'rec-2',
    category: 'Operations',
    priority: 'high',
    title: 'Increase courier capacity in Klang Valley for the next 2 weeks',
    impactScore: 76,
    confidence: 91,
    roi: 21,
    timeframe: '3–5 days',
    modes: ['startup', 'ecommerce'],
    reasoning:
      'Mention volume for "late delivery" is 3.2x baseline in the Klang Valley region specifically, correlating with a known 3rd-party courier outage. Forecast models project continued order volume growth, making capacity the binding constraint.',
    actionChecklist: [
      { id: 'b1', label: 'Contact backup courier partner', done: false },
      { id: 'b2', label: 'Reallocate 20% of orders to alternate provider', done: false },
    ],
  },
  {
    id: 'rec-3',
    category: 'Product',
    priority: 'medium',
    title: 'Fast-track the requested packaging size variant',
    impactScore: 64,
    confidence: 73,
    roi: 18,
    timeframe: '4–6 weeks',
    modes: ['ecommerce'],
    reasoning:
      'A recurring request for a smaller packaging size appears in 12% of neutral/positive posts, primarily from students citing price sensitivity. Estimated addressable segment: ~8,000 mentions/month.',
    actionChecklist: [
      { id: 'c1', label: 'Validate unit economics for smaller SKU', done: false },
      { id: 'c2', label: 'Run a limited regional pilot', done: false },
    ],
  },
  {
    id: 'rec-4',
    category: 'Customer Service',
    priority: 'medium',
    title: 'Add a Mandarin-speaking agent to the support rotation',
    impactScore: 58,
    confidence: 80,
    roi: 14,
    timeframe: '2–3 weeks',
    modes: ['startup', 'ecommerce'],
    reasoning:
      'Mandarin-language mentions show the lowest average sentiment (61%) of the three tracked languages, with recurring complaints about response clarity. No current agent is tagged as a Mandarin speaker in support logs.',
    actionChecklist: [
      { id: 'd1', label: 'Post internal job requisition', done: false },
      { id: 'd2', label: 'Add Mandarin macros to help desk', done: true },
    ],
  },
  {
    id: 'rec-5',
    category: 'Growth',
    priority: 'low',
    title: 'Partner with a mid-tier TikTok creator in the food/lifestyle niche',
    impactScore: 51,
    confidence: 66,
    roi: 27,
    timeframe: '3–4 weeks',
    modes: ['startup', 'ecommerce'],
    reasoning:
      'Organic mentions from creators with 50K–200K followers show 2.1x higher engagement-to-sentiment conversion than macro-influencer posts, at a fraction of typical campaign cost.',
    actionChecklist: [
      { id: 'e1', label: 'Shortlist 5 candidate creators', done: false },
      { id: 'e2', label: 'Draft partnership brief', done: false },
    ],
  },
  {
    id: 'rec-6',
    category: 'Investment',
    priority: 'low',
    title: 'Allocate budget toward automated crisis-response tooling',
    impactScore: 47,
    confidence: 70,
    roi: 12,
    timeframe: '1–2 months',
    modes: ['startup'],
    reasoning:
      'The last three crisis events took an average of 3.5 hours to detect manually before this dashboard was in place. Automating the initial response draft could reduce time-to-acknowledgement, which is the single strongest lever on crisis sentiment recovery.',
    actionChecklist: [
      { id: 'f1', label: 'Scope automation requirements with engineering', done: false },
      { id: 'f2', label: 'Estimate implementation cost', done: false },
    ],
  },
]

/** Extra recommendations revealed by "Generate New" to simulate on-demand AI generation. */
export const recommendationReserve = [
  {
    id: 'rec-7',
    category: 'Marketing',
    priority: 'medium',
    title: 'Run a bilingual (EN/MY) FAQ carousel addressing refund policy',
    impactScore: 55,
    confidence: 77,
    roi: 16,
    timeframe: '1 week',
    modes: ['ecommerce'],
    reasoning:
      'Refund-related questions appear in 9% of comments across both English and Bahasa Melayu posts, most going unanswered publicly. A pinned FAQ reduces repeat questions and support load.',
    actionChecklist: [
      { id: 'g1', label: 'Draft FAQ copy in both languages', done: false },
      { id: 'g2', label: 'Design carousel graphics', done: false },
    ],
  },
  {
    id: 'rec-8',
    category: 'Product',
    priority: 'low',
    title: 'Introduce order tracking notifications via WhatsApp',
    impactScore: 49,
    confidence: 68,
    roi: 11,
    timeframe: '3 weeks',
    modes: ['ecommerce'],
    reasoning:
      'Proactive delivery updates correlate with a 22% reduction in "where is my order" mentions in comparable markets, easing pressure on both sentiment and support volume.',
    actionChecklist: [{ id: 'h1', label: 'Evaluate WhatsApp Business API integration', done: false }],
  },
  {
    id: 'rec-9',
    category: 'Growth',
    priority: 'medium',
    title: 'Set up a lightweight weekly metrics review with your co-founders',
    impactScore: 52,
    confidence: 72,
    roi: 15,
    timeframe: '1 week',
    modes: ['startup'],
    reasoning:
      'Businesses that review sentiment, forecast, and crisis signals together on a fixed weekly cadence catch emerging issues earlier than ad-hoc reviews, based on the alert-to-resolution times already logged this quarter.',
    actionChecklist: [{ id: 'i1', label: 'Block a recurring 30-minute weekly review slot', done: false }],
  },
]
