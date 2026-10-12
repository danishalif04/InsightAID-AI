# Report Generation (Phase 11, FYP2.md §69-70)

## Architecture

**Layer 1 (data, non-negotiable):** `src/services/reportContextService.js`
assembles real data once per report generation by reusing every
already-built service from Phases 3-10 — `businessProfileService`,
`dataReadiness`, `crisisService`, `forecastResultsService`,
`recommendationService`, `socialAnalytics`, `scenarioEngine` — nothing is
recomputed differently for reports. `src/utils/reportBuilders.js` (pure,
unit-tested) then picks the relevant pieces per report type into a
section model: `{ id, title, actual: [{label,value}], scenario:
[{label,value}], narrative, note }`. **`actual` and `scenario` are always
two separate arrays** — FYP2.md §69's "always distinguish ACTUAL DATA from
SCENARIO/ESTIMATED DATA" is enforced structurally, not just visually: a
data point physically cannot be ambiguous about which it is.

**Layer 2 (narrative, optional):** `supabase/functions/explain-report/index.ts`
(new Edge Function, same house style as `explain-recommendations`) asks
Gemini for one short paragraph per section, given only the already-fixed
actual/scenario data points — `validateExplained()` strips any key besides
a plain string `narrative` per known section id, so **Gemini cannot alter
a single number** (§69: "Gemini may help generate narrative explanations
but must not independently invent numerical metrics"). If unreachable/
unconfigured, `reportGenerationService.js` renders the report with all its
real data and no narrative text — never a blank report, never blocked.

## The six report types (§70)

| Type | Sections |
|---|---|
| Business Health Report | Executive Summary, Business Profile, Data Availability, Current Business Performance, Key Findings, Recommendations, Assumptions & Limitations |
| E-Commerce Analytics Report | Executive Summary, Business Profile, Platform Performance, Customer Sentiment, Sales/Demand Forecast, Key Findings, Recommendations, Assumptions & Limitations |
| Sentiment Report | Executive Summary, Customer Sentiment, Key Findings, Required Data Improvements, Assumptions & Limitations |
| Forecast Report | Executive Summary, Sales/Demand Forecast, Key Findings, Assumptions & Limitations |
| Crisis Report | Executive Summary, Crisis/Risk Indicators, Key Findings, Recommendations, Assumptions & Limitations |
| Business Planning Report | Executive Summary, Business Profile, Data Availability, Scenario Analysis, Required Data Improvements, Assumptions & Limitations |

Every report ends with **Assumptions and Limitations**, always populated
(never an empty placeholder section) — three limitations common to every
report (no trained sentiment model, fixed crisis thresholds, Gemini-never-
invents-numbers) plus report-type-specific ones (e.g. the Business Planning
Report's reminder that every Scenario Analysis figure is a projection, not
a historical forecast).

### Where ACTUAL vs. SCENARIO gets decided, concretely

- **Business Profile**: split by each field's existing provenance tag
  (Phase 3) — `user_provided`/`ai_extracted` → ACTUAL, `default_assumption`
  → SCENARIO. A field with no provenance recorded is skipped, never guessed
  into either bucket.
- **Sales/Demand Forecast**: MAE/RMSE/MAPE (measured by backtesting against
  already-known past data, FYP2.md §51) → ACTUAL. The dated future
  predictions themselves → SCENARIO, explicitly noted as such.
- **Scenario Analysis** (conservative/expected/growth, break-even): 100%
  SCENARIO by definition — this section has no ACTUAL data points at all.
- **Crisis/Risk Indicators, Customer Sentiment, Current Business
  Performance**: measured, already-computed signals → ACTUAL.

## Exports (§70: PDF first, then CSV/Excel-compatible)

`src/utils/reportExport.js`:

- **PDF** (`jspdf` + `jspdf-autotable`, new dependencies, verified working
  in this repo's dev environment — `buildReportPdfDoc()` is unit-tested,
  including multi-page overflow): one table per section per data type
  (a green-headed "ACTUAL DATA" table, an amber-headed "SCENARIO/ESTIMATED
  DATA" table), narrative paragraph, and note, in reading order. A single
  click downloads a real `.pdf` file — no browser print dialog involved.
- **CSV** (reuses Phase 10's `csvExport.js`): one flat row per data point,
  each tagged `ACTUAL` / `SCENARIO/ESTIMATED` / `NARRATIVE` / `NOTE` in its
  own `type` column — opens directly in Excel, satisfying §70's third
  priority tier ("Excel-compatible data") with the same file. PowerPoint
  is not implemented (§70: "may be implemented later if practical" — not
  attempted this phase).

## Storage

Report **content** is generated on demand and never stored in Supabase —
PDF/CSV files ARE the persistence mechanism (the user downloads and keeps
them). Only **when each report type was last generated** is tracked
per-user, in the existing `report_templates` table (`supabase/migrations/0001_init.sql`,
kept from Phase 10) — no new migration was needed for this phase.

## Known limitations (stated honestly)

- Every report type shares the same `composeExecutiveSummary()` logic for
  its opening section (real, but the same composition function across all
  six types) — a report-type-specific executive-summary composer would be
  a reasonable future refinement, not built here.
- `explain-report` is untested against a real Gemini call (same reason as
  every other Gemini function in this project: no API key available to
  verify the live round-trip). The validation/fallback logic is real and
  unit-tested via the same pattern as `explain-recommendations`.
- Adding `jspdf`/`jspdf-autotable` pulled in `html2canvas` and `dompurify`
  as transitive dependencies (jsPDF's HTML-rendering feature, unused here)
  — the Reports page's lazy-loaded chunk grew to ~447 kB as a result. It's
  route-isolated (doesn't affect initial app load) but is a real bundle-size
  cost of choosing a real one-click PDF download over, say, a
  browser-print-to-PDF approach.
- Nothing here has been run against real authenticated data — the standing
  Supabase auth blocker still prevents live verification. All logic is
  verified by unit tests (`reportBuilders.test.js` — 14 tests, including
  every builder against both a fully-populated and a fully-empty context;
  `reportExport.test.js` — 6 tests, including real PDF byte generation).
