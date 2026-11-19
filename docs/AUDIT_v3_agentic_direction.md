# Repository Audit v3 — Against the Updated Agentic/Local-Shop Direction

**Required first response** per `C:\Users\User\Downloads\knowledge_updated_nov2026.md`'s pasted master instruction. Read-only audit — nothing implemented. Builds on, does not replace, `docs/AUDIT.md` (FYP II Phase 0, pre-dates §14's direction update) and the Phase 1–7 work already committed on top of it.

---

## 1. Current architecture and technology versions

Read `package.json` directly rather than trusting the knowledge file's "Axios service layer" claim: **false**. `grep -rl "axios" src/` returns zero hits. The real HTTP/data layer is `@supabase/supabase-js@^2.110.5` exclusively, plus native `fetch` inside Edge Functions calling Gemini. There is no Axios anywhere in this codebase, now or previously. If the instruction's constraint list is treated as binding, this specific line item is simply wrong and should be corrected, not implemented.

Other real versions (also correcting the knowledge file's "React 18"): **React 19.2.7**, React Router 7.18.1, Vite 8.1.3, Tailwind 4.3.2, Recharts 3.9.2, Framer Motion 12.42.2, Vitest 5.0.2, Playwright 1.63.0, `@axe-core/playwright` 4.14.0 (added in Phase 7). `jspdf`/`jspdf-autotable` exist (Reports' export). No deployment config for Vercel found in the repo (no `vercel.json`); the knowledge file's "Vercel deployment" is aspirational/assumed, not confirmed configured.

## 2. Existing routes and major components

10 routes (`src/routes/paths.js`): `/`, `/sentiment`, `/forecasting`, `/crisis-detection`, `/recommendations`, `/social-intelligence`, `/reports`, `/datasets`, `/settings`, `/onboarding`, `/model-performance`, plus `/login`/`/signup`. `src/constants/navigation.js` is the single source for nav items/page titles. Layering is exactly as the knowledge file's §2 describes: page → `*Service.js` → `*.js` pure util, consistently applied.

## 3. Current business pathway implementation — the central finding

**What Phase 1 (commit `a016544`) actually built**: `src/constants/modes.js` defines two ids — `startup` (label "Business Startup") and `ecommerce` (label "E-Commerce"). `src/config/modesConfig.js` (`MODE_DETAILS`) attaches real per-mode detail: **`startup`'s `MODE_DETAILS` entry already describes the "Local Malaysian Shop" concept** (kedai runcit, kopitiam, short/irregular 3–12 month history, BM default, local-shop CSV template, complaint themes in BM) — i.e. the *content* behind the `startup` id is already "Local Malaysian Shop," just under the **label** "Business Startup." `ecommerce`'s detail describes the full dataset-driven synthetic path (Embun Botanica-style), under the label "E-Commerce." Mode is a per-user Supabase preference (`user_preferences.workspace_mode`, migration `0010`) with localStorage fallback, applied via `ModeProvider.jsx` — real, working, already deployed-in-code (pending the user running migration `0010` manually, same as every migration in this project).

**The conflict**: §14.2's new terminology wants exactly two pathways named **"Malaysian Local Shop"** (no-data, AI-assisted onboarding) and **"Business Startup"** (synthetic-dataset-driven, i.e. what is currently labeled "E-Commerce"). This means the **label "Business Startup" needs to point to the opposite mode id** than it currently does — today "Business Startup" = `startup` id = the local-shop-flavored content; under §14, "Business Startup" should = the synthetic-dataset-driven content, which is currently `ecommerce`. This is not an additive gap, it's a literal **swap of which id a user-facing name refers to**. Any code, test, or stored data that currently reads `mode === 'startup'` and infers "this account has no data / wants BM / simple outputs" would, under a naive relabel, start meaning the opposite.

