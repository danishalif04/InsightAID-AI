# InsightAid AI — System-Derived Facts Report

Produced in response to Section 5 of `InsightAid_Completion_Guide.pdf`.
Repository: `C:\Users\User\FYP\insightaid-ai` · HEAD `d252bb1` · Generated 2026-11-12.

**Rules followed:** every figure below is read from a file, a command, or a live query, and the
path/command is given. Where something could not be measured it says **not available** and the reason.
Nothing is estimated unless explicitly labelled an estimate.

**Four items could not be measured and are not guessed** — §5 (response times), §6 S1/S2 (crisis
windows), parts of §3 (full model comparison), and §8 (cost). Reasons are in each section.

---

## 1. Versions

**Frontend** — read from `node_modules/<pkg>/package.json` (installed versions, not the caret ranges in `package.json`):

| Package | Installed |
|---|---|
| react | 19.2.7 |
| react-dom | 19.2.7 |
| react-router-dom | 7.18.1 |
| recharts | 3.9.2 |
| framer-motion | 12.42.2 |
| lucide-react | 1.23.0 |
| @supabase/supabase-js | 2.110.5 |
| tailwindcss | 4.3.2 |
| vite | 8.1.3 |
| vitest | 5.0.2 |
| @playwright/test | 1.63.0 |
| jspdf | 4.2.1 |

Charting library: **Recharts 3.9.2**. Animation library: **Framer Motion 12.42.2**. Icons: **lucide-react 1.23.0**.

> **Correction for the dissertation:** the abstract wording referenced in the guide says *React 18*. The
> installed version is **React 19.2.7**.

**Python** — `ml/forecasting/requirements.txt` and `ml/sentiment/requirements.txt` declare **minimum floors**, not pins:

- forecasting: `pandas>=2.0`, `numpy>=1.26`, `scikit-learn>=1.4`, `statsmodels>=0.14`, `prophet>=1.1`, `xgboost>=2.0`, `scipy>=1.11`, `holidays>=0.107`, `tensorflow>=2.16`, `pytest>=8.0`
- sentiment: `pandas>=2.0`, `numpy>=1.26`, `scikit-learn>=1.4`, `scipy>=1.11`, `statsmodels>=0.14`, `torch>=2.2`, `transformers>=4.40`, `datasets>=2.19`, `accelerate>=0.30`, `sentencepiece>=0.2`, `sacremoses>=0.1`, `huggingface_hub>=0.23`

Versions in **this machine's** environment (`python -c "import X; X.__version__"`), Python **3.14.6**:
pandas 3.0.3 · numpy 2.4.6 · scikit-learn 1.9.0 · scipy 1.18.0 · statsmodels 0.14.6 · prophet 1.5.0 · xgboost 3.4.1 · torch **not installed locally** · tensorflow present.

> **Important caveat:** the sentiment models were **trained in Google Colab**, not on this machine
> (`ml/sentiment/results/PHASE3_STATUS.md`). The exact library versions *used for training* were never
> recorded, so the local versions above are **not** the training versions. If the dissertation must state
> training versions, they are **not available** and should be reported as such, or recovered by re-opening
> the Colab notebook.

---

## 2. Sentiment results

Source: `ml/sentiment/results/model_versions_v20261020-171546.json`, parsed from the real training run's
saved SQL (`ml/sentiment/src/parse_training_run.py`); scorecard at `ml/sentiment/results/O1_SCORECARD.md`.

Dataset `v20261012-ba90cb55d8f7` — train **85,639** / validation **10,763** / **test 10,769**. Trained 2026-10-20.

### Overall accuracy and macro F1

| Model | Eval path | Accuracy | F1 | Precision | Recall |
|---|---|---|---|---|---|
| XLM-RoBERTa | original_language | **84.12%** | **0.8066** | 0.8074 | 0.8059 |
| XLM-RoBERTa | translate_to_english | 71.88% | 0.6888 | 0.6957 | 0.7072 |
| mBERT | original_language | 82.48% | 0.7906 | 0.7916 | 0.7897 |
| mBERT | translate_to_english | 70.65% | 0.6769 | 0.6820 | 0.6934 |
| TF-IDF + LR | original_language | 74.34% | 0.7273 | 0.7252 | 0.7437 |
| TF-IDF + LR | translate_to_english | 64.56% | 0.6300 | 0.6499 | 0.6635 |

