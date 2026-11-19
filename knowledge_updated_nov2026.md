# InsightAid AI — Project Knowledge Base
### For Technical Paper + Dissertation Writing

**Full title**: An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups
**Student**: Muhammad Danish Alif Bin Azrul (22006390)
**Institution**: Universiti Teknologi PETRONAS
**Repository**: `C:\Users\User\FYP\insightaid-ai`
**This document compiled**: 2026-11-08, from the full development history up to commit `b51a4a0`

**How to use this file**: every section below is written to be lifted directly into a paper/dissertation section (Introduction, Methodology, Results, Limitations, etc.), but **read the "What's real vs synthetic vs assumed" note in each module before writing a claim** — academic integrity requires being precise about which numbers are measured, which are from synthetic demo data, and which are documented assumptions. This document never blurs that line, and your paper shouldn't either.

---

## 1. Problem Statement and Objectives

Early-stage Malaysian startups and SMEs generate data across sales records, customer reviews, and social media (Shopee, TikTok, X, Threads) but lack the resources to professionally analyze it. Existing BI tools either require technical expertise, assume an established data pipeline, or cost too much for a pre-revenue or early-revenue business.

**Core objectives the system addresses**:
1. Multilingual sentiment analysis (English, Bahasa Melayu, Mandarin, and code-mixed "Manglish") over customer reviews and social posts.
2. Early crisis detection — surfacing a brewing reputational/operational problem from real signals before it's obvious from raw numbers.
3. Sales forecasting with honest uncertainty quantification.
4. Rule-based, explainable business recommendations — not an opaque LLM opinion.
5. A planning path for businesses with **no data yet** (AI-assisted business profile extraction + scenario modeling), not just businesses already collecting data.
6. Throughout: **never fabricate a number**. Every value traces to a real computation; anything not computable says so explicitly rather than guessing.

That last point is the system's actual design thesis and should probably appear in your Introduction/Methodology framing — it's the one architectural decision that shaped almost every other decision in the system (detailed in §9).

---

## 2. System Architecture Overview

**Stack**: React 18 (JavaScript, no TypeScript in the frontend) + Vite, Tailwind CSS 4 (CSS `@theme` tokens, no `tailwind.config.js`), Recharts 3 for charts, Framer Motion for animation. Backend: Supabase (Postgres + Row-Level Security + Edge Functions running on Deno). ML/offline training: Python (pandas, scikit-learn, transformers, statsmodels, Prophet, XGBoost, TensorFlow/Keras), run in Google Colab notebooks, with results inserted into Postgres via generated SQL.

**Layering convention** (relevant for a "System Design" section): pages never call Supabase directly. The chain is always `page component → *Service.js (Supabase I/O) → *.js pure utility (computation, unit-tested, zero I/O)`. This separation is what makes the pure analytical logic testable without a database and is a deliberate, citable design decision.

**Two operating modes, one codebase**: "E-Commerce" mode (data-driven, for a business already selling) and "Business Startup" mode (planning-driven, for a pre-data business). This is a pure client-side display filter (`src/contexts/ModeProvider.jsx`), not two different databases or code paths — both modes read the same underlying tables.

**Authentication/data isolation**: Supabase Auth + Postgres Row-Level Security. Every per-user table has a policy of the shape `auth.uid() = user_id`, so one user's SQL query can only ever see their own rows — enforced at the database layer, not just the UI. `model_versions` (ML model benchmark metadata) is the one deliberately shared/global table — not user-scoped, because a trained model's accuracy isn't a per-user fact.

---

## 3. Data Ingestion Pipeline

**Entry point**: Dataset Management page → CSV/JSON/Excel upload (`src/services/dataPipelineService.js`).

**Templates**: Sales (`date, product, category, quantity_sold, unit_price, revenue, discount, cost`), Reviews (`date, product, review_text, rating, platform`), Social (`date, platform, content, engagement, likes, comments, shares`), Product, Expenses. A column-synonym matcher (`src/utils/csvTemplates.js`) auto-detects a template from real-world header variants (e.g. "Order Date" → `date`, "Total Amount" → `revenue`) via a normalized lookup table — this is what makes the system usable without forcing the user into an exact column format, a real usability contribution worth describing in your Methodology.

**Three-stage storage, each stage preserving what came before**:
1. `raw_data` — the upload, byte-for-byte, as JSON (`payload` column), never modified after insert. This is a "preserve raw" record: if the parsing/matching logic has a bug later, the original data is never lost.
2. `processed_data` — for the two **text-bearing** templates only (reviews, social): preprocessed text, detected language, extracted features (hashtags, mentions, text length), and — for reviews only — a sentiment label from the rating heuristic (§4). Sales/Product/Expenses rows are *not* processed into this table (a real architectural gap, documented in §10).
3. `daily_aggregates` — per (date, source, platform) rollups: mention volume, comment volume, average sentiment, positive/negative ratios. This is what Crisis Detection and the Dashboard actually read for speed, rather than re-aggregating raw rows on every page load.

**A real engineering bug worth citing as a "lessons learned" item**: Supabase's PostgREST layer silently caps any unfiltered `select()` at 1,000 rows by default, even without an explicit `.limit()`. This was discovered live during development when an account with 4,087 sales rows produced a forecast anchored to a stale ~17-month-old cutoff date, because the forecasting code only ever saw the first 1,000 rows. Fixed by paginating with `.range()` in a loop. This is a legitimate, concrete example of a production data-correctness bug for a "Testing and Validation" or "Challenges Faced" section.