**Real options, not decided here**:
- **(a) Redefine in place**: keep `startup`/`ecommerce` as internal ids forever, just change the user-facing `label` strings (`startup.label` → "Malaysian Local Shop", `ecommerce.label` → "Business Startup"). Zero schema/code-path change, but means the id `ecommerce` now carries a label that has nothing to do with e-commerce — confusing for anyone reading the source later, including whoever grades this FYP.
- **(b) Rename ids too**: migrate `startup` → `local_shop`, `ecommerce` → `business_startup` as stored values (`user_preferences.workspace_mode`, any `MODES[mode]` lookup, every `mode === 'startup'`/`mode === 'ecommerce'` check across pages/services — a real `grep` turns up this comparison in multiple pages, e.g. `Dashboard.jsx`, `DatasetManagement.jsx`, `AiRecommendations.jsx`). Needs a migration to rewrite existing stored `workspace_mode` values (`'startup'` → `'local_shop'`, `'ecommerce'` → `'business_startup'`) plus every code reference updated and re-tested. Correct long-term, real one-time cost now.
- **(c) Add a genuinely third/new id**: keep `startup`/`ecommerce` untouched, add a new no-data onboarding flow as a *new* mode entirely, distinct from both — closest to §14.3–14.5's "Local Shop onboarding" being a wholly new conversational/progressive experience rather than a relabel of the existing simple-CSV-template `startup` mode. This is the most faithful reading of §14 (the Local Shop pathway described there — conversational AI Business Setup Assistant, progressive 3-stage data collection, a readiness/capability engine — is considerably richer than what Phase 1 built for `startup`, which is still just "a different CSV template + BM default + a different prioritized-outputs list"). Likely the right call given the actual scope of §14.3–14.5, but it means the existing `startup`'s simple local-shop content either gets absorbed into the new flow or left as a vestigial third thing — the user needs to decide which.

## 4. Current language/localisation support

Confirmed accurate, re-verified directly: zero i18n library (`grep` for `i18next`/`react-intl`/`formatjs` in `package.json` — no hits), zero translation files anywhere under `src/`. `user_preferences` has no `language` column that's actually read by any component (Phase 7's final report asserted one "already existed" — not found in the real migration files; `modesConfig.js`'s `defaultLanguage`/`availableLanguages` fields are **metadata only**, nothing switches UI copy based on them). §2's "clearly visible language switch, applied consistently... including charts, forms, reports, errors, notifications and the Grok assistant" is **100% unbuilt**, not partially covered.

## 5. Existing accessibility features and gaps

Phase 7 built `src/contexts/UIModeProvider.jsx` + `src/constants/uiModes.js`: three presets — `standard`, `low_sensory` ("Low-Sensory," framed as "Autism-friendly mode" in its own description string), `senior` ("Senior / Warga Emas"). Compared point-by-point against §2's requested three profiles:

| §2 requests | Closest existing | Match quality |
|---|---|---|
| Standard | `standard` | Exact |
| Large & Simple (larger text/controls/spacing, simplified nav) | `senior` | Overlaps but is a superset — `senior` also bundles BM-default language, spoken-style chart summaries, and TTS, which §2's "Large & Simple" doesn't ask for. Needs splitting or renaming, not a straight rename. |
| Calm & Focused (reduced clutter, predictable layout, restrained colour, reduced animation) | `low_sensory` | Close conceptually, but `low_sensory`'s own description text says "Autism-friendly mode" — §2 explicitly warns **"do not claim a single interface is universally autism-friendly"**; the existing copy overclaims relative to §2's more cautious framing and should be reworded regardless of the rename decision. |

§2 also asks for **independent** text-size/contrast/reduced-motion toggles "where practical" — not built; the current implementation is three bundled presets only, no independent axis controls. Real, specific gap.

Real WCAG numbers exist and are reusable: `src/utils/contrastRatio.js` (built in Phase 7, real luminance-formula contrast checker, already has tests) computed Low-Sensory text at 7.15–7.63:1 (AA) and Senior text at 16.6–17.7:1 (AAA) — reuse this utility for any new contrast work rather than reimplementing. Phase 7 also found (not yet fixed) a **real, systemic, pre-existing AA failure**: the app's Standard-mode muted secondary text measures 2.63–4.46:1 against its background, failing AA's 4.5:1 almost everywhere — confirmed via a full axe-core sweep (19 of 22 page×mode scans failed). This is currently being addressed as part of the separate in-progress "dark-glow" visual redesign's new token system (not yet committed as of this audit).

## 6. Every existing chart and its data source

