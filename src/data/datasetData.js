/**
 * Mock fixtures for the Dataset Management page.
 * API connection status is now computed live by src/adapters/registry.js —
 * see FYP2.md §37-39/§60/§66. Only storageUsage remains mock (out of scope
 * for the source-adapter phase).
 */

export const storageUsage = {
  usedGB: 34.2,
  totalGB: 100,
  languageBreakdown: [
    { language: 'English', code: 'en', percent: 48 },
    { language: 'Bahasa Melayu', code: 'ms', percent: 36 },
    { language: 'Mandarin', code: 'zh', percent: 16 },
  ],
}
