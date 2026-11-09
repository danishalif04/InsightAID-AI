# References to Verify

Per the FYP II master prompt's Part F: every framework/guideline/dataset/library cited below must be checked against its own primary source before citing it in the dissertation. Entries from a secondary source (a search summary, a textbook chapter, a blog) are marked `[VERIFY]` and must not be cited as if confirmed from the primary text.

This file starts with Phase 5's one new citation. Phases 3 and 4 used several statistical methods (Cohen's kappa, Wilson-score confidence intervals, McNemar's test, Diebold-Mariano test, bootstrap resampling) that also need formal citations backfilled here — not done in this pass; flagged as remaining work, not silently skipped.

## Phase 5 — Crisis communication theory

**Coombs, W. T. (2007). Protecting organization reputations during a crisis: The development and application of situational crisis communication theory.** *Corporate Reputation Review, 10*(3), 163–176. `[VERIFY]` — citation details and the four response-strategy names below (deny / diminish / rebuild / bolster) were confirmed via secondary summaries (Wikipedia's "Situational Crisis Communication Theory" article and several academic-course study guides), cross-checked across multiple independent sources that agree on the same three primary groupings plus bolster as a secondary/supporting strategy. **Not yet checked against Coombs' own 2007 paper or a later update directly** — do this before the dissertation cites the exact wording, since at least one secondary source used "reinforce" instead of "bolster" for the fourth category, suggesting some terminology drift across summaries.

Where this is applied in the system: `src/utils/recommendationRules.js`'s crisis-triggered recommendations (`crisis_critical_response`, `warning_risk_review`) each carry an `scctStrategy` field —

- `crisis_critical_response` (risk level: critical) → **`rebuild`** — per Coombs' own stated guidance (consistently reported across the secondary sources checked): rebuild strategies (accept responsibility, offer compensation/apology) fit crises with strong attributed responsibility ("preventable" crises) — the demo account's real crisis narrative (a defective product batch) is exactly this kind of preventable, high-responsibility event.
- `warning_risk_review` (risk level: warning — lower severity, responsibility not yet confirmed) → **`diminish`** — a proportionate, lower-commitment posture (acknowledge and contextualize while investigating) rather than jumping straight to a full rebuild/apology posture before the cause is confirmed.
- `investigate_complaints` deliberately has **no** `scctStrategy` — it fires as a diagnostic, pre-decision step (something triggered the rule, but responsibility/severity isn't established yet), not a public communication posture, so forcing one of the four categories onto it would be a misapplication of the theory, not a careful one.
