# References to Verify

Per the FYP II master prompt's Part F: every framework/guideline/dataset/library cited below must be checked against its own primary source before citing it in the dissertation. Entries from a secondary source (a search summary, a textbook chapter, a blog) are marked `[VERIFY]` and must not be cited as if confirmed from the primary text.

This file starts with Phase 5's one new citation. Phases 3 and 4 used several statistical methods (Cohen's kappa, Wilson-score confidence intervals, McNemar's test, Diebold-Mariano test, bootstrap resampling) that also need formal citations backfilled here — not done in this pass; flagged as remaining work, not silently skipped.

## Phase 5 — Crisis communication theory

**Coombs, W. T. (2007). Protecting organization reputations during a crisis: The development and application of situational crisis communication theory.** *Corporate Reputation Review, 10*(3), 163–176. `[VERIFY]` — citation details and the four response-strategy names below (deny / diminish / rebuild / bolster) were confirmed via secondary summaries (Wikipedia's "Situational Crisis Communication Theory" article and several academic-course study guides), cross-checked across multiple independent sources that agree on the same three primary groupings plus bolster as a secondary/supporting strategy. **Not yet checked against Coombs' own 2007 paper or a later update directly** — do this before the dissertation cites the exact wording, since at least one secondary source used "reinforce" instead of "bolster" for the fourth category, suggesting some terminology drift across summaries.

Where this is applied in the system: `src/utils/recommendationRules.js`'s crisis-triggered recommendations (`crisis_critical_response`, `warning_risk_review`) each carry an `scctStrategy` field —

- `crisis_critical_response` (risk level: critical) → **`rebuild`** — per Coombs' own stated guidance (consistently reported across the secondary sources checked): rebuild strategies (accept responsibility, offer compensation/apology) fit crises with strong attributed responsibility ("preventable" crises) — the demo account's real crisis narrative (a defective product batch) is exactly this kind of preventable, high-responsibility event.
- `warning_risk_review` (risk level: warning — lower severity, responsibility not yet confirmed) → **`diminish`** — a proportionate, lower-commitment posture (acknowledge and contextualize while investigating) rather than jumping straight to a full rebuild/apology posture before the cause is confirmed.
- `investigate_complaints` deliberately has **no** `scctStrategy` — it fires as a diagnostic, pre-decision step (something triggered the rule, but responsibility/severity isn't established yet), not a public communication posture, so forcing one of the four categories onto it would be a misapplication of the theory, not a careful one.

## Phase 6 — Color-blind simulation matrices

**The linear-RGB coefficients used in `src/config/colorblindSimulation.js`** to simulate protanopia/deuteranopia/tritanopia. `[VERIFY]` — these are the commonly-reproduced simplified simulation matrices used by several open-source color-blindness simulators and tutorials, generally attributed to the approach in **Viénot, F., Brettel, H., & Mollon, J. D. (1999). Digital video colourmaps for checking the legibility of displays by dichromats.** *Color Research & Application, 24*(4), 243–252. **Not yet checked against that paper directly** — the coefficients were written down from general knowledge of the commonly-republished values (the same matrices appear, with minor variations, across many independent implementations), not transcribed from the primary source. Before citing the exact method in the dissertation, verify the matrices against Viénot et al. (1999) directly, or substitute a maintained, citable library (e.g. a published npm/PyPI color-blindness simulation package) if one with a clearer citation trail is preferred.

Where this is applied: `src/config/colorTokens.test.js`'s "stays distinguishable within each category under simulated color blindness" test, and the two real palette fixes it caught (`PLATFORM_COLORS.x`, `CRISIS_COLORS.warning` — see `docs/DESIGN_PRINCIPLES.md`'s color-blind-safe-palette section for the measured before/after numbers).

Also still outstanding from Phase 3/4 (restated from this file's intro, not yet closed): formal citations for Cohen's kappa, Wilson-score confidence intervals, McNemar's test, the Diebold-Mariano test, and bootstrap resampling.