---

## 4. Module: Sentiment Analysis

**What's real vs synthetic vs assumed**: the model *training* is real, completed, and measured. The *live, in-app* sentiment label is a documented heuristic, not the trained model. This split is itself worth a paragraph in your dissertation — it's an honest statement about the gap between an ML proof-of-concept and a production-wired inference pipeline, which is a common and citable real-world software engineering situation.

### 4.1 Offline-trained classifiers (real, measured results)

Three models trained and evaluated on a real labeled multilingual review dataset (`ml/notebooks/01_sentiment_data_preparation.ipynb` → `03_train_sentiment_models.ipynb`, run in Google Colab):

| Model | Accuracy | F1 |
| --- | --- | --- |
| XLM-RoBERTa (XLM-R) | 84.1% | 0.807 |
| mBERT | 82.5% | 0.791 |
| TF-IDF + classical classifier | 74.3% | 0.727 |

A real, citable finding from this training run: **translating non-English text to English before classification *hurt* accuracy** rather than helping (e.g. XLM-R dropped from 84.1%/0.807 to 71.9%/0.689 under translate-then-classify). This is a legitimate empirical result about multilingual NLP for low-resource language mixes (Bahasa Melayu, Manglish) worth a Results/Discussion paragraph: native multilingual embeddings handled the code-mixed text better than a translate-and-classify pipeline.

These three models' metrics are meant to be written into the `model_versions` table (shared/global, read by the Model Performance page) via generated SQL — **as of this writing, that SQL has not been run**, so the live Model Performance page shows "Not yet evaluated." This is an easy, low-risk action item before any demo or data screenshot for the paper: run the SQL, or explicitly note in your paper that it's a completed-but-not-yet-deployed training result.

### 4.2 Live, in-app sentiment label (what the dashboard actually shows today)

`src/utils/ratingSentimentHeuristic.js` — a star rating of 4-5 → positive, 3 → neutral, 1-2 → negative, confidence 0.5-0.6, normalized score in [-1, 1]. Stored with `model_name = 'rating_heuristic_v1'` specifically so it's never confused with a trained model's output in the database itself. Applies only to the `reviews` template (which has a `rating` column); `social` posts have no rating column and so get **no sentiment at all** (`null`), never guessed.

### 4.3 Language detection

`src/utils/textPreprocessing.js`'s `detectLanguage()` — a CJK-character-ratio check for Mandarin, and a Malay-vs-English keyword-hit-ratio heuristic for English/Bahasa Melayu/code-mixed ("ms-en"). Not a trained model; a transparent, inspectable rule. On the real synthetic demo dataset (see §11), this produced a realistic distribution: English ~58%, Bahasa Melayu ~21-22%, unknown ~10-13%, Mandarin ~6-11%, code-mixed ~0.4-2% (exact figures drift slightly depending on which account/dataset snapshot — see §11 for the specific verified numbers from the demo account).

### 4.4 Live UI features (for a "System Features" section)

- Day-by-day sentiment tracking: a dropdown lets a user pick any day within the last 7 days and see that specific day's positive/neutral/negative split (not just "today"), with the delta measured against 7 days before *that* day, not always "today vs last week." Implemented via `computeSentimentScoresSeries()` in `src/utils/socialAnalytics.js`.
- Trending hashtags also track the picked day (`computeTrendingHashtagsByDate()`), bucketed by the exact same date-string convention (`collected_at.slice(0, 10)`) used everywhere else in the pipeline, to avoid timezone drift between charts.
- An "evidence wall" of real posts, shown in their original language (no translation), each tagged with platform/language/engagement.
- Honest "Unavailable" states for emotion analysis (only 3-class sentiment exists — no emotion classifier was built) and region/geo sentiment (no location field is ever captured during ingestion).

---

## 5. Module: Crisis Detection

**What's real vs synthetic vs assumed**: the detection *logic* is fully real and implemented (`src/utils/crisisDetection.js`, `src/config/crisisThresholds.js`). There is **no validated ground truth** anywhere in the project — no manually-labelled "this really was a crisis" dataset exists, so there is no real precision/recall figure to report. Say this plainly in your Evaluation section rather than inventing one; it's a legitimate, common limitation for this class of unsupervised/rule-based anomaly system and reviewers will respect an honest statement of it far more than a fabricated number.

### 5.1 The seven signals

Each compares *today* against that business's **own** recent 7-day baseline — not a fixed threshold that would be unfair to a small business versus a large one. This "relative to your own history" design is the single most citable methodological choice in this module.

| # | Signal | What it measures | Thresholds |
| --- | --- | --- | --- |
| 1 | `negative_ratio_level` | Is today's negative-mention share past a flat line? | warning ≥ 30%, critical ≥ 50% |
| 2 | `negative_ratio_velocity` | Is the negative ratio *rising* vs. the 7-day baseline mean? | warning +10pp, critical +20pp |
| 3 | `mention_volume_level` | Is today's volume a multiple of the business's own baseline? | warning 1.5×, critical 2.5× |
| 4 | `mention_volume_velocity` | Did volume jump day-over-day? | warning +50%, critical +100% |
| 5 | `rating_deterioration` | Has the average star rating dropped vs. baseline? | warning 0.3pts, critical 0.6pts |
| 6 | `sentiment_anomaly` | Z-score of today's negative ratio vs. baseline — catches a small business where even a few bad reviews is a big deviation even if the raw percentage is small | warning \|z\|≥1.5, critical \|z\|≥2.5 |
| 7 | `review_volume_anomaly` | Same z-score idea, applied to mention volume | warning \|z\|≥1.5, critical \|z\|≥2.5 |