### Per-language (XLM-R, original_language) — with test-set size

| Language | Accuracy | F1 | Precision | Recall | n (test) |
|---|---|---|---|---|---|
| English (en) | 78.28% | 0.7797 | 0.7796 | 0.7797 | 5,549 |
| Bahasa Melayu (ms) | 86.88% | 0.7168 | 0.7471 | 0.6984 | 2,820 |
| Mandarin (zh) | 94.37% | 0.6292 | 0.6293 | 0.6292 | 2,400 |
| Code-mixed (ms-en) | — | — | — | — | **0 — not in the dataset** |

Per-language accuracy for the other models (from `O1_SCORECARD.md`): mBERT original 76.81 / 84.54 / 93.17;
TF-IDF original 71.96 / 82.98 / 69.71.

### The 75% / 80% check

**O1 target (≥80% overall AND ≥75% every language): MET by XLM-R** (84.12% overall; 78.28 / 86.88 / 94.37
all ≥75%). mBERT also passes. TF-IDF fails (74.34% overall, 69.71% zh). Every translate-first path fails.

95% CI for XLM-R accuracy: **83.42%–84.80%**, entirely above 80% (`ml/sentiment/src/confidence_interval.py`).

> **Method disclosure the guide should carry:** this is a **Wilson score interval**, not a bootstrap. A true
> bootstrap needs per-example predictions, which were never exported from Colab. Call it a Wilson interval
> in the paper. Source: `PHASE3_STATUS.md`.

### Inter-annotator agreement (kappa)

**Not conducted.** `ml/sentiment/src/compute_kappa.py` exists and is tested, but the annotation export has a
blank `annotator_2_label` column — no second annotator has labelled it. Report as *not conducted*.

### Two further honest gaps (both documented in `PHASE3_STATUS.md`)

- **No code-mixed accuracy figure can be reported.** The labelled dataset tags only en/ms/zh. The live app
  *does* detect code-mixed text at inference (`src/utils/textPreprocessing.js`), so this is a coverage gap
  between the evaluation set and the multilingual claim — state it as a limitation.
- **McNemar's test and the 50-errors-per-language export were not run** — same blocker (no per-example predictions).

---

## 3. Forecasting results

### What exists

Only **one** forecasting result file is saved in the repo:
`ml/forecasting/results/phase4_sentiment_regressor/results.json` — series **`olist_total`**, 2 folds, 60 combined test points.

| Model | MAE | RMSE | MAPE | MASE |
|---|---|---|---|---|
| Prophet (sales-only) | 6701.60 | 8061.42 | **30.04%** | 1.1707 |
| Prophet (sentiment-enhanced) | 6703.01 | 8090.79 | **29.75%** | 1.1709 |

**Diebold–Mariano test:** DM = **−0.174906**, p = **0.861752**, n = 60, h = 30 → **not significant at 0.05**.
The file's own stored interpretation: *"No statistically significant difference between Prophet sales-only
and Prophet sentiment-enhanced — cannot claim one beats the other."*

Sentiment↔revenue lag correlations (0–21 days) are all weak: max |r| = **0.158** (lag 18, negative);
lag 0 r = 0.0891.

### Two results the dissertation must report honestly

1. **The MAPE < 15% target is NOT met on this series** — both variants are ~30%.
2. **O2's hypothesis is NOT supported.** The sentiment-enhanced forecast did not significantly beat the
   sales-only baseline. Per the project's own falsifiability rule, this must be stated plainly, not softened.
   Placeholders 19/20/33 should say so.

### What is NOT available

The **full six-model comparison** (moving average, ARIMA, Prophet±sentiment, XGBoost, LSTM) with MAE/RMSE/MAPE
**per dataset**, the per-dataset averages, and the count of series where each model won: **not available.**
`ml/forecasting/results/` contains only the template (`forecast_results_template.json`, an empty schema) and
the Phase 4 file above. The comparison code exists (`ml/forecasting/src/`) and the notebook
`ml/notebooks/04_train_forecasting_models.ipynb` exists, but **no saved output of a full run is in the repo.**
To report those numbers, re-run the notebook and save the results.

