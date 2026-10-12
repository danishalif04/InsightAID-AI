# Crisis Detection & Recommendation Engine (FYP2.md §52-56)

## Crisis Detection (§52-53)

Fully rule-based, computed live (no offline training, no ML — this is
arithmetic over data already in Supabase, so it runs in the browser/service
layer on demand, unlike the sentiment/forecasting phases).

**Thresholds**: one file, `src/config/crisisThresholds.js` — every number
the rule engine uses lives there, documented inline.

**Seven signals** (`src/utils/crisisDetection.js`), deliberately
non-overlapping:

| Signal | What it asks | Why it's distinct from the others |
|---|---|---|
| `negative_ratio_level` | Is today's negative ratio absolutely high? | Fixed threshold |
| `negative_ratio_velocity` | Has it drifted up vs. a 7-day baseline? | Sustained trend, not a snapshot |
| `mention_volume_level` | Is today's volume high vs. baseline? | Fixed ratio to baseline |
| `mention_volume_velocity` | Did volume jump vs. yesterday specifically? | Sudden single-day spike, a different failure mode than a slow drift |
| `rating_deterioration` | Has the average rating dropped vs. baseline? | Computed from `processed_data.rating` directly, not the blended `daily_aggregates.avg_rating_sentiment` column |
| `sentiment_anomaly` | Is today's negative ratio a statistical outlier (z-score) vs. its own history? | Catches a small business where a handful of bad reviews is a huge deviation from its norm even when the fixed thresholds above don't trip |
| `review_volume_anomaly` | Same z-score treatment, applied to mention volume | |

Each signal is `normal` / `warning` / `critical` / `insufficient_data` (never
silently coerced to `normal` when there isn't enough history — a zero
baseline variance is treated as "can't compute," not as "z-score of 0").
`risk_score` sums points per triggered signal (warning=10, critical=20,
capped at 100); `risk_level` (FYP2.md §52's own 3-level scheme —
Normal/Warning/Critical, not the earlier mock UI's 4-level scheme, which
this phase replaces) is derived from that score, both configurable in
`crisisThresholds.js`.

**Output shape** matches §52 exactly: `risk_level`, `risk_score`,
`triggered_signals` (with `evidence` strings per §53's "show measurable
evidence" requirement — e.g. "Negative sentiment ratio rose by 12.3
percentage points versus the 7-day baseline"), `detected_at`. No unexplained
AI-generated label is ever shown (§53) — there is no AI/Gemini involvement
in crisis detection at all, only computed evidence.

**Storage**: `crisis_events` (`supabase/migrations/0006_crisis_events.sql`),
per-user RLS. The Crisis Detection page computes live on load (read-only)
and only writes a row when the user explicitly clicks "Log to history" —
detection results are never silently persisted on every page view.

**Tests**: `src/utils/crisisDetection.test.js`, 13 tests — including a full
"everything critical" scenario, exact threshold-boundary checks, a
configurability test (passing a stricter threshold object changes the
result), and a test that a flat/constant baseline correctly yields
`insufficient_data` for the anomaly signals rather than a divide-by-zero or
fabricated z-score (an actual bug caught and fixed during this phase — see
below).

## Recommendation Engine (§54-56)

**Two layers, exactly as specified**:

- **Layer 1 — Analytical Rules** (`src/utils/recommendationRules.js`,
  pure functions, zero Gemini involvement, zero network calls): fires from
  real computed conditions — crisis signals (reusing the exact same
  `detectCrisis()` output as the Crisis Detection page, so "investigate
  customer complaints" is FYP2.md §54's own worked example implemented
  literally: negative-sentiment-velocity triggered AND a volume signal
  triggered), data readiness level, break-even math (reusing
  `scenarioEngine.js`'s `calculateBreakEven`/`buildScenario` from Phase 3
  Part 2 rather than recomputing it differently), and a growth-target
  shortfall check. Eight rules total; every one returns real evidence
  strings, never a placeholder.
- **Layer 2 — Gemini Explanation** (`supabase/functions/explain-recommendations/index.ts`):
  given Layer 1's already-decided facts (id, title, category, priority,
  evidence — fixed, non-negotiable), Gemini is asked for exactly two
  string fields per recommendation, `rationale` and `context` — nothing
  else. `validateExplained()` whitelists only those two keys per known
  recommendation id; any other key, unknown id, or non-string value is
  dropped. **There is no code path by which Gemini can set or change a
  recommendation's priority, category, or any number** (FYP2.md §55).

