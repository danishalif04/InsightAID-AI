# Accessibility Modes — Phase 7 (FYP II)

Three switchable UI modes (`src/constants/uiModes.js`, `src/contexts/UIModeProvider.jsx`), separate from the pre-existing business-workspace mode (`src/constants/modes.js` — do not confuse the two, `docs/AUDIT.md` section 3 flagged exactly this risk). Persisted per-user in `user_preferences.ui_accessibility_mode` (migration `0012`, additive — **run manually in Supabase's SQL Editor**, same as every migration in this project), with a localStorage fallback and no page reload on switch.

## 1. Standard mode

The default post-Phase-6 design. No changes made.

## 2. Low-Sensory / autism-friendly mode

**Rationale and citations**:
- **W3C WAI, "Making Content Usable for People with Cognitive and Learning Disabilities" (COGA, 2021)** — recommends predictable layout, minimal unnecessary motion, plain language, and reducing simultaneous choices/elements. Applied: fixed nav position (unchanged from standard — layout position was already consistent across pages, confirmed by inspection, not newly built), no motion at all (below), literal text audit (below).
- **GAIA guidelines (Britto, T., & Pizzolato, E., 2018). "GAIA: uma proposta de guia de recomendações de acessibilidade web com foco em aspectos do autismo."** *Revista Brasileira de Informática na Educação, 26*(2). `[VERIFY]` — confirmed real (28 guidelines, reviewed 17 prior works 2005–2015) via the RBIE journal record and multiple citing papers; the full primary text was not read directly in this pass, so the specific guideline numbers aren't individually cited — see `docs/REFERENCES_TO_VERIFY.md`.
- **W3C WCAG 2.2 (2023)**, §2.3 (seizures/physical reactions — no flashing) and §1.4.3 (contrast, AA).

**What's real and implemented**:
- **No motion, verified two ways**: a CSS backstop (`src/styles/index.css`'s `.ui-low-sensory *` rule, `animation-duration`/`transition-duration` forced to near-zero) for any plain-CSS transition, AND a JS-level check (`src/hooks/useLowSensoryMode.js`) that `ChartCard.jsx` now ORs with the existing OS-level `prefers-reduced-motion` check, since Framer Motion is JS-driven and a CSS override alone can't stop it. Only `ChartCard`-based charts (currently just Crisis Detection, per Phase 6) are wired to this — the 5 not-yet-redesigned pages' raw Recharts usage doesn't go through `ChartCard` and isn't covered yet; a real, stated gap, not hidden.
- **Muted, real-contrast-verified palette**: overrides Tailwind's own `--color-slate-900/700/500` custom properties within the `.ui-low-sensory` scope to stone-700/600/500 — every existing `text-slate-*` className picks this up automatically, no per-component change. Real measured contrast (`src/utils/contrastRatio.js`, formula from WCAG 2.2 §1.4.3): stone-600 on canvas = **7.15:1**, on surface = **7.63:1** — both clear AA (4.5:1), most of AAA (7:1) too. stone-500 on canvas = **4.50:1**, the exact AA minimum, not below it.
- **No bright red alarms**: Crisis Detection's existing critical-state styling already pairs color with text/an icon everywhere (confirmed in Phase 6's `DESIGN_PRINCIPLES.md` "never color as the only cue" audit) — no additional change needed here specifically.
- **Literal language audit**: searched the whole `src/pages`/`src/components`/`src/services` tree for vague words (`soon`, idioms). **Real finding: zero matches for "soon" anywhere in the UI.** Nothing needed fixing — reported honestly as "already compliant," not fabricated as a fix.
- **No silent auto-refresh**: searched for polling/auto-refresh patterns (`setInterval`, `poll`, scheduled re-fetch). **Real finding: the only `setInterval` in the codebase is `CrisisReplay.jsx`'s own user-initiated play/pause scrubber** — not a silent background data refresh. There is no silent auto-refresh-without-user-action anywhere in this app to disable; the master prompt's "show 'tap to update' instead" requirement has no applicable target yet. Stated as a non-issue, not built as an unnecessary feature solving a problem that doesn't exist.
- **Deferred, not built this phase**: "one primary chart per view with Next progression" (would require restructuring multi-chart pages — out of scope per this phase's own scoping decision, same reasoning as Phase 6's "no full page rebuild"); collapsible secondary content.

## 3. Senior / Mod Warga Emas mode

**Rationale and citations**: W3C WCAG 2.2 §1.4.6 (AAA contrast), §2.5.5 (target size, 44×44px — exactly the master prompt's own number, confirmed as a real, current WCAG 2.2 criterion, not invented). DOSM Malaysian ageing statistics `[VERIFY]` — not sourced in this pass; flagged in `docs/REFERENCES_TO_VERIFY.md` rather than inventing a figure.

**What's real and implemented**:
- Base font 18px, line-height 1.6, `--color-slate-900/700` overridden to near-black (`#111827`). Real measured contrast: near-black on white = **17.74:1**, white on brand-950 = **16.59:1** — both well past the AAA 7:1 target (`src/utils/contrastRatio.test.js` pins both values so a future palette change can't silently regress below AAA).
- Touch targets: `.ui-senior button/a/input/select/[role="button"]` forced to `min-height`/`min-width: 44px`.
- `formatCurrencyMYR` already formats as `RM 1,250` (0 decimals, `src/utils/formatters.js`) — the master prompt's own example shows 2 decimals (`RM 1,250.00`); not changed app-wide (would affect every existing currency display outside Senior mode), but worth a follow-up decision if 2-decimal display is wanted specifically in Senior mode.
- **Spoken-style chart summary, real data, not a placeholder**: `src/utils/seniorModeSummaries.js`'s `summarizeScoreBM()` builds a real Bahasa Melayu sentence from whatever score object a chart already computed (e.g. "Overall Sentiment (Positive) ialah 67%, naik 4.2 mata peratusan berbanding 7 hari lepas") — wired into Dashboard's sentiment KPI as the worked example (`SeniorModePanel.jsx`), the same "one worked example, not every chart" scoping Phase 6 used for its own reading-guide popover.
- **"Apa yang perlu saya buat?" panel**: real top-3 recommendations from the existing rule engine (`data.recommendations`, already computed by `getDashboardData`), shown larger with BM framing. **Honest limitation, stated plainly**: no i18n infrastructure exists anywhere in this app (confirmed — no `react-i18next`, no translation files; a `user_preferences.language` field exists and is saved from Settings, but nothing in the codebase actually reads it to translate any UI string). Each recommendation's own title/evidence text therefore stays in English — only this panel's framing and the spoken summary (built fresh from numbers, not translated) are genuinely Bahasa Melayu.
- **Text-to-speech**: real `window.speechSynthesis` (`src/hooks/useTextToSpeech.js`), `lang="ms-MY"`. `supported` is checked before rendering the button at all — a browser/environment without Speech Synthesis support gets no button, never a broken one.

## Cross-cutting: trilingual UI (EN/BM/ZH)

**Confirmed, not assumed, absent**: no i18n library, no translation files, no language-switching renderer anywhere in `src/`. A `user_preferences.language` select exists in Settings (pre-existing, before this phase) and persists a choice, but nothing consumes it. Building full trilingual UI text for all 10 pages is out of scope for this phase (per this phase's own directive, which allows deferring this rather than faking partial translations) — a real, separately-sized future phase: wiring `react-i18next` (or similar) and translating every existing UI string, not just Senior mode's new BM text.