**Paired review data:** the sentiment-enhanced run used **one series (`olist_total`)**, 60 test points.
Whether its review data is genuinely paired is documented in
`ml/forecasting/docs/SENTIMENT_REGRESSOR_MAPPING.md` — read that before making a claim about pairing.

---

## 4. Database — `model_versions`

Command: `npx supabase db query --remote --read-only "select ... from public.model_versions"` against project
`jtyjfblzxvmryjmvuzds`.

**The benchmark SQL WAS run. 6 rows are present** — matching the saved JSON exactly:

| model_name | eval_path | accuracy | f1 |
|---|---|---|---|
| insightaid-sentiment-tfidf_lr | original_language | 0.7434 | 0.7273 |
| insightaid-sentiment-tfidf_lr | translate_to_english | 0.6456 | 0.6300 |
| insightaid-sentiment-xlmr | original_language | 0.8412 | 0.8066 |
| insightaid-sentiment-xlmr | translate_to_english | 0.7188 | 0.6888 |
| insightaid-sentiment-mbert | original_language | 0.8248 | 0.7906 |
| insightaid-sentiment-mbert | translate_to_english | 0.7065 | 0.6769 |

This resolves **placeholder 18**. The Model Performance page will no longer show "Not yet evaluated".
Note there is **no `is_best` column** on this table (that column exists on `forecast_results`).

---

## 5. Response time

**Not available.** All five pages sit behind `RequireAuth`, and `run-forecast` / `agent-manager` require a
signed-in JWT. Measuring them needs the `usertest1` password, which I do not have; `e2e/helpers.js`
deliberately has no auth bypass. No timing was estimated.

**How to get it** (produces exactly what placeholder 5 needs): set the credentials in your own terminal and
run the Playwright suite, which already drives these pages:

```powershell
$env:E2E_TEST_EMAIL="usertest1@insightai.com"
$env:E2E_TEST_PASSWORD="<password>"
npx playwright test --reporter=list
```

For the 5-runs-each median/worst figures, time `page.goto()` per page with
`performance.getEntriesByType('navigation')`, and wrap the two function calls in `Date.now()` deltas.

One related figure that **is** measurable — production bundle sizes (`npm run build`), which bound first paint:
`index` 648.9 kB (194.6 kB gzip), `Reports` 450.9 kB, `DatasetManagement` 390.9 kB, `CrisisDetection` 85.8 kB,
`Dashboard` 50.2 kB. Three chunks exceed Vite's 500 kB warning threshold.

---

## 6. Scenario runs

No data was changed. S3/S4/S5 were executed against the real shipped code via a temporary Vitest probe
(since deleted); S1/S2 could not be.

### S3 — Local Shop: price 25, unit cost 10, fixed 3000, expected units 400

Functions: `src/features/localshop/engine/{breakEven,scenarios}.js`.

| Figure | Value |
|---|---|
| Contribution per unit | RM15.00 |
| Gross margin | 60% |
| **Break-even units** | **200** |
| **Break-even revenue** | **RM5,000** |

**Manual check (independent of the code):** BEP = Fixed ÷ (Price − Unit cost) = 3000 ÷ (25 − 10) = 3000 ÷ 15
= **200 units**. Revenue = 200 × 25 = **RM5,000**. Margin = (25 − 10) ÷ 25 = **60%**. **The code agrees exactly.**

Three scenarios (optimistic = units ×1.2; conservative = units ×0.8 and cost ×1.1):

| Scenario | Units | Revenue | Variable costs | Gross profit | Fixed | Operating result | Break-even units |
|---|---|---|---|---|---|---|---|
| Current | 400 | RM10,000 | RM4,000 | RM6,000 | RM3,000 | **RM3,000** | 200 |
| Optimistic | 480 | RM12,000 | RM4,800 | RM7,200 | RM3,000 | **RM4,200** | 200 |
| Conservative | 320 | RM8,000 | RM3,520 | RM4,480 | RM3,000 | **RM1,480** | 215 |