**If Gemini is unavailable** (not configured, unreachable, malformed
response): `explain-recommendations` returns the same `NOT_CONFIGURED`/
`UPSTREAM_*` error contract as `extract-business-profile`, and
`src/services/recommendationService.js` catches that and returns the Layer-1
recommendations completely unchanged, tagged `explainedBy: 'rule_only'`. The
AI Recommendations page renders these exactly the same as Gemini-explained
ones, just with a plain note instead of Gemini's prose — §55's "Rule-Based
Recommendation must still work" is enforced by this fallback path, not by
hoping Gemini stays up.

**Business context factors** (§56's exact list — business type, stage,
product category, capital, sales, sentiment, forecast, crisis, channels,
data readiness, business goals): `buildBusinessContextFactors()` computes
each from real data where possible; anything unavailable renders the exact
required string, `INSUFFICIENT_INFO_TEXT` ("Insufficient information to
evaluate this factor."). **"Capital" always reads as insufficient** — no
column for it exists anywhere in `business_profiles`/`business_assumptions`
(confirmed by inspecting the schema per §57's "inspect the existing schema"
instruction), and it is deliberately not proxied to an unrelated field like
`fixed_costs`. This context block is shown to the Gemini function too, with
an explicit prompt instruction not to invent a replacement for any factor
marked insufficient.

**Storage**: `recommendations` (`supabase/migrations/0007_recommendations.sql`),
per-user RLS. Written only when the user clicks "Save" on the AI
Recommendations page — same explicit-write discipline as Crisis Detection.

**Tests**: `src/utils/recommendationRules.test.js`, 18 tests — every rule's
firing condition and its negative case, the §54 worked example explicitly,
and both the "everything insufficient" and "everything populated" cases for
`buildBusinessContextFactors`, including a dedicated test that `capital` is
insufficient even when every other factor is fully populated.

## Bugs found and fixed while writing the tests

Both caught by tests that were written to genuinely exercise the code, not
by inspection:

1. `detectCrisis(series, thresholds)` accepted a threshold override
   parameter but the individual signal-evaluator functions ignored it and
   read the module-level `CRISIS_THRESHOLDS` constant directly — the
   "configurable thresholds" requirement (§52) was silently not honored for
   anything except the default. Fixed by threading `thresholds` through
   every evaluator.
2. The anomaly z-score guard compared `stdDev === 0` exactly to detect "no
   real variance, don't compute a z-score" — but floating-point summation
   of repeated identical values (e.g. seven `0.1`s) doesn't always produce
   an exact `0` variance, so a flat baseline could still produce a huge,
   meaningless z-score instead of the intended `insufficient_data`. Fixed
   with an epsilon (`1e-9`) comparison instead.

## Removed

- `src/data/crisisData.js` and `src/data/recommendationsData.js` — both
  fully mock (fabricated risk scores, fabricated ROI/impact/confidence
  numbers, toggleable action-item checklists with no real backing). Neither
  is imported anywhere else; both pages now read real data exclusively.
- The old Crisis Detection page's 4-level (`low/medium/high/critical`)
  scheme is replaced by §52's own 3-level scheme (`normal/warning/critical`).
- The old AI Recommendations page's Impact Score / Confidence / Est. ROI
  progress bars and per-item action checklists are removed — there was no
  real analytical basis for those specific numbers, and inventing one to
  keep the UI decoration would have violated §55.