`reports/CHART_AUDIT.md` (Phase 6) already inventories every real chart across all 10 pages with pass/fail against Tufte-style criteria — reference it rather than re-deriving. **Gap**: its row format (chart name, criteria 1–10 pass/fail) does not match §3's required Visualization Inventory columns (chart ID, page, purpose, data source, **provenance**, formula, chart type, expected interpretation, limitations, accessibility alternative, **test case**, **validation status**) — notably missing a stable chart ID, explicit provenance classification, and a validation-status/test-case column. Producing the new-format inventory is real, scoped work — not attempted in this audit, correctly deferred to this instruction's own Phase 2.

Also note: the in-progress dark-glow redesign is a *restyle* (colors/chrome/layout) and should not change any chart's underlying data source — but it has not yet reached any page beyond the shared shell/token foundation as of this audit (see §13), so this can't be fully confirmed yet for every chart.

## 7. Charts that are broken/misleading/duplicated/not meaningful

Per Phase 6's findings (not re-audited here): the Dashboard's former 4-slice "Platform Distribution" donut was replaced with a ranked bar (Cleveland–McGill ranking violation, fixed); a genuine render-order-dependent color bug was found and fixed alongside it; two colorblind-unsafe color pairs (TikTok/X under protanopia, crisis warning/critical under tritanopia) were found and fixed with an enforced test. No chart was found with zero real business purpose warranting removal as of Phase 6.

## 8. Current analytical calculations and test coverage