Manual check on Current: 400 × 15 − 3000 = **RM3,000** ✓. Conservative BEP: 3000 ÷ (25 − 11) = 214.3 → **215** (rounded up) ✓.

### S4 — the same account with unit cost left empty

Every function returns a structured failure naming the missing input — **no NaN, no zero, no invented value**:

- `breakEvenUnits` → `{ ok: false, missing: ["varCost"] }`
- `breakEvenRevenue` → `{ ok: false, missing: ["varCost"] }`
- `grossMarginPct` → `{ ok: false, missing: ["cost"] }`
- `operatingResult` → `{ ok: false, missing: ["varCost"] }`
- `scenarioSet` → `{ ok: false, missing: ["varCost"] }`

On screen the KPI tile renders *"Not enough information yet"* plus the required input
(`src/features/localshop/components/KpiTile.jsx`), rather than a figure.

### S5 — an account with only 2 days of data

`detectCrisis()` (`src/utils/crisisDetection.js`) returns **riskLevel `normal`, riskScore `0`,
`dataSufficient: false`**, and **no signals array**. The detector requires 3+ prior days before computing a
signal, so with 2 days it declines to judge rather than producing a risk score from too little history.

### S1 and S2 — crisis page, incident window and quiet window

**Not available.** The page computes from `daily_aggregates` through an authenticated, RLS-scoped service.
I can read the raw rows with an admin query (usertest1 has **1,736** rows spanning **2024-09-01 → 2026-10-21**),
but reproducing the page's aggregation by hand risks printing numbers that differ from what the screen shows —
which is worse for a dissertation than reporting nothing. Get these by opening the page with the credentials.

> A **prior** reading is recorded in `docs/knowledge_updated_nov2026.md` §5.4 (dated 2026-10-22): risk level
> **Warning, 30/100**, from two signals — negative ratio 50% and a rating drop of 0.59. Treat that as a dated
> prior observation to be **re-verified on screen**, not as a current measurement.

---

## 7. Visual review

### 3-D effects, gradients, shadows, glow on chart areas

- **No 3-D effects, no perspective/rotate transforms, no pie or donut charts anywhere.** A 4-slice donut
  previously existed on the Dashboard and was **removed** as a Cleveland–McGill ranking violation, replaced
  with a ranked bar (`reports/CHART_AUDIT.md`).
- One **radial** chart remains: `src/components/charts/RiskGauge.jsx` (Recharts `RadialBarChart`), used as a
  single-value risk gauge, not for comparing categories.
- **Gradients are used inside chart areas** — `<linearGradient>` fills on area charts in
  `src/pages/Dashboard.jsx:285-297` and `src/pages/Forecasting.jsx:181`. These are vertical alpha fades under
  area lines, not decorative 3-D shading. **Declare them** rather than claiming "no gradients".
- Card-level `box-shadow`/glow exists on containers (the "dark-glow" design system), **not on plot areas**.

### Minimum font sizes

- Charts: **11 px** (`fontSize: 11`, 15 occurrences) and 12 px (38 occurrences) — `src/**/*.jsx`.
- Body text: smallest Tailwind class in use is **`text-[10px]`** (7 occurrences), then `text-[11px]` (58).
  Most body copy is `text-xs` (12 px, 228 occurrences) and `text-sm` (14 px, 156).

> **Flag for the dissertation:** 10 px and 11 px are below the ~12 px commonly recommended as a minimum.
> They are used for provenance badges, axis ticks and footnotes. Report the real range honestly.

### Animation and reduced motion

- **Framer Motion 12.42.2**, imported in **11** component files.
- `prefers-reduced-motion` **is respected**, via two dedicated hooks: `src/hooks/useReducedMotion.js` and
  `src/hooks/useMotionAllowed.js`. The latter also folds in the Low-Sensory accessibility mode, so animation
  is disabled either by OS setting or by in-app preference. Consumers include `TopNav`, `StatTile`,
  `KpiCard`, `RiskGauge` and `ChartCard`.

### Contrast ratios — measured, not estimated

Computed with the project's own tested `src/utils/contrastRatio.js` over the real tokens in
`src/config/designTokens.js` and `src/theme/chartTheme.js`. **Lowest five:**

