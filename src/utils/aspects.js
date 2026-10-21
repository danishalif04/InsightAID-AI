/**
 * Transparent, static multilingual keyword lexicon mapping review/post
 * text to a fixed set of aspects — "Keyword lexicon (heuristic)" wherever
 * it's shown (rule 0.1: this is NOT a trained classifier). Every keyword
 * is listed here in plain sight so the method can be audited/extended,
 * not hidden inside a black-box model.
 *
 * Languages covered: English (en), Bahasa Melayu (ms), Mandarin (zh,
 * covers both Simplified and Traditional common complaint words), and
 * Manglish (code-mixed en/ms — its own keyword list rather than assuming
 * the en/ms lists already cover code-mixed phrasing, since a code-mixed
 * sentence often uses different shorthand, e.g. "lambat sangat lah").
 */

export const ASPECTS = [
  'Product quality / Smell & texture',
  'Packaging & leakage',
  'Skin reaction',
  'Delivery delay',
  'Wrong item',
  'Price',
  'Seller service',
]

const LEXICON = {
  'Product quality / Smell & texture': {
    en: [
      'quality',
      'texture',
      'smell',
      'scent',
      'fragrance',
      'greasy',
      'sticky',
      'watery',
      'thin',
      'thick',
      'absorb',
    ],
    ms: ['kualiti', 'bau', 'tekstur', 'berminyak', 'melekit', 'cair', 'pekat'],
    zh: ['质量', '品质', '味道', '气味', '质地', '油腻', '粘', '太稀', '太浓'],
    manglish: ['quality lah', 'bau pelik', 'texture weird', 'smell funny'],
  },
  'Packaging & leakage': {
    en: [
      'packaging',
      'package',
      'leak',
      'leaking',
      'leaked',
      'spilled',
      'broken bottle',
      'damaged box',
      'crushed',
    ],
    ms: ['bungkusan', 'pembungkusan', 'bocor', 'tumpah', 'pecah', 'rosak'],
    zh: ['包装', '漏', '漏液', '破损', '压扁', '碎了'],
    manglish: ['bocor lah', 'packaging rosak', 'leak sikit'],
  },
  'Skin reaction': {
    en: [
      'allergic',
      'allergy',
      'rash',
      'breakout',
      'irritation',
      'itchy',
      'itch',
      'burning',
      'reaction',
      'redness',
    ],
    ms: ['alahan', 'gatal', 'ruam', 'merah', 'bengkak', 'kulit teruk'],
    zh: ['过敏', '刺痛', '发红', '长痘', '起疹子', '痒'],
    manglish: ['kulit jadi teruk', 'skin breakout', 'gatal gatal'],
  },
  'Delivery delay': {
    en: [
      'late',
      'delay',
      'delayed',
      'slow delivery',
      'took weeks',
      'never arrived',
      'still waiting',
      'shipping took',
    ],
    ms: ['lambat', 'tertunda', 'lewat', 'penghantaran lambat', 'masih tunggu'],
    zh: ['延迟', '很慢', '迟到', '还没到', '等了很久'],
    manglish: ['lambat sangat', 'delivery lambat gila', 'still waiting lah'],
  },
  'Wrong item': {
    en: [
      'wrong item',
      'wrong product',
      'different item',
      'not what i ordered',
      'mismatched',
      'incorrect item',
    ],
    ms: ['barang salah', 'tersilap hantar', 'bukan yang saya order', 'salah produk'],
    zh: ['发错货', '寄错', '不是我订的', '货不对'],
    manglish: ['wrong item lah', 'salah barang sent'],
  },
  Price: {
    en: [
      'expensive',
      'overpriced',
      'pricey',
      'not worth',
      'too costly',
      'cheap',
      'affordable',
      'value for money',
    ],
    ms: ['mahal', 'tak berbaloi', 'murah', 'berpatutan'],
    zh: ['贵', '价格高', '不值', '便宜', '性价比'],
    manglish: ['mahal lah', 'overpriced gila', 'value for money lah'],
  },
  'Seller service': {
    en: [
      'customer service',
      'seller',
      'response',
      'rude',
      'helpful',
      'support',
      'refund',
      'replied',
      'ignored',
    ],
    ms: ['penjual', 'layanan', 'respon', 'khidmat pelanggan', 'balas', 'abaikan'],
    zh: ['客服', '卖家', '服务', '回复', '退款', '态度'],
    manglish: ['service teruk', 'seller tak respond', 'customer service ok lah'],
  },
}

const ALL_LANGUAGES = ['en', 'ms', 'zh', 'manglish']

/** @returns {string[]} every aspect whose lexicon has a keyword appearing in `text` (case-insensitive substring match — a heuristic, not NLP) */
export function matchAspects(text) {
  if (!text) return []
  const haystack = text.toLowerCase()

  return ASPECTS.filter((aspect) => {
    const byLanguage = LEXICON[aspect]
    return ALL_LANGUAGES.some((language) =>
      byLanguage[language].some((keyword) => haystack.includes(keyword.toLowerCase()))
    )
  })
}

/** Batch form for a list of {text, ...} rows — returns the same rows with
 * an added `aspects` array, so callers can group/filter by aspect without
 * re-running matchAspects per row themselves. */
export function tagRowsWithAspects(rows = [], textField = 'cleanedText') {
  return rows.map((row) => ({
    ...row,
    aspects: matchAspects(row[textField] ?? row.cleaned_text ?? row.raw_text),
  }))
}