With fewer than 3 prior days of history, a signal honestly reports `insufficient_data` rather than computing a number from too little data.

### 5.2 Scoring

Each triggered signal adds points (10 for warning-level, 20 for critical-level), summed and capped at 100. Risk level: Normal < 25, Warning 25-59, Critical ≥ 60.

### 5.3 Episode / historical view (the redesign's flagship feature)

`src/utils/crisisHistory.js` runs `detectCrisis()` once per day over a growing/truncated series (reusing the exact same scoring function — never a duplicated, divergent copy of the logic) to produce a full historical risk timeline. Consecutive warning/critical days are grouped into **episodes** (`{start, end, peakScore, peakDay, triggeredSignals}`). A real, verified property of this implementation: the known synthetic crisis window in the demo dataset (a product batch quality incident) is detected **from the data alone** — no date is ever hard-coded in the detection logic; this was explicitly tested (`crisisHistory.test.js` uses deliberately different, non-matching dates specifically to prove the logic is date-agnostic, not hard-coded to the demo scenario).

### 5.4 What the live demo account actually shows (real, verified 2026-10-22)

On the demo account (synthetic Embun Botanica skincare data, see §11): risk level **Warning, 30/100**, from two real triggered signals — negative ratio at 50% (critical-level on that signal specifically) and a rating drop of 0.59 points. This maps to a real embedded storyline in the synthetic dataset: a product batch (fictional batch ID "CS0826") had a quality defect, generating genuine complaint/refund posts across platforms and languages, followed by a replacement batch resolving it — a coherent, demonstrable "crisis detected, then resolved" narrative, useful for a Results/Case-Study section or a viva demo.

---

## 6. Module: Sales Forecasting

**What's real vs synthetic vs assumed**: the full model-comparison methodology (ARIMA/Prophet/XGBoost/LSTM/moving-average) is real, implemented, and was run against **public benchmark retail datasets** (Favorita grocery sales, Olist, Online Retail II) — not the synthetic demo business's own data. A separate, newer, simpler in-app feature computes a real baseline forecast against whatever sales data a specific account actually uploaded. Keep these two clearly separate when writing: one is "model comparison methodology, validated on public benchmark data"; the other is "an on-demand, lightweight, per-account baseline."

### 6.1 Offline model comparison (`ml/forecasting/`, run via Colab)

