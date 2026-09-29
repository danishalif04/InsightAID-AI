# INSIGHTAID AI — System Audit (FYP 2)

**Date:** 2026-09-29
**Authority:** `FYP2.md` (Claude Code Knowledge Base & FYP 2 Development Master Prompt)
**Method:** Direct inspection of every source file currently on disk, plus live checks against the actual Supabase project (DNS + PostgREST). Nothing in this document is taken from prior conversation memory — the repo is the authority per FYP2.md §3.
**No files were modified as part of this audit** (aside from this document itself).

> This audit supersedes the previous `docs/INSIGHTAID_AUDIT.md` (written 2026-09-29 against the FYP1 UI knowledge base). FYP2.md is now the authoritative spec, and it asks for a much larger, data-science-oriented system than what currently exists. This version is restructured around FYP2.md §22's required checklist.

---

## Headline finding

**The repository is currently a complete FYP1-era UI shell plus a working Supabase Auth flow. None of the FYP2-specific requirements exist yet** — no Business Startup / E-Commerce mode switching, no "I have data / I don't have data yet" business-planning path, no real sentiment model, no forecasting comparison, no measurable crisis detection, no Gemini integration, no data-source adapters, no deployment configuration, no automated tests. This is not a criticism of what's there — the FYP1 frontend is solid and directly reusable — it's a statement of how much distance remains to FYP2's acceptance criteria (§86).

---

## 1. Current architecture

- **Type:** Client-side SPA. React 19.2.7 + Vite 8.1.3, `createBrowserRouter` (React Router 7.18.1), Tailwind CSS 4.3.2 (`@theme` tokens, no `tailwind.config.js`), Recharts 3.9.2, Framer Motion 12.42.2, Lucide React 1.23.0. JavaScript only, no TypeScript — matches FYP2.md §12/§13 exactly.
- **No backend server of any kind.** No `/api`, no serverless functions, no Vercel functions directory, no Flask, no Express. The only non-frontend piece is Supabase (Auth only — see §4).
- **State/data flow today:** every page imports a static fixture object from `src/data/*.js` and renders it directly. There is no fetch, no loading state that reflects real latency, no error state that reflects a real failure.
- **Design system:** matches FYP2.md §14–§16 exactly (brand `#15211c`, accent `#22c55e`, semantic colors, class-based dark mode via `ThemeProvider` + `.dark`, `insightaid.theme` localStorage key, Poppins/Inter typography). This should be preserved as-is per FYP2.md §64.

## 2. Frontend routes

Matches FYP2.md §18 exactly, plus two routes FYP2.md doesn't mention that were added for authentication:

```
/login               Login (public)
/signup              Signup (public)
/                    Dashboard          (behind RequireAuth)
/sentiment           Sentiment Analysis (behind RequireAuth)
/forecasting         Forecasting        (behind RequireAuth)
/crisis-detection    Crisis Detection   (behind RequireAuth)
/recommendations     AI Recommendations (behind RequireAuth)
/social-intelligence Social Intelligence(behind RequireAuth)
/reports             Reports            (behind RequireAuth)
/datasets            Dataset Management (behind RequireAuth)
/settings            Settings           (behind RequireAuth)
/*                   NotFound
```

Source: `src/routes/index.jsx`, `src/routes/paths.js`, `src/routes/RequireAuth.jsx`. All page routes are lazy-loaded (`src/routes/pages.js`), satisfying FYP2.md §18/§20.11.

There is **no mode-switching route or UI** (Business Startup vs. E-Commerce, FYP2.md §7–§9) and **no business-planning/onboarding route** (Path A vs. Path B, FYP2.md §10, §23–§28). These don't exist under any name — not partially built, not stubbed.

## 3. Backend / API architecture

**There is no backend.** `src/services/apiClient.js` is a single unused Axios instance pointed at `http://localhost:5000/api` (a Flask API referenced in the old FYP1 knowledge base that was never built). No other file under `src/services/` exists. No API endpoints, no server functions, no Supabase Edge Functions, no scheduled ingestion job (FYP2.md §68) of any kind.

