/**
 * Shared JSDoc typedefs (JavaScript stand-in for a TS types folder).
 * Reference from anywhere via: import('@/types').SentimentResult
 *
 * @typedef {'positive' | 'neutral' | 'negative'} SentimentLabel
 * @typedef {'en' | 'ms' | 'zh'} LanguageCode
 * @typedef {'tiktok' | 'x'} Platform
 *
 * @typedef {Object} SentimentResult
 * @property {SentimentLabel} label
 * @property {number} confidence  Score in [0, 1]
 * @property {LanguageCode} language
 * @property {Platform} platform
 *
 * @typedef {'low' | 'medium' | 'high' | 'critical'} CrisisLevel
 */
export {}