Five candidates: moving-average (baseline), ARIMA (grid-searched p,d,q), Prophet (sales-only and a sentiment-enhanced variant using review sentiment as a regressor, where paired review data exists), XGBoost, and LSTM (gated — only trained when a series has ≥730 days of history, since a smaller dataset doesn't statistically justify a deep model over classical alternatives, a methodological decision worth citing: "LSTM training is conditional on data volume, not applied indiscriminately").

**Evaluation methodology — this is your most citable methods paragraph**: rolling-origin (walk-forward) cross-validation, never a random train/test split, because shuffling destroys the temporal ordering a forecast depends on. Every candidate model is evaluated on the *identical* set of time windows, so comparisons are fair. Metrics: MAE, RMSE, MAPE (the project's own target: MAPE < 15%). The winning model (`is_best`) is chosen purely by lowest MAPE from the real numbers — never hard-coded.

A real, citable finding from this training run: on the public benchmark data, XGBoost most often had the lowest MAPE among the five candidates, though results varied meaningfully by series (grocery category) — a legitimate "no single model dominates" result common in forecasting literature.

### 6.2 In-app, on-demand baseline (`supabase/functions/run-forecast/`)

A Supabase Edge Function that reads the calling user's own uploaded sales data (paginated correctly — see the 1,000-row bug in §3), aggregates it to a daily revenue series (zero-filling days with no transactions as a legitimate 0, not a gap), and runs a real moving-average forecast with the same rolling-origin evaluation discipline as the offline package, computed **in TypeScript, in milliseconds**, with no manual SQL or Colab round-trip. This exists specifically because ARIMA/Prophet/XGBoost/LSTM only exist as Python code and cannot run inside a Deno Edge Function — a genuine platform constraint worth naming explicitly in a "Design Constraints" or "Implementation Challenges" section, rather than hidden. The uncertainty band (`±1.96×RMSE`, flat across the whole horizon) is mathematically correct given this simple model, not a display bug — a real, honestly-disclosed limitation of a moving-average baseline versus a model with genuine day-by-day predictive variance (§10).

---

## 7. Module: AI Recommendations

**What's real vs synthetic vs assumed**: entirely real logic; no synthetic shortcuts. This module is the clearest illustration of the project's core design thesis (§9) and is worth a dedicated subsection in your Methodology: **a two-layer architecture where the LLM is never the source of truth.**

- **Layer 1 (rule engine, `src/utils/recommendationRules.js`)**: pure, deterministic, zero dependency on React/Supabase/Gemini. Six analytical rules, each firing from a real computed condition: investigate customer complaints (negative-sentiment velocity *and* rising volume together — directly implementing a textbook "IF X AND Y THEN recommend Z" rule), activate crisis response (critical risk), review triggered signals (warning risk — added specifically to close a coverage gap found during testing: a warning-level risk that wasn't the specific complaints combination previously produced zero recommendations at all), consider scaling marketing (normal risk + high data readiness), collect more data (low data readiness), and reassess growth channels (a stated revenue target falls short of the growth-case scenario projection by ≥10%).
- **Layer 2 (Gemini explanation, `supabase/functions/explain-recommendations/`)**: asks an LLM only to *phrase* Layer 1's existing output better (a `rationale` and `context` string) — it is structurally incapable of inventing a new recommendation, changing a priority, or altering the evidence, because the function discards every other field Gemini might return. If Gemini is unreachable, unconfigured, or rate-limited, Layer 1's results are shown unchanged — the system never blocks on, or silently depends on, the LLM being available. This "LLM proposes wording, never proposes facts" pattern is a genuinely defensible, citable architectural answer to the common criticism that LLM-based tools hallucinate numbers.

**Known operational constraint worth stating honestly in Limitations**: Google's Gemini free tier caps at 20 requests/day for the model used (`gemini-3.8-flash`), shared across every AI-explanation feature in the whole app (recommendations, onboarding extraction, report narration). This was hit and confirmed live via a real 429 `RESOURCE_EXHAUSTED` response during development — not a code defect, a quota limit. A paid tier removes it; this is a cost decision, not yet made as of this writing.

---

## 8. Module: Business Planning / Scenario Engine (`src/utils/scenarioEngine.js`)

For a business with no transactional data yet. Three deterministic scenarios (conservative ×0.7, expected, growth — default +40% units unless the user states their own growth rate) computed from stated/AI-extracted assumptions (selling price, cost per unit, monthly units, operating costs). Break-even is calculated as `total monthly operating costs ÷ (selling price − cost per unit)`. Any input missing from a calculation is listed in an `insufficientFields` array rather than being defaulted to zero — the formula's output is either fully traceable to real inputs or it doesn't produce a number at all.

**Onboarding intake** (the no-data path): a structured form (business sector dropdown, revenue target, free-text description) plus an AI-extraction step (`supabase/functions/extract-business-profile/`) that asks Gemini to pull structured fields (business type, target customer, assumed pricing, etc.) from the free-text description — fields it can't confidently infer are simply omitted, never guessed. The structured sector/revenue inputs are always treated as user-provided and are never overwritten by whatever the AI extraction step might also infer for the same fields.

---

## 9. The Core Design Thesis: Honesty as an Architectural Constraint

This is the one idea worth stating explicitly and early in your paper, because it explains nearly every other decision documented above:

> Every number displayed must trace to a real, inspectable computation. Where a real computation genuinely cannot be made (no data, no model, a structural gap in what's captured), the system states that honestly instead of estimating, defaulting to zero, or hiding the gap.

Concrete mechanisms that enforce this, each independently citable:
- A **5-state UI contract** (loading / success / empty / error / unavailable) applied via a shared hook+component pair (`useAsyncData` + `AsyncSection`), so "no data" and "a real zero" are never visually indistinguishable.
- **Provenance tagging** on every business-profile field (`user_provided` / `ai_extracted` / `default_assumption`) — shown as a badge in the UI, so a reader always knows whether a number was typed by a human, inferred by an LLM, or assumed by the system.
- Heuristic outputs are **always named as such** in the data itself (`model_name = 'rating_heuristic_v1'`), not just in a UI label, so the distinction survives even if someone queries the database directly.
- Missing capabilities render as an explicit **"Unavailable — reason"** card rather than being silently omitted from the page.

---

## 10. Known Limitations (write these into your Limitations/Future Work section verbatim — each is real and verified, not hypothetical)

| Limitation | Why | Possible future work |
| --- | --- | --- |
| No crisis-detection ground truth | No manually-labelled "this was a real crisis" dataset exists | A validation study with real business owners labeling historical events |
| Sentiment in production is a heuristic, not the trained ML model | The three trained classifiers were never wired into the live ingestion pipeline as an inference service | Deploy one of the trained models (XLM-R) behind an inference endpoint |
| In-app forecast is baseline-only (moving average) | ARIMA/Prophet/XGBoost/LSTM only exist as Python; Deno Edge Functions can't import them | A small Python microservice (e.g. Cloud Run) the Edge Function could call |
| Forecast uncertainty band is flat across the whole horizon | A direct mathematical consequence of a moving-average baseline, not a bug | Use Prophet/ARIMA's native day-by-day confidence intervals |
| Per-post engagement (likes/comments/shares) is not stored individually | The ingestion pipeline sums them into one `engagement` number at upload time | Store the three components separately in `processed_data`/`features` |
| No hour-of-day data | The data model only ever captures a date | Would need ingestion schema change; explicitly not fabricated as a "best time to post" feature |
| Live marketplace/social API sync (TikTok, X, Threads) largely not configured/approved | Developer-account approval processes (platform app review) take real calendar time, independent of the codebase | Complete the approval processes; code paths already exist and degrade honestly when absent |
| Gemini free-tier quota (20 requests/day) | Google's own rate limit, shared across every AI feature | Paid tier |
| No fold-level backtest predictions persisted | Only the final forecast and averaged metrics are stored, not each rolling-origin fold's individual predictions | Would need a new table/column — a real, not-yet-made schema change |
| Visual/UX redesign in progress | Of a six-page "premium chart kit" redesign effort, only the Crisis Detection page was rebuilt as of this writing | Remaining pages: Dashboard, Forecasting, Sentiment Analysis, Social Intelligence, AI Recommendations |

---

## 11. Demo Data (for Results/Screenshots — know precisely what's real vs synthetic)

The primary demo account (`usertest1`) represents a fictional Malaysian skincare brand, **"Embun Botanica"** (Lab Embun, Shah Alam) — entirely synthetic data, generated to be internally consistent (not disconnected random numbers), including a deliberately embedded crisis narrative (a product batch quality incident) for demonstrating Crisis Detection end-to-end. **State it as synthetic data in your paper** — this is standard and expected for an FYP demo dataset, but must not be implied as real customer data.

Verified real totals from that synthetic dataset (useful if your paper includes dataset statistics):
- 4,080 real sales transactions (+ 7 product-catalog rows under the same upload), spanning 2024-09-01 to the present.
- Total transacted revenue: RM 1,849,420.30. Average selling price RM39.87/unit, average cost RM15.37/unit (58.4% gross margin).
- 7 products across 3 categories (Serum, Cleanser, Moisturizer & SPF).
- 2,810 processed review/social posts across 4 platforms (Shopee, TikTok, X, Threads) and 5 language buckets (English, Bahasa Melayu, Mandarin, unknown, code-mixed).
- 1,143 rated reviews (real sentiment labels via the heuristic): roughly 73% positive, 16% negative, 10% neutral overall.

A second demo account (`usertest2`) represents the "no data yet" / Business Startup planning path — used to verify the onboarding-extraction and scenario-planning flow independent of any uploaded dataset.

---

## 12. Testing and Quality Methodology (for a "Verification and Validation" section)

- **360 automated unit/integration tests** (Vitest) covering every pure utility and service, run on every change — e.g. `crisisDetection.test.js`, `socialAnalytics.test.js`, `recommendationRules.test.js`, `scenarioEngine` coverage, the forecasting package's own 53+ Python tests (pytest).
- **Zero ESLint errors/warnings** maintained throughout — enforced as a quality gate before considering any change complete, not an occasional cleanup pass.
- **Live verification discipline**: significant features were verified against the running application (via Playwright-driven browser automation and direct authenticated database queries), not just unit-tested in isolation — this is how the 1,000-row pagination bug (§3) and the AI-Recommendations warning-level rule gap (§7) were actually found: by checking real behavior against real data, not just reading the code.
- **Real bugs found and fixed during development** (good "Challenges and Solutions" material): a hang-on-"Loading…" caused by a missing default profile row (self-heal added with a race-condition-safe upsert pattern); `validateDataset()` ignoring the same synonym-column matching the real ingestion path already used, producing a false "missing column" error on a clean upload; the PostgREST 1,000-row silent truncation (§3); a stuck recommendation state that turned out to be real load time, not a hang.

---

## 13. Suggested Paper/Dissertation Structure Mapping

| Your document's section | Pull from |
| --- | --- |
| Introduction / Problem Statement | §1 |
| Literature Review | Not covered here — this is project-specific technical knowledge, not external literature |
| System Design / Architecture | §2, §9 |
| Methodology — Data | §3 |
| Methodology — Sentiment Analysis | §4 |
| Methodology — Crisis Detection | §5 |
| Methodology — Forecasting | §6 |
| Methodology — Recommendations | §7, §8 |
| Implementation | §2, §3, file paths cited throughout §4-§8 |
| Results | §5.4, §6.1's XGBoost finding, §11's dataset statistics, §12's test counts |
| Discussion | §9 (the honesty-by-design thesis is your strongest discussion point) |
| Limitations and Future Work | §10 |
| Testing/Verification | §12 |

---

*This document reflects the project state as of commit `b51a4a0` (2026-10-22 development session). If you make further changes to the system, ask for this file to be regenerated or updated before finalizing your paper, so cited figures stay accurate.*


---

# 14. UPDATED PRODUCT DIRECTION — DUAL BUSINESS PATHWAYS
**Direction update:** 2026-11-09  
**Status:** Proposed product direction; implementation and supervisor approval may still be pending.

This section supersedes the earlier description in §2.2 that identifies the two operating modes as "E-Commerce" and "Business Startup", and updates the no-data pathway described in §8 and §11. The original implementation history is retained above for traceability.

## 14.1 Updated platform positioning

InsightAid AI is an Agentic Business Intelligence and Decision Support System for Malaysian businesses with different levels of data readiness.

The platform has two selectable business pathways within one application and shared backend:

1. **Malaysian Local Shop — no existing datasets at onboarding.** A planning-driven and AI-assisted pathway for owners who need help establishing a structured business profile, organising products and financial information, starting simple business records, and receiving decision support from the information they provide.
2. **Business Startup — synthetic dataset-driven demonstration pathway.** An analytical BI pathway using the project's seeded synthetic business datasets to demonstrate dataset ingestion, dashboard analytics, sentiment analysis, forecasting, crisis detection and evidence-based recommendations.

The synthetic data in the Business Startup pathway is for demonstration, testing and academic evaluation. It must never be represented as actual customer or business records.

These are different user experiences, not separate applications or necessarily separate databases. They should reuse shared authentication, business identity, security policies, analytical services and agent orchestration wherever appropriate.

## 14.2 Pathway comparison

| Dimension | Malaysian Local Shop | Business Startup |
|---|---|---|
| Initial data readiness | No existing datasets required | Seeded synthetic datasets available |
| Primary objective | Help owners establish business information and make informed early decisions | Demonstrate dataset-driven business intelligence |
| Onboarding | Conversational, progressive business setup | Business profile and dataset/workspace setup |
| Main interaction | AI Business Assistant | BI dashboard and Agentic Business Assistant |
| Initial information | Owner-provided business details, products, prices, costs and objectives | Synthetic sales, product, review and social records |
| Initial analytics | Deterministic calculations and scenario modelling | Historical descriptive, diagnostic and predictive analytics |
| Forecasting | Scenario projections based on disclosed assumptions; no historical forecast without sufficient history | Actual model output from the available synthetic time series, clearly labelled as synthetic |
| Sentiment | Unavailable until suitable customer feedback is provided | Available only to the extent supported by the dataset and deployed implementation |
| Recommendations | Business setup, financial planning and operational guidance grounded in available inputs | Analytical recommendations grounded in computed findings |
| Data collection | Manual entry first; optional file and system integrations later | Existing ingestion pipeline and seeded demonstration records |
| Main UI | Guided setup, readiness, planning and actions | KPI dashboard, analytical modules and investigations |

A user should not be forced to complete every possible setup step before using the platform. The Local Shop pathway should provide value progressively as information becomes available.

## 14.3 Local Shop onboarding — proposed flow

Introduce an **AI Business Setup Assistant** as the primary onboarding experience.

The assistant should collect and organise the following information progressively:

1. Business identity: business name, business category, location at an appropriate level, operating model and preferred language.
2. Products and services: product/service name, category, selling price, unit cost where known and optional stock information.
3. Business operations: operating days, channels, suppliers, employees and other relevant operating details.
4. Financial context: known fixed expenses, variable costs, target revenue and other inputs needed for specific calculations.
5. Business objectives: increase revenue, improve margins, control expenses, manage stock, attract customers or improve customer experience.
6. Confirmation: show the extracted profile to the owner for correction and approval before saving it as the working business profile.
7. Workspace preparation: configure available capabilities, identify missing information and suggest the next useful actions.

The conversation should be progressive and ask only for information relevant to the current step or requested calculation. It should not turn into one excessively long mandatory questionnaire.

### Profile provenance

Every extracted or entered field should preserve its origin:

- `user_provided`: explicitly entered or confirmed by the owner.
- `ai_extracted`: extracted from the owner's description but not yet necessarily confirmed.
- `default_assumption`: a proposed default or scenario assumption.
- `external_source`: obtained from a connected and identified external source, if implemented.

An AI-extracted field must not silently overwrite an explicitly supplied value. Unconfirmed extracted values should be presented for owner review.

## 14.4 Local Shop data collection strategy

The no-dataset pathway means no pre-existing dataset is required at onboarding. It does not mean the system must operate indefinitely without business records.

Use three progressive stages:

**Stage 1 — Initial business information**
- Business profile.
- Product/service catalogue.
- Selling prices.
- Known unit costs.
- Known operating expenses.
- Business objectives.

**Stage 2 — Simple manual records**
- Daily revenue or transaction summaries.
- Product quantities sold.
- Expenses.
- Stock updates, where the owner can provide them.
- Optional customer feedback.

**Stage 3 — Optional integrations**
- CSV, Excel or other supported file ingestion.
- POS exports.
- Marketplace records.
- Customer reviews.
- Social platforms or other external sources, subject to API access and approval.

Do not require POS integration or file uploads before an owner can use the initial planning features.

## 14.5 Business readiness and capability engine

Introduce a **Business Data Readiness Assessment**. Its purpose is to communicate which information is available and which analytical capabilities can be supported.

Possible readiness categories:

- Business profile.
- Product catalogue.
- Selling prices.
- Unit costs.
- Operating expenses.
- Historical sales.
- Inventory records.
- Customer feedback.
- External business signals.

A simple weighted availability score can be calculated as:

`Readiness (%) = (sum of available category weights / sum of applicable category weights) × 100`

The category weights must be documented and configurable. The score measures information availability, not business health, performance, creditworthiness or probability of success. A missing optional category should not automatically be treated as a business failure.

Each capability should have an explicit state, such as:

- `AVAILABLE`
- `PARTIALLY_AVAILABLE`
- `NEEDS_INPUT`
- `INSUFFICIENT_HISTORY`
- `NOT_CONFIGURED`
- `UNAVAILABLE`

Examples:
- No historical sales: historical sales forecasting is unavailable; scenario planning may still be available.
- No product cost: actual gross profit or gross margin cannot be calculated for that product.
- No customer feedback: sentiment analysis is unavailable.
- No stock records: inventory anomaly analysis is unavailable.

The UI should explain what is missing and how the owner can provide it. It must not display a missing value as zero.

A readiness score should be accompanied by category-level explanations so the owner can understand and improve it.

## 14.6 Local Shop agent roles

Use a shared Manager Agent and orchestration layer, with pathway-specific tools and specialist roles.

Proposed Local Shop specialist roles:

1. **Business Setup Agent** — organises the business profile, identifies missing fields and guides onboarding.
2. **Financial Planning Agent** — performs deterministic pricing, cost, margin and break-even calculations when the required inputs are available.
3. **Product and Inventory Agent** — manages product information and analyses stock only when stock records exist.
4. **Growth Strategy Agent** — compares business objectives and available scenario outputs, then proposes evidence-grounded options.
5. **Business Monitoring Agent** — identifies changes in newly recorded business information and generates appropriately qualified alerts.
6. **Business Manager Agent** — interprets requests, plans tasks, selects tools, evaluates results and prepares the final decision-support response.

These are specialised agent roles, not requirements for separate LLM deployments. They may share an LLM provider while using separate prompts, responsibilities, tools and execution contexts.

## 14.7 Local Shop decision-support workflow

The signature workflow is:

`UNDERSTAND → CHECK READINESS → PLAN → EXECUTE TOOLS → EVALUATE → RECOMMEND → OWNER DECIDES`

Example request:

"My grocery shop is new. How can I improve my monthly income?"

Proposed execution:

1. Retrieve the confirmed business profile and objectives.
2. Check whether product, price, cost and expense information exists.
3. Identify missing inputs needed for the requested calculations.
4. Ask the owner for essential missing information rather than inventing it.
5. Execute available calculations, such as product gross margin or break-even.
6. Run the existing scenario engine where the required assumptions are available.
7. Compare outputs with the owner's stated objectives.
8. Explain findings, assumptions and limitations.
9. Generate prioritised recommendations with supporting evidence.
10. Save the investigation and allow the owner to track subsequent actions.

The Manager Agent must not claim to know why a business is underperforming without sufficient evidence. It must distinguish actual historical results, user-provided assumptions, AI-extracted information and hypothetical scenario outputs.

## 14.8 Business Startup pathway

Retain the existing analytical modules and synthetic Embun Botanica demonstration dataset.

The Business Startup workspace should continue to expose, where supported by the actual implementation:

- Business dashboard.
- Dataset management.
- Sentiment intelligence.
- Sales forecasting.
- Crisis detection and historical episodes.
- AI recommendations.
- Social intelligence.
- Reports.
- Agentic Business Assistant.

The Agentic Business Assistant should be able to call the existing analytical services through controlled tools. It should select tools according to the user's question and actual data availability rather than invoking every analytical module for every request.

The existing second no-data demo account may be retained as an onboarding and scenario-planning test account. It is no longer the defining experience of the Business Startup pathway under this updated direction.

## 14.9 Shared architecture and capability-based routing

Use one application and a shared intelligence layer:

`APPLICATION → BUSINESS PATHWAY → BUSINESS CONTEXT AND CAPABILITIES → AGENT ORCHESTRATION → CONTROLLED ANALYTICAL TOOLS → EVALUATION → DECISION SUPPORT UI`

The selected pathway determines the default experience and available workflow. A capability registry determines which individual tools can actually execute.

Illustrative capability object:

```js
const businessCapabilities = {
  businessProfile: true,
  productCatalogue: true,
  salesAnalytics: false,
  historicalForecasting: false,
  sentimentAnalysis: false,
  inventoryAnalytics: false,
  scenarioPlanning: true,
  financialCalculations: true,
  agenticInvestigation: true,
};
```

This object is illustrative client-facing state, not a security boundary. The backend must independently validate business ownership, permissions, data availability and tool eligibility before execution.

A Local Shop can progressively gain capabilities as the owner enters records or connects data sources. It should not need to migrate to a separate application to unlock sales analytics.

## 14.10 New product features — proposed priorities

### Priority 1: Autonomous Business Investigation

The central signature feature. The Manager Agent interprets a business question, plans an investigation, selects relevant tools, evaluates tool results and produces a traceable report.

### Priority 2: AI Business Action Centre

Turn recommendations into trackable actions with:
- Recommendation and rationale.
- Supporting evidence.
- Priority.
- Owner decision.
- Status: pending, accepted, rejected, in progress or completed.
- Review date.
- Evaluation metric.
- Follow-up result.

An accepted recommendation does not mean the system has permission to execute operational or financial actions automatically.

### Priority 3: Intelligent Data Readiness

Show which information is available, what is missing and which tools can be activated.

### Priority 4: What-If Business Simulator

Allow owners to change explicit assumptions, such as selling price, unit cost, monthly units or operating expenses, and compare deterministic scenario outputs. Clearly label every result as hypothetical, not actual business performance.

### Priority 5: Proactive Business Monitoring

Periodically check available records, detect significant changes and create alerts. Start with scheduled or manually triggered checks for the FYP prototype rather than requiring a fully autonomous 24/7 system.

### Priority 6: Explainable Evidence Panel

Every important finding should show:
- Data source.
- Date range.
- Record count, where applicable.
- Calculation or model used.
- Assumptions.
- Warnings and limitations.
- Whether the result is observed, predicted or hypothetical.

## 14.11 AI Business Action Centre workflow

The proposed action lifecycle is:

`DETECT → INVESTIGATE → RECOMMEND → OWNER APPROVES → MONITOR → EVALUATE`

The platform should retain the original evidence and baseline used when a recommendation was created. Later evaluation should compare new information with that baseline, while accounting for changes in data availability and time period.

Do not claim that an accepted recommendation caused an improvement solely because a metric changed afterwards. Describe the observed change and avoid unsupported causal conclusions.

## 14.12 Data provenance and data-type contract

Standardise provenance labels across ingestion, calculations, charts, agent tool outputs and reports.

Suggested classifications:

- `REAL_USER_DATA`
- `USER_PROVIDED_ASSUMPTION`
- `AI_EXTRACTED`
- `SYNTHETIC_DEMO_DATA`
- `EXTERNAL_API_DATA`
- `MODEL_PREDICTION`

These labels describe the origin or nature of information and should not be treated as interchangeable.

Every important output should retain relevant provenance metadata. A model prediction based on synthetic historical records should be identifiable as a prediction derived from synthetic demo data.

## 14.13 Proposed database extensions

Inspect the existing Supabase schema before creating tables. Reuse equivalent structures wherever possible.

Potential additions or extensions:

| Table / entity | Purpose |
|---|---|
| `business_workspaces` | Selected pathway and workspace configuration |
| `business_profiles` | Structured business information |
| `business_profile_fields` | Field-level provenance and confirmation status |
| `business_capabilities` | Available capability states |
| `business_products` | Manually registered products |
| `business_daily_records` | Simple daily revenue and expense records |
| `business_readiness` | Readiness assessments and category details |
| `agent_investigations` | Investigation sessions |
| `agent_tasks` | Planned and executed tasks |
| `agent_tool_logs` | Tool execution and result metadata |
| `agent_actions` | Recommendation/action lifecycle |
| `agent_memory` | Relevant historical business context |

All user/business records must preserve the existing Supabase authentication and RLS isolation principles. Avoid duplicating existing business profile, product, recommendation or agent tables.

## 14.14 Technical implementation principles

- Preserve the existing React, Vite, JavaScript, Tailwind, Supabase and Vercel architecture unless a documented technical reason justifies a change.
- Keep frontend application code in JavaScript; existing Supabase Edge Functions may continue using TypeScript.
- Reuse existing analytical utilities and service-layer boundaries.
- Keep LLM credentials and privileged database credentials server-side.
- Treat LLM output as untrusted structured input and validate it before execution.
- Use a controlled tool registry with explicit input schemas, ownership checks and execution permissions.
- Keep analytical calculations deterministic and testable where possible.
- Apply maximum tool calls, iteration limits, timeouts and API cost controls.
- Persist investigation state and tool logs so investigations can be inspected.
- Do not allow the Manager Agent to query arbitrary database tables or execute arbitrary code.
- Use human approval for external or consequential business actions.

## 14.15 Updated development roadmap

**Phase 1 — Two-pathway foundation**
- Update the selection screen and pathway terminology.
- Separate navigation and dashboards.
- Add workspace configuration.
- Preserve existing modules and data isolation.

**Phase 2 — Local Shop onboarding**
- Conversational business setup.
- Structured profile extraction and confirmation.
- Product and financial information.
- Business objectives.
- Readiness and capability assessment.

**Phase 3 — Local Shop decision support**
- Financial calculations.
- Break-even analysis.
- Scenario engine integration.
- Product margin analysis.
- Business planning recommendations.

**Phase 4 — Agentic orchestration**
- Manager Agent.
- Controlled tool registry.
- Dynamic tool selection.
- Specialist agent roles.
- Iterative evaluation and investigation history.
- Transparent investigation timeline.

**Phase 5 — Action Centre and memory**
- Recommendation tracking.
- Owner approval and feedback.
- Historical context.
- Follow-up evaluation.

**Phase 6 — Proactive intelligence and evaluation**
- Scheduled monitoring.
- Business alerts.
- Agent orchestration evaluation.
- Recommendation relevance testing.
- Usability evaluation.

For a feasible FYP scope, prioritise Phases 1–4 and a working subset of Phase 5. Proactive monitoring can be a limited prototype feature.

## 14.16 Updated academic positioning

The earlier project title is:

"An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups."

The new target population and no-dataset pathway may make the title too narrow. A possible revised title for supervisor discussion is:

"An Agentic Business Intelligence and Decision Support System for Malaysian Local Businesses with Varying Data Readiness."

This is a proposed title, not an approved change.

The research contribution should focus on how a shared Agentic BI and decision-support architecture adapts its onboarding, analytical capabilities and investigation workflows to businesses with different data readiness levels.

Potential evaluation dimensions:

- Business onboarding task completion and usability.
- Accuracy of profile extraction against owner-confirmed information.
- Correct capability/readiness classification.
- Deterministic calculation correctness.
- Agent tool-selection accuracy.
- Investigation completion and evidence grounding.
- Recommendation relevance assessed by users or domain reviewers.
- Response time and API cost.
- Usability across both pathways.

For the synthetic-data pathway, report results as experiments on synthetic demonstration data. For the Local Shop pathway, evaluate with clearly documented scenarios, user-provided inputs and, where feasible, feedback from actual local business owners. Do not present synthetic scenario results as real-world business impact.

---

# 15. DOCUMENTATION AND IMPLEMENTATION STATUS

This addendum records the proposed direction as of 2026-11-09. It does not assert that the proposed features, database changes or UI components have already been implemented.

The original sections above preserve the project's documented implementation state as of 2026-11-08. When reporting progress, distinguish:

- Existing and verified implementation.
- Completed offline experiments.
- Synthetic demonstration data.
- Proposed architecture.
- Features not yet implemented.
- Assumptions requiring validation with business owners.

The core design principle remains unchanged:

**Every number displayed must trace to a real, inspectable computation or be explicitly labelled as an assumption, synthetic value or model prediction. When the system lacks the information needed to calculate something, it must explain the limitation rather than inventing a result.**