FYP2.md §49 requires ML inference to happen behind a backend API, never in the browser. Currently there is nothing for it to call.

## 4. Supabase schema

- **Client:** `src/config/supabaseClient.js` — real client, correctly built from env vars via `src/config/env.js` (no raw `import.meta.env` outside that file, satisfying FYP2.md §20.5).
- **Auth:** working. `AuthProvider`/`useAuth` wrap `supabase.auth` (session, sign in/up/out); `RequireAuth` guards all dashboard routes. This was verified live in a prior session (redirect-when-logged-out, and a real row created in `auth.users` on signup).
- **Database schema: not deployed.** A migration exists at `supabase/migrations/0001_init.sql` (~27 tables — `profiles`, `sentiment_posts`, `crisis_status`, `forecast_series`, `recommendations`, `dataset_imports`, etc., each with a `user_id` column and an `auth.uid() = user_id` RLS policy) and a matching `supabase/seed.sql`. **Live verification just now:** `GET /rest/v1/profiles` against the project's PostgREST endpoint still returns `404 PGRST205 — Could not find the table 'public.profiles' in the schema cache`. The SQL has never been run in the Supabase SQL Editor.
- **Important new finding for FYP2 specifically:** that undeployed schema was designed against the *old* FYP1 page shapes (Dashboard/Sentiment/Crisis/Forecasting/Recommendations/Social/Reports/Datasets/Settings as flat mock-data replacements). It does **not** contain the logical entities FYP2.md §57 asks for: `raw_data`, `processed_data`, `sentiment_predictions` (with `model_name`/`model_version`/`confidence`), `forecast_results` (baseline vs. enhanced, MAE/RMSE/MAPE), `crisis_events` (triggered signals, risk score), `model_versions`, `data_sources`, `business_profiles`, `business_assumptions`, `scenario_results`, `dataset_uploads` with provenance, or `reports`. Since it was never deployed, there's no migration debt — but it should be **redesigned against FYP2.md §42/§57 before it's ever run**, not patched.
- **RLS design pattern** (per-row `user_id` + `auth.uid()` policy) is sound and reusable for the redesign.

## 5. Existing data sources

**None.** Every number in the app is a hand-written JS literal in `src/data/*.js` (`dashboardData.js`, `sentimentData.js`, `crisisData.js`, `forecastData.js`, `recommendationsData.js`, `socialData.js`, `reportsData.js`, `datasetData.js`, `settingsData.js`). Confirmed no matches for `mockData`/`fakeData`/`dummyData` naming, but the pattern FYP2.md §21 asks to search for is exactly what these files are — they're just named descriptively (`dashboardData.js`) rather than flagged as mock.

Dataset Management's "TikTok API / X API / Internal Database — Connected" cards are static strings in `datasetData.js`, not a real status check. This is precisely the anti-pattern FYP2.md §39/§76 prohibits for production ("Never fake a connected status") — currently acceptable only because the whole app is explicitly pre-production/mock-labeled in this audit, not because it's compliant.

## 6. Existing API integrations

