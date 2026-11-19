# INSIGHTAID AI — Project Context (FYP II)

> This file persists project context across Claude Code sessions. It is Part A of the FYP II master prompt. Work phase by phase per the full master prompt (kept by the user); do not do everything in one go.

## What the system does

INSIGHTAID AI reads **multilingual customer opinion (English, Bahasa Melayu, Mandarin, including code-mixed text)** together with **sales history**, and produces **actionable recommendations**, not just charts. Pipeline (five layers):

1. Data collection (TikTok, X, Shopee reviews, Google reviews, sales records)
2. Data processing (store raw → language detection → cleaning → two paths: translate-then-classify AND classify-in-original-language → daily/weekly aggregates)
3. Storage (Supabase / PostgreSQL, Row Level Security)
4. AI analytics engine (sentiment, forecasting, crisis detection, rule-based recommendations)
5. Decision support dashboard

**Student**: Muhammad Danish Alif Bin Azrul (22006390), Bachelor of Computer Science (Hons), Universiti Teknologi PETRONAS, Data Analytics with Financial Management. **Supervisor**: Ts. Ahmad Izuddin Bin Zainal Abidin.

## Research objectives and FIXED acceptance targets (set before development — do not change them)

| Objective | Gap | Target |
|---|---|---|
| O1: Multilingual sentiment model using **XLM-RoBERTa** | G1 | Accuracy ≥ 80% overall AND ≥ 75% for each language separately; macro-F1 reported; ≥ 200 comments double-labelled with Cohen's kappa reported |
| O2: Sentiment-enhanced sales forecast vs sales-only baseline (**Prophet** main model) | G2 | MAPE < 15% using rolling-origin evaluation AND a statistically tested improvement over the sales-only version (Diebold–Mariano test) |
| O3: Integrated DSS (crisis detection + recommendation engine + dashboard) | G3, G4 | Crisis alerts correct on simulated and real events (precision/recall, lead time); response < 3 s; UAT satisfaction ≥ 4.0 / 5.0 |

**Scientific honesty rule**: the project is designed to be falsifiable. If the sentiment-enhanced forecast does NOT beat the baseline, or a target is missed, the code and reports must say so plainly. **Never hard-code, invent, round up or "massage" a metric.** Every number shown in the app or written to `/reports` must be produced by a script that can be re-run.

## Model comparison arms (decided in FYP I — keep all of these)

- **Sentiment**: VADER (rejected, reference point only), TF-IDF + Logistic Regression (baseline), mBERT (comparison), **XLM-RoBERTa (main)**.
- **Forecasting**: naive/simple average (basic baseline), ARIMA/SARIMA (statistical baseline), **Prophet (main)** — run once *without* and once *with* sentiment regressors — XGBoost (ML comparison), LSTM (deep learning comparison).
- **Crisis detection**: rule = share of negative comments > threshold (provisionally 60%) in a time window **plus** the rate of increase of that share, then a secondary Scikit-learn classifier to suppress false alarms from ordinary volume spikes.
- **Recommendation engine**: rule-based and explainable (each recommendation shows the rule and the evidence that triggered it). Optional LLM layer only for rewording, never for deciding.

## Existing implementation (as of FYP II start)

- Frontend: React + Vite, React Router, Tailwind CSS, Recharts, Framer Motion, Lucide React, JavaScript (no TypeScript in `src/`).
- Backend/DB: Supabase (PostgreSQL, Supabase Auth, Row Level Security).
- Quality: ESLint, Vitest, Playwright.
- **Note**: verify current installed versions and actual build status against this file via `docs/AUDIT.md` (Phase 0) rather than assuming — this file states FYP II's starting intent, not necessarily the exact current state of every dependency.

> The older FYP plan mentions Streamlit/Flask/MongoDB. **The current source of truth is the React + Vite + Supabase implementation.** Do not migrate the frontend to Streamlit. Python is used for the ML/data layer only.

## Methodology

CRISP-DM for the analytics modules (Business Understanding → Data Understanding → Data Preparation → Modelling → Evaluation → Deployment), framed overall as **Design Science Research** (build an artefact, then evaluate it).

## Working rules

1. **Audit before you change anything.** Do not rewrite working code; extend it.
2. Work **one phase at a time**. At the end of each phase: run ESLint (zero errors), run tests, commit with a clear message, and give a short summary of what changed, what was tested, and what is still open. Then stop and wait for go-ahead.
3. Ask before: deleting files or tables, changing the Supabase schema destructively, adding paid services, or changing any acceptance target.
4. Keep everything **free/open-source or free-tier** (affordability is a research claim, gap G4).
5. Fix random seeds, pin library versions, log every experiment's config for reproducibility.
6. Every dataset needs a `DATA_CARD.md` entry: source URL, licence, size, date range, language mix, cleaning applied, real/scraped/synthetic. Verify a dataset exists and its licence allows academic use before downloading it. If unavailable, say so and propose an alternative — never silently substitute.
7. Respect platform Terms of Service and PDPA 2010 (Malaysia): no storing personal identifiers from scraped comments (hash or drop usernames), no scraping behind logins.
8. Never mark a target as "passed" in the UI or reports unless the computed value passes it.

## Standing session rules (carried over, still in force)

- Never fabricate scraped/live marketplace data from unverified sources — a provenance issue, not a tooling one.
- Never touch, apply, or pop any pre-existing git stash without being told to.
- Supabase access only through `src/services/*Service.js`; pure logic in `src/utils/*.js` with matching Vitest tests; components in `src/components/`.
- Quality gate before considering any change done: ESLint zero errors/warnings, full test suite passing, `npm run build` succeeds.