Re-run directly for this audit, real current counts: **409 Vitest tests** (50 files, all passing), **167 Python tests** across `ml/forecasting` (71), `ml/sentiment` (70), `ml/crisis` (20 — only when invoked from the repo root; invoking pytest from inside `ml/crisis/` itself fails with `ModuleNotFoundError: No module named 'ml'`, since its tests use absolute `ml.crisis.src.X` imports unlike the other two packages' relative `src.X` imports — a real but minor invocation-convention inconsistency, not a functional regression), `ml/scenarios` (6). **576 automated tests total**, up from the knowledge file's cited "360" — real growth from Phases 1–7's work, not yet reflected in the base knowledge document.

## 9. Current Supabase schema, RLS, and Edge Functions relevant to the proposed changes

Real table list, read directly from all 12 migration files: `profiles`, `companies`, `user_preferences`, `api_keys`, `storage_usage`, `business_profiles`, `business_assumptions`, `raw_data`, `processed_data`, `daily_aggregates`, `forecast_results`, `crisis_events`, `recommendations`, `recommendation_feedback`, `report_templates`, `model_versions`, `marketplace_products`, `marketplace_product_snapshots`, `marketplace_sync_log` — **19 real tables**. (A 20th, `shopee_dataset_syncs`, exists only inside one of the 6 untouched git stashes holding the unauthorized, never-applied Rebrowser integration — correctly not part of the real schema.) RLS is `auth.uid() = user_id` on every per-user table; `model_versions` is the one deliberately shared/global table.

Checking §14.13's proposed new tables against this real list:

| Proposed table | Status |
|---|---|
| `business_profiles` | **Already exists**, real equivalent |
| `agent_actions` | **Partial equivalent** — `recommendations` + `recommendation_feedback` (Phase 5) cover evidence/priority/rule-ID/thumbs-up-down, but neither has a status lifecycle field (pending/accepted/rejected/in-progress/completed) or a review-date/follow-up-evaluation column §14.11 asks for |
| `business_workspaces`, `business_profile_fields`, `business_capabilities`, `business_products`, `business_daily_records`, `business_readiness`, `agent_investigations`, `agent_tasks`, `agent_tool_logs`, `agent_memory` | **Genuinely net-new** — no equivalent exists (9 of 11) |

Edge Functions: `explain-recommendations`, `explain-report`, `extract-business-profile` (all Gemini, Layer-2-rewording-only, real and working except for Gemini's 20/req-per-day free quota), `run-forecast` (real in-app baseline, TypeScript, no LLM), `sync-x-mentions`/`sync-threads-mentions`/`source-status` (honest stub/real-check functions for social APIs). No Grok-calling function exists yet anywhere (`grep -rl "grok\|GROK\|x\.ai" src/ supabase/` → zero hits) — the separately-requested, smaller task of swapping just `explain-recommendations` from Gemini to Grok has not been coded at all yet; it's currently blocked purely on the user fixing a malformed `GROK_API_KEY` value in `.env` (confirmed live: a real `https://api.x.ai/v1/models` call returned `"Incorrect API key provided"`). **This blocked, small, already-scoped swap is a different and much smaller piece of work than §14.9's full "Agent Orchestrator → Business Context Check → Grok → Approved Tools → Verified Results → Explanation" architecture** — recommend doing the small swap first, once the key is fixed, as a working stepping stone/proof that Grok connectivity works at all, rather than silently folding it into the larger agentic rebuild where a connectivity problem would be harder to isolate.

## 10. Existing AI integration and what needs to change for Grok

Covered above (§9) — restating the key point since the instruction asks for it explicitly: current AI integration is **entirely Layer-2 (explanation/rewording only)**, never Layer-1 (decision-making). §14.6–14.9's Manager Agent + specialist agents + controlled tool registry + investigation logging is a **structurally new capability**, not an extension of the existing Gemini usage — none of the existing Edge Functions do tool selection, multi-step planning, or persisted investigation state. Building it reuses the *existing analytical services* as the tools to be called (per §14.9's own instruction to reuse, not duplicate), but the orchestration layer itself is 100% new code.

## 11. Existing external data integrations and their status

TikTok/X/Threads: real adapters exist (`src/adapters/`), `source-status` Edge Function does a real presence check (never claims "Connected" without verifying), current real status for this account is `NOT_CONFIGURED`/`AUTH_REQUIRED` depending on the platform — confirmed in multiple earlier audits, re-confirmed by file presence here. **DOSM/KPDN PriceCatcher/BNM integrations: zero code found** (`grep -rli "dosm\|kpdn\|bnm\|pricecatcher\|inflation" src/ supabase/ ml/` → zero hits). §5's entire Malaysian Economic Intelligence capability is unbuilt, 0%.

## 12. Missing features compared with this instruction

| Instruction section | Status |
|---|---|
| §1 Local Shop pathway (BM/EN switch, plain language, guided onboarding, progressive data entry) | **0% as a conversational/progressive experience** — Phase 1's `startup` mode only changes a CSV template + default language *metadata* (not enforced in UI), no onboarding assistant, no progressive 3-stage data collection |
| §2 Display & Accessibility settings area (3 named profiles, independent axis toggles) | **~60% built, under different names** — see §5 above; needs renaming/reframing + the independent-toggle gap closed |
| §3 Visualization Inventory (new format) | **0% in the new format** — Phase 6's `CHART_AUDIT.md` exists but in an older, different-columned format |
| §4 Grok assistant with full agent architecture | **0%** — see §9/§10 |
| §5 Malaysian Economic Intelligence | **0%** — see §11 |
| §6 Validation framework (Validation Evidence Register, class-wise sentiment P/R/F1, agent tool-selection testing, usability w/ representative users) | **Partially covered by FYP-II-phase work, not in this instruction's exact format**: Phase 3 computed a real O1 scorecard with per-language accuracy + a Wilson CI (not literal bootstrap), but no class-wise confusion matrix was produced in this instruction's requested format; Phase 5 computed real crisis precision/recall/F1 via injected scenarios (explicitly honest about lacking real-world ground truth, matching this instruction's own caution); no agent exists yet to test tool-selection against; no user-based usability testing has been run (not something code alone can do) |
| §14 (whole section) two-pathway rename, readiness/capability engine, agent roles, Action Centre, new tables | **0–10%** — only the pathway-naming conflict (§3 above) and the `business_profiles`/`recommendations` partial table equivalents exist; everything else in §14.3–14.13 is unbuilt |

## 13. Potential risks, dependencies, migration requirements

**Top risk**: the pathway-naming conflict (§3) — if resolved incorrectly or silently, every existing page's `mode === 'startup'`/`'ecommerce'` check, every stored `workspace_mode` value, and every user-facing "Business Startup"/"E-Commerce" label in the UI could end up referring to the wrong concept. This must be decided explicitly before any Phase-1-of-this-instruction code is written, not inferred.

**Scoping reality check**: §14.6–14.9's full agentic architecture (Manager Agent, specialist agent roles, controlled tool registry with input schemas/ownership checks/execution permissions, investigation/task/tool-call logging, iteration limits) is, on its own, comparable in total engineering size to everything built across FYP II Phases 0–7 combined (business modes, Malaysian holidays, sentiment statistics, forecasting statistics, a full crisis-detection ablation study, a Tufte chart audit, three accessibility modes). This is not a reason to avoid building it — it's the instruction's own "central signature feature" — but the user should plan for it as its own multi-phase effort, not a quick addition alongside everything else already in flight (the dark-glow visual redesign, the pending Grok key fix, this audit itself).

**Concurrency note**: a separate, currently-uncommitted "dark glow" visual redesign is actively in progress in the working tree as of this audit (`src/config/designTokens.js`, modified `index.html`/`src/styles/index.css`/several pages — all uncommitted). This audit did not touch any of those files beyond reading them for reference, per its own directive.

---

## Prioritized Implementation Backlog

| # | Priority | Feature | Files likely to change | DB changes | Dependencies | Acceptance criteria | Automated tests | Manual verification | Complexity |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **P0 — decide first** | Resolve pathway naming conflict (§3) | `src/constants/modes.js`, `src/config/modesConfig.js`, every `mode === 'startup'\|'ecommerce'` check (multi-file), possibly a new migration to rewrite stored `workspace_mode` values | Only if option (b)/(c) chosen | None | User has explicitly chosen option (a)/(b)/(c) from §3; every existing mode-dependent page still renders correctly post-change | Existing mode-dependent tests still pass; new tests for whichever option is chosen | Manually switch modes in Settings on a real account, confirm labels/content match the chosen resolution | Low (a) / Medium (b) / High (c) |
| 2 | P1 | Fix Grok API key, build the small `explain-recommendations` swap already scoped earlier this session | `supabase/functions/explain-recommendations/index.ts`, `.env` (user action) | None | User fixes `GROK_API_KEY` | A real Grok API call succeeds and replaces Gemini for this one function only; Layer-1/Layer-2 separation preserved exactly as today | Existing recommendation-rule tests unaffected; new test for the Grok response-validation/field-stripping logic | Live call against a real account, confirm explanation text appears and non-rationale/context fields are still discarded | Low |
| 3 | P1 | Visualization Inventory in §3's exact format | New `reports/VISUALIZATION_INVENTORY.md`, built from `reports/CHART_AUDIT.md` + fresh chart-ID assignment | None | Phase 6's chart audit (exists) | Every real chart has a stable ID, provenance classification, and validation status | N/A (documentation) | Manual review against the 10-question checklist in §3 of the instruction | Medium |
| 4 | P2 | Economic Intelligence proof-of-concept, ONE dataset only (per the instruction's own rule) | New `ml/economic/` or `src/services/economicDataService.js` + new table(s) for source-tagged observations | New additive table (e.g. `economic_observations` with source/dataset/date/unit/geo-scope/retrieved-at columns) | Verify DOSM/OpenDOSM's real current API/download availability and license before building (not yet checked in this audit) | One real CPI/inflation series ingested end-to-end, visualized, clearly separated from any shop's own recorded costs | New tests for the ingestion/parsing logic | Confirm the dataset is real, current, and licensed for this use before writing any code against it | Medium–High (mostly external-dependency risk, not code complexity) |
| 5 | P2 | Agent Orchestrator foundation (§14.6–14.9), minimal slice: Manager Agent + ONE controlled tool + investigation logging | New `src/services/agentOrchestratorService.js`, new Edge Function(s), new tables (`agent_investigations`, `agent_tasks`, `agent_tool_logs` at minimum) | 3+ new additive tables | Item 2 (a working LLM connection) should land first | A single real business question produces a logged, inspectable investigation using at least one real existing analytical service as a controlled tool, with explicit approval gating before any consequential action | New tests for tool-registry validation, input-schema enforcement, iteration-limit enforcement | Manually run one real investigation end-to-end, inspect the persisted tool-call log | High |

**Not scheduled above, explicitly deferred per the instruction's own phasing**: the full Local Shop conversational onboarding assistant (§14.3–14.5), the Display & Accessibility rename/independent-toggle work (§2, §5 of this audit), and the full validation framework (§6) each warrant their own backlog pass once items 1–2 above are resolved, since several of them depend on the pathway-naming decision (item 1) being settled first.