**None beyond Supabase Auth.** No TikTok, X, Threads, Shopee, or Gemini integration exists in any form:
- No `GEMINI_API_KEY` in `.env` / `.env.example`.
- No source file references Gemini, XLM-RoBERTa, HuggingFace, Prophet, or TensorFlow (grep confirmed zero real matches — the only hits were the literal string `"XLM-RoBERTa v2.1"` used as a cosmetic label inside `settingsData.js`'s mock "Model Config" section, and `"Scenario Simulation"` card copy in `forecastData.js`, neither of which is a functional integration).
- No source-adapter modules (FYP2.md §38) exist under any naming.

## 7. Existing ML / data-analysis logic

**None.** Confirmed via search — no sentiment inference code, no forecasting model code (the Forecasting page's "forecast" is a deterministic `Math.sin()`-based synthetic-series generator in `src/data/forecastData.js`, not a statistical or ML model), no crisis-signal calculation (the Crisis Detection page's risk level, risk score, and "triggered signals" are static values), no feature-engineering code, no preprocessing pipeline, no model versioning/evaluation of any kind.

## 8. Authentication

**Real and functional**, and the one piece of FYP2 infrastructure that's actually ahead of the rest of the app:
- Supabase Auth (email/password), `src/contexts/AuthProvider.jsx` + `src/hooks/useAuth.js`.
- `src/pages/Login.jsx` / `Signup.jsx` — real forms, no mocking.
- `src/routes/RequireAuth.jsx` — redirects unauthenticated users to `/login`.
- Logout wired in `src/layouts/Sidebar.jsx`.
- RLS policies in the (undeployed) migration follow `auth.uid() = user_id` throughout, consistent with FYP2.md §58.
- No service-role key appears anywhere in the frontend (`.env`/`.env.example` only reference the anon key) — satisfies FYP2.md §58/§59.

## 9. Deployment configuration

**None exists.** No `vercel.json`, no `.vercel/` directory, no CI workflow files, no deployment documentation. FYP2.md §77–§78 requires `npm install && npm run lint && npm run build` to succeed before deployment and Vercel to be configured with environment variables — none of that setup has been started.

## 10. Mock-data dependencies

All 9 dashboard pages, with zero exceptions — confirmed by grepping every file under `src/pages/` for the string `supabase` (case-insensitive): zero matches outside `Login.jsx`/`Signup.jsx` (which use `useAuth`, not data queries). Every page imports directly from its matching `src/data/*.js` file:

| Page | Mock file |
|---|---|
| Dashboard | `dashboardData.js` |
| Sentiment Analysis | `sentimentData.js` |
| Crisis Detection | `crisisData.js` |
| Forecasting | `forecastData.js` |
| AI Recommendations | `recommendationsData.js` |
| Social Intelligence | `socialData.js` |
| Reports | `reportsData.js` |
| Dataset Management | `datasetData.js` |
| Settings | `settingsData.js` |

Interactive-looking actions ("Generate New" recommendation, "Sync", "Run Backup Now", file upload, report "Generate") only mutate local React state and/or fire a `setTimeout` + toast — nothing persists past a page refresh, per the previous audit's findings (still accurate, re-verified).

## 11. Hardcoded production values

Per FYP2.md §40's explicit examples, the current mock data includes exactly this category of value, e.g. (from `dashboardData.js`): `"Overall Sentiment": 74.2%`, `"Revenue Forecast": "RM 67,500"`, and (from `crisisData.js`) a fixed `riskScore: 42` / `level: 'medium'`. These are fine as clearly-labeled UI fixtures for a still-mock system, but under FYP2.md §40/§76 they must never reach a "production" dashboard state without being dynamically calculated. Today there is no dynamic path at all — the audit's job is to flag that the gap exists, not to leave it undocumented.

## 12. Broken functionality

Nothing is broken in the sense of throwing errors. `npm run lint` and `npm run build` both pass clean as of this audit (re-verified below). The one previously-open defect (signup silently failing with a browser-level "Failed to fetch") was root-caused to the Supabase free-tier project being auto-paused, not a code bug — DNS for the project now resolves again, confirming the project is live, but the schema still isn't deployed (§4).

## 13. Incomplete functionality

- Supabase schema designed but not deployed, and not yet aligned to FYP2's required entities (§4).
- No page reads/writes real data (§10).
- Auth exists but nothing downstream of it (no `business_profiles` row is created on signup, no onboarding).

## 14. Missing requirements (against FYP2.md, not against the old FYP1 spec)

Everything below is **entirely absent** — not partial, not stubbed:

- Business Startup / E-Commerce mode switch (§7–§9)
- "I have data" vs. "I don't have data yet" onboarding path (§10)
- Business description → Gemini extraction → structured profile → validation pipeline (§23–§26)
- Data provenance labeling (Observed / User Assumption / AI-Assisted Estimate / Scenario Projection) anywhere in the UI (§27)
- No-data scenario engine (Conservative/Expected/Growth, user-editable assumptions, recalculation) (§28–§31) — note: Forecasting's existing "Scenario Simulation" cards are a *different, unrelated* static mock (best/expected/worst revenue given an existing forecast), not this engine
- Data readiness indicator (§32)
- Data collection guidance / downloadable CSV templates / upload validation with column/type/duplicate checks (§33–§35)
- Shopee / TikTok / X / Threads source adapters (§37–§38)
- Real sentiment model (XLM-RoBERTa), training pipeline, model versioning (§46–§48)
- Backend inference service (§49)
- Baseline vs. sentiment-enhanced forecasting with MAE/RMSE/MAPE comparison (§50–§51)
- Measurable crisis detection (signal calculation, configurable thresholds, evidence display) (§52–§53)
- Rule-based recommendation engine + Gemini explanation layer (§54–§56)
- Model performance / evaluation page (§72)
- Structured report generation tied to real analytical output, with actual-vs-estimated distinction (§69–§70)
- Vercel deployment configuration (§77)
- Any automated test suite — confirmed zero `*.test.js`/`*.spec.js` files anywhere in `src/` (only `node_modules` noise matched the search)

## 15. Architectural risks

- **Scope gap is large.** FYP2.md describes a full applied-ML system (trained sentiment model, dual forecasting models, statistical crisis detection, Gemini-assisted recommendations, business-planning engine) on top of what is currently a static frontend. This is explicitly acknowledged in FYP2.md §85 ("do not overengineer") — the roadmap in §79 is long, and §80 requires incremental, verified phases rather than one large change.
- **The undeployed schema must be redesigned, not deployed as-is,** or it will need a second migration almost immediately once business-planning/ML entities are added — better to fix this before first deployment than after.
- **No backend host decided yet.** FYP2.md assumes a backend API for ML inference and Gemini calls (§49, §55) but the current architecture is 100% static frontend + Supabase. A decision is needed on where that logic runs (Vercel serverless functions, Supabase Edge Functions, or an external service) before Phase 4+ can start — FYP2.md §78 explicitly warns Vercel serverless cannot train or host heavy XLM-R inference.
- **Gemini reliability boundary must be enforced from the start** (§55): it must never be the source of truth for sales/sentiment/forecast/crisis numbers. Since no Gemini code exists yet, this is a design constraint to build in from day one, not a retrofit.
- **No secrets beyond the Supabase anon key exist yet.** When `GEMINI_API_KEY`, TikTok/X credentials, etc. are introduced, they must stay server-side only (§59) — there is currently no server for them to live in (see risk above).
- **Zero test coverage** means every future phase's "verify before claiming success" (§89) currently has no automated backstop — manual/Playwright-driven checks only.

## 16. Recommended implementation order

Following FYP2.md §79's roadmap, mapped to current reality:

1. **Phase 0 (this document)** — done.
2. **Phase 1 — Architecture repair.** Nothing is actually broken (lint/build clean), so this phase is short: decide where backend/ML logic will run (Vercel functions vs. Supabase Edge Functions), and redesign the Supabase schema against FYP2.md §42/§57 (including deploying it) before building on top of it.
3. **Phase 2 — Business Startup / E-Commerce mode.** Build the mode switch first — it affects navigation and every page's framing, so it should land before the data pipeline work that follows.
4. **Phase 3 — Data availability / business planning.** The "I don't have data yet" path is likely the fastest way to get a genuinely working, demoable, non-mock feature end-to-end (it's mostly forms + calculation + Gemini extraction, no ML training required) — a strong candidate for the first real Phase 3+ milestone.
5. **Phases 4–9** — data pipeline, real sources, sentiment model, forecasting, crisis detection, recommendations, in that order, per §79 (each is a genuine multi-week FYP milestone on its own, especially §46 sentiment training and §50 forecasting comparison).
6. **Phase 10–13** — production dashboard wiring, reporting, testing, deployment.

---

## Verification run for this audit

```
npm run lint   → clean, 0 errors
npm run build  → clean, production build succeeds
```

No code was changed, so this simply reconfirms the existing baseline is stable before any FYP2 work begins.

## Next step

No changes have been made beyond this document. Per FYP2.md §3/§89, awaiting direction on which item from §16 to start with — my recommendation is Phase 1 (schema redesign + deployment, and a decision on where backend/ML logic will live) since every later phase depends on it.
