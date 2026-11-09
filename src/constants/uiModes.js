import { Accessibility, Heart, Monitor } from 'lucide-react'

/**
 * FYP II Phase 7 — three switchable UI accessibility modes. Separate
 * concept from src/constants/modes.js's business-workspace mode
 * (startup/ecommerce) — do not confuse the two (docs/AUDIT.md section 3
 * flagged exactly this risk). Applied as a class on <html> so plain CSS
 * can target `.ui-low-sensory`/`.ui-senior` (see src/styles/index.css),
 * no page reload required.
 */
export const UI_MODES = {
  standard: {
    id: 'standard',
    label: 'Standard',
    icon: Monitor,
    description: 'Default design after the Phase 6 Tufte-grounded redesign.',
    htmlClass: null,
  },
  low_sensory: {
    id: 'low_sensory',
    label: 'Low-Sensory',
    icon: Accessibility,
    description:
      'Low-Sensory mode: no motion, muted colours, literal plain-language text, fewer elements at once — informed by general sensory-friendly design guidance (W3C COGA), not a claim that any single interface suits every autistic person (see docs/ACCESSIBILITY_MODES.md).',
    htmlClass: 'ui-low-sensory',
  },
  senior: {
    id: 'senior',
    label: 'Senior / Warga Emas',
    icon: Heart,
    description:
      'Mod Warga Emas: Bahasa Melayu by default, larger text and touch targets, spoken-style chart summaries, optional text-to-speech.',
    htmlClass: 'ui-senior',
  },
}

export const DEFAULT_UI_MODE = 'standard'