| # | Pair | Ratio | AA normal text (4.5:1) | AA non-text (3:1) |
|---|---|---|---|---|
| 1 | Light: chart gridline `#e6ece9` on `#FFFFFF` | **1.20** | FAIL | FAIL |
| 2 | Dark: chart gridline `#26332e` on `#0F1713` | **1.38** | FAIL | FAIL |
| 3 | Light: chart green `#22c55e` on `#FFFFFF` | **2.28** | FAIL | FAIL |
| 4 | Light: brand green `#16A34A` on `#FFFFFF` | **3.30** | FAIL | PASS |
| 5 | Dark: chart red `#dc2626` on `#0F1713` | **3.77** | FAIL | PASS |

**All body text passes AA in both themes:** dark body 16.60:1, dark muted 7.03:1, dark subtle 5.94:1;
light body 16.59:1, light muted 5.96:1, light subtle 5.04:1. Dark-theme brand green 8.00:1.

**Honest reading:** rows 1–2 are decorative gridlines (arguably exempt from 1.4.11, but worth stating).
**Row 3 is a genuine finding** — the light-theme chart green at 2.28:1 fails even the 3:1 non-text threshold
where it carries meaning. Do not claim blanket AA compliance for charts; claim it for text, and disclose this.

---

## 8. Cost

**Largely not available.** Specifically:

- **Plan and price:** the provider is configured entirely through Supabase secrets (`AI_BASE_URL`,
  `AI_API_KEY`, `AI_MODEL` — confirmed present via `npx supabase secrets list`, last updated 2026-11-10).
  Secret **values are returned as SHA-256 digests, not plaintext**, so the live model name and endpoint
  **cannot be read back from the project.** Project history indicates Groq with `openai/gpt-oss-120b`, but
  that is conversation history, not a verifiable repo fact. Confirm in the Supabase dashboard.
- **Published per-token price:** not in the repository. Must be read from the provider's current pricing
  page — do not quote a remembered figure in a dissertation.
- **Average tokens per recommendation explanation / per assistant question: not available.** I searched the
  Edge Functions for usage accounting (`grep -rn "usage\|total_tokens\|prompt_tokens" supabase/functions/`)
  and **found none** — the API response's `usage` block is never read or persisted. There are no logs to average.
- **Cost per active user per month:** cannot be computed without the two inputs above. **No estimate given.**

**To make this measurable** (small change): in `supabase/functions/_shared/aiClient.ts`, read `usage` from the
provider response and persist `{prompt_tokens, completion_tokens, model}` per call. After a week of demo use
you would have a real average rather than an assumption.

---

## 9. Supporting quality figures (measured now)

| Measure | Value | Command |
|---|---|---|
| Frontend tests | **461 passing / 56 files** | `npx vitest run` |
| ESLint | **0 errors, 0 warnings** | `npx eslint src e2e` |
| Production build | succeeds | `npm run build` |
| Supabase migrations | **16** (`0001`–`0016`) | `ls supabase/migrations` |
| Python tests | **not re-run here** — `PHASE3_STATUS.md` records 70/70 for `ml/sentiment` | `pytest ml/sentiment` |

---

## Summary — what this report does and does not resolve

**Resolved:** placeholder 5 (versions, with a React 18→19 correction), 17 (per-language table + kappa =
not conducted), 18 (benchmark SQL confirmed run), 19/20/33 (partially — real Prophet figures and the DM
result, with the target missed and O2 unsupported), 2–4 (visualisation principles, with two honest
qualifications), and scenarios S3/S4/S5.

**Still open:** response times (§5 — needs the password), S1/S2 (§6 — same), the full six-model forecasting
comparison (§3 — never saved; re-run the notebook), and cost (§8 — no token logging exists, and the price
must come from the provider and your bills).

**Two findings that change what Chapter 4/5 can claim**, and should not be softened:
1. **MAPE ≈ 30% on the only saved forecasting result — the <15% target is not met on that series.**
2. **The Diebold–Mariano test returns p = 0.86 — the sentiment-enhanced forecast does not significantly beat
   the sales-only baseline.** O2's hypothesis is not supported by the evidence currently on disk.
