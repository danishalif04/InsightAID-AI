# INSIGHTAID AI — FYP VIVA PRESENTATION BLUEPRINT

**Status: FINAL — approved for slide drafting.**
This document is **self-contained**. It can be handed to a slide-drafting session with no repository access: every number, figure reference, file path and architectural fact needed to build the deck is reproduced here, including a full source-code and working-application reference in **Section M**.

| | |
|---|---|
| **Project** | INSIGHTAID AI: An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups |
| **Presenter** | Muhammad Danish Alif Bin Azrul (22006390) |
| **Programme** | Bachelor of Computer Science (Hons.), Universiti Teknologi PETRONAS |
| **Supervisor** | Ts. Ahmad Izuddin Bin Zainal Abidin |
| **Assessment** | FYP II — Project Presentation (Form 13, UTP-ACA-PROG-FYP-01.13a/b, Issue 7.0, Jan 2025), **/45** |
| **Finalised** | 19 November 2026 |

### Document-freeze policy (decided)

The dissertation and the technical paper are **frozen as submitted**. Where either contains an error, **the deck follows the submitted dissertation** and the error is corrected in the documents *after* the viva. Section B therefore separates:

- **[P] Presentation handling** — what to say or show on the day, so the deck never contradicts the submitted document.
- **[D] Post-viva document fix** — the correction to apply to the dissertation/paper afterwards.

No slide may state a number that the submitted dissertation does not support. Where this blueprint knows something newer than the dissertation, it is flagged, not silently used.

---

## A. Source Review and Reference Analysis

### A.1 Sources inspected

| # | Source | Status | What it establishes | Role in the deck |
|---|---|---|---|---|
| 1 | **Dissertation** (`22006390_DanishAlif_FYP_Dissertation.pdf`, 92 pp) | ✅ Read in full incl. figures, tables, appendices, references | RQ1–RQ3, O1–O3, methodology, system design (Figs 3.1–3.13), datasets (Table 3.6), protocols (Tables 3.7–3.8), all results (Tables 4.2–4.12), limitations, contributions, Appendices A–E | **Primary source of truth for every claim on every slide** |
| 2 | **Technical paper** (`22006390_FYP_Technical_Paper.pdf`, 10 pp) | ✅ Read in full | Condensed framing, Eq. 1–3 (MAPE, MASE, break-even), Fig. 1 architecture, Tables 1–4 | Source for the **equations** and tighter presentation phrasing |
| 3 | **Marking scheme** (Form 13, Appendix 3-13, 2 pp) | ✅ Read both pages | Five criteria, multipliers, /45 | Drives **emphasis** (Section C) |
| 4 | **`knowledge.md`** → in-repo as `docs/knowledge_updated_nov2026.md` (770 lines) | ✅ Read §1–§16.10 | Module internals, verified demo-data statistics, §10 + §16.9 limitations, §16 implementation update (commit `7f8bd01`) | Implementation status; **stale in two places** (B-7, B-14) |
| 5 | **Source code + working application** | ✅ Inspected directly | Real implementation status, result artefacts, tests, migrations | Feature classification (A.3) and **Section M** |
| 6 | **Proposal Defence slides** | ❌ **NOT SUPPLIED** — not provided, not in repo | — | Visual identity derived instead from the live app's own design tokens + Appendix C screenshots |
| 7 | **Canva reference** (`canva.link/govco1mvev7bb78`) | ❌ **NOT INSPECTED** | — | **No claim is made about its contents.** Design direction (Section D) uses the stated palette + the application's own tokens |

### A.2 Result artefacts — every headline number traced to a re-runnable file

| Claim | Artefact | Verification |
|---|---|---|
| XLM-R 84.12% · en 78.28 · ms 86.88 · zh 94.37 | `ml/sentiment/results/O1_SCORECARD.md`, `model_versions_v20261020-171546.json` | ✅ Exact match, all six model×path rows |
| Daily h7: MA 18.54 · ARIMA 16.86 · Prophet 15.17 · Prophet+sent 15.79 · XGB 17.41 | `ml/forecasting/results/protocol_summary_a8b3bb637d28.json` | ✅ Exact match incl. all MASE |
| Weekly h4 ARIMA 13.28 · daily h30 XGBoost 21.41 | Same file | ✅ Exact match |
| "Eight DM tests, p 0.137–0.781, none significant" | Same file, `sentiment_comparisons[0..7]` | ✅ **All eight located**: 0.1374, 0.3636, 0.7808, 0.4880, 0.7340, 0.1907, 0.5696, 0.1485 |
| Crisis score 30/100 → Warning | `docs/audit/NUMBERS_VERIFIED.md` §1.1 + `src/config/crisisThresholds.js` | ✅ 20 + 10 = 30, band [25, 60) |
| Break-even RM7,131 | `NUMBERS_VERIFIED.md`; `src/utils/scenarioEngine.js` | ✅ RM2,500 ÷ 35.06% = RM7,130.6 |
| Forecast band ±1.96 × RMSE | `NUMBERS_VERIFIED.md` §1.4 | ✅ 1.96 × 912.75 = 1,788.99 |
| Chart contrast failures | `reports/CHART_AUDIT.md`, `reports/VISUALIZATION_INVENTORY.md` | ✅ 4 of 15 below 3:1, each named |

### A.3 Feature classification

**Pathway A — Malaysian Local Shop (no historical data)**

| Feature | Status | Where |
|---|---|---|
| Guided onboarding + AI profile extraction | Implemented, demonstrable | `src/pages/Onboarding.jsx`, `supabase/functions/extract-business-profile` |
| Readiness / capability engine | Implemented, demonstrable | `src/utils/dataReadiness.js`, `features/localshop/engine/readiness.js` |
| Break-even · margin table · expenses | Implemented; **arithmetic hand-verified** | `features/localshop/engine/*` |
| What-If Simulator | Implemented, demonstrable | `features/localshop/pages/WhatIf.jsx` |
| Startup Capital planner | Implemented, demonstrable | `StartupCapital.jsx`, migration `0014` |
| Cost Pressure analysis | Implemented, demonstrable | `engine/costPressure.js` |
| **DOSM/KPDN/BNM "Economic Intelligence"** | **Not supported by evidence — 0% built, deliberately** | No code exists; the page shows a CPI snapshot with an explicit "not verified" notice. **Never claim live national-data integration.** |
| Controlled assistant (3 read-only tools, max 1 call) | Implemented, demonstrable | `features/localshop/ai/`, `supabase/functions/agent-manager`, migration `0013` |
| EN / BM / ZH interface | **Implemented, not evaluated** — Local Shop pathway only | `features/localshop/i18n/strings.js` (see B-7) |

**Pathway B — Business Startup / SME (has data)**

| Feature | Status | Where |
|---|---|---|
| Upload + column matching + 3-stage pipeline | Implemented, demonstrable | migration `0003`, Fig 3.9 |
| **Dashboard sentiment label** | Implemented — but it is the **`rating_heuristic_v1` rule**, *not* the trained model | §3.2.8; `src/utils/ratingSentimentHeuristic.js` |
| Trained classifiers (XLM-R / mBERT / TF-IDF) | **Fully evaluated — offline only**, never deployed as inference | `ml/sentiment/` |
| In-app forecast (moving average, ±1.96×RMSE) | Implemented; measured MAPE 18.54% (worst of five) | `supabase/functions/run-forecast` |
| Offline forecast comparison (5 methods × 3 protocols) | Fully evaluated | `ml/forecasting/` |
| LSTM | **Planned / not executed** — 470-day series < 730-day rule | §4.2.1 |
| Crisis detection (7 signals, episodes) | Implemented; **scenario-tested only — no ground truth → no precision/recall** | `src/utils/crisisDetection.js`, `crisisHistory.js` |
| Recommendation engine (6 rules, evidence-citing) | Implemented, demonstrable | `src/utils/recommendationRules.js` |
| Action Centre (pending/accepted/dismissed) | Implemented; MONITOR/EVALUATE deferred | migration `0015` |
| Reports / PDF export | Implemented, demonstrable | `src/utils/reportExport.js` |
| Live social/marketplace API ingestion | **Planned / future** — adapters removed, never approved | `knowledge.md` §16.8 |

**The LLM layer, stated separately.** The language model is confined to **Layer 2** and may only: (a) reword a reason the rule engine already decided; (b) select at most one tool from a fixed three-tool registry; (c) phrase an answer from that tool's real numeric output. **Every other field it returns is discarded.** If it is unreachable, the rule text is shown. Implementation is **provider-agnostic** (`supabase/functions/_shared/aiClient.ts`, OpenAI chat-completions shape, three secrets: `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`), **currently configured to Groq**. The submitted documents call it only "a hosted large language model service."

---

## B. Project Alignment and Discrepancy Register

**Resolution policy:** `[P]` = how to handle it on presentation day · `[D]` = correction to apply to the documents after the viva.

| # | Sev | Discrepancy | Resolution |
|---|---|---|---|
| **B-1** | 🔴 | **Demo shop identity.** The dissertation's Table 4.8 S2 and Figs C.14–C.19 show **Kedai Makmur** (28 products, RM2,500 fixed, 35.06% margin, break-even **RM7,131**). The working tree currently holds a replacement, "Warung Nasi Lemak Kak Yah" (6 products, RM1,470, 60.33%, RM2,437). | **DECIDED: demo Kedai Makmur.** `[P]` **Action required before the viva** — restore the committed demo shop: `git checkout -- src/features/localshop/data/demoShop.js src/features/localshop/ai/mockPlans.js src/features/localshop/i18n/strings.js src/features/localshop/engine/__tests__/ src/features/localshop/ai/__tests__/ e2e/local-shop.spec.js`, then re-run lint + tests + build and confirm the engine reproduces **RM7,131**. |
| **B-2** | 🔴 | **Supabase free tier auto-pauses.** Found paused 2026-11-08 (NXDOMAIN, `status: INACTIVE`). Sign-in is a real Supabase call, so a pause blocks **both** pathways. | `[P]` Unpause and warm the project the morning of the viva; sign in once to confirm. Prepare all three fallback tiers (Section G). |
| **B-3** | 🔴 | **Demo data has aged — Business Startup pathway only.** The Embun Botanica dataset ends **2026-10-21**; "last N days from today" charts now render honest empty states, and the stored forecast covers dates already past. **Kedai Makmur is dateless and cannot age.** | `[P]` Re-run "Run Forecasting" (one click) and/or upload fresh-dated rows before the viva. No action needed for the Local Shop demo. |
| **B-4** | 🟠 | **Objective numbering differs.** Dissertation: O1 sentiment, **O2 forecasting**, **O3 DSS**. Paper: (1) sentiment, **(2) DSS**, **(3) forecasting**. | `[P]` Use the **dissertation's** numbering everywhere. `[D]` Renumber the paper. |
| **B-5** | 🟠 | **Test count.** Both documents report **462 tests / 57 files**; the repo today runs **470 / 57**. | `[P]` Present **462**. If current state comes up: "462 at submission, 470 today after further tests." `[D]` Update to the final count. |
| **B-6** | 🟠 | **Pinned test runner broken locally.** `vitest@5.0.2` (pinned, cited in Table 3.9) fails to run *any* test on the dev machine (`TypeError: Cannot read properties of undefined (reading 'config')`); `vitest@5.1.1` runs 470/470 clean. | `[P]` Have the one-sentence answer ready: a toolchain-version defect, not a test failure. `[D]` Bump the devDependency and update Table 3.9. |
| **B-7** | 🟠 | **BM/ZH interface.** Dissertation Table 5.2 and `knowledge.md` §16.9 both list a Malay/Chinese interface as *future work*; the Local Shop pathway now **has** an EN/BM/ZH switch. | `[P]` Scope it precisely: "the dissertation lists this as future work; since submission the **Local Shop pathway** has one — the rest of the application is still English-only." `[D]` Move it from future work to delivered, scoped. |
| **B-8** | 🟠 | **Olist series count.** Dissertation reports **five** category series (Table 3.8; §4.3.2 "best in two of them"); the repo has since moved to **ten** (commit `d65431b`), and the headline run `a8b3bb637d28` is on `olist_total`. | `[P]` Quote the dissertation's five-series statement; if you cannot locate the run behind the per-category sentence, **soften that one sentence** rather than defend it. `[D]` Re-state against a located run. |
| **B-9** | 🟡 | **Layer naming.** Paper's body text says "Crisis Detection Layer"; its own Fig. 1 and the dissertation say "**Decision Support Layer**". | `[P]` Say **Decision Support Layer**. `[D]` Fix the paper's body text. |
| **B-10** | 🟡 | **Willingness-to-pay garbled.** Dissertation §4.3.3 has two contradictory half-sentences; §4.6 says **9 of 15** chose RM20–49, 14 of 15 ≤RM49. Paper says "**Nine percent**" — wrong (nine *of fifteen* = 60%). | `[P]` Use only "9 of 15 (60%) chose RM20–RM49; 14 of 15 would pay ≤RM49." Keep WTP to one line. `[D]` Rewrite §4.3.3 and fix the paper. |
| **B-11** | 🟡 | **Gap count.** §2.10 + Table 2.2 define **six** gaps; §5.1 says "5". | `[P]` Present **six**. `[D]` Fix §5.1. |
| **B-12** | 🟡 | **Abstract mis-states the UAT target** ("4.07 out of the predefined project's target of 5.0"); the target was a mean of **4.0** on a 1–5 scale. | `[P]` Present the target as **4.0 / 5.0**. `[D]` Rewrite the abstract sentence. |
| **B-13** | 🟡 | **"12.2%" vs "12.2 percentage points."** The paper's abstract says "12.2% less accurate"; it is a **12.2 pp** drop (84.1 → 71.9). | `[P]` Say **percentage points** on the slide and aloud. `[D]` Fix the paper. |
| **B-14** | 🟡 | **`knowledge.md` internally inconsistent on the LLM provider**: §10 still lists a "Gemini free-tier quota"; §16.1 documents the rearchitecture to a provider-agnostic client on Groq. | `[P]` Use §16.1. If quota is raised: "a free-tier rate limit on whichever provider is configured." `[D]` Reconcile §10. |
| **B-15** | 🟡 | **Chart contrast may have moved.** Dissertation reports chart green **2.28:1 (fail)**; the working tree holds uncommitted colour work (`MAGNITUDE_RAMPS`, measured 2.54–4.10:1) not in the submitted document. | `[P]` **Report the dissertation's 2.28:1 failure.** Claim a fix only if re-measured with evidence. `[D]` Re-run the contrast check and update Table 4.7. |
| **B-16** | 🟢 | §4.3.1 garbled: "English, Bahasa Melayu and Mandarin achieved 75% each. English was lowest with 78.28%. We tested not why." | `[P]` Say: "all three tested languages cleared the 75% target; English was lowest at 78.28%." `[D]` Rewrite. |
| **B-17** | 🟢 | **Mandarin macro-F1 0.6292 vs accuracy 94.37%** — class imbalance, undiscussed. | `[P]` Not an error — prepare appendix slide A-2. `[D]` Add one explanatory sentence. |
| **B-18** | 🟢 | **CLAUDE.md's internal targets are stricter than what was achieved**: ≥200 double-labelled comments with Cohen's κ (not done), DM-tested forecast improvement (not achieved), crisis precision/recall + lead time (no ground truth). | `[P]` Present as **designed-to-be-falsifiable outcomes** — a strength under a ×5 accuracy rubric. Already honestly reported in §4.3.5. |
| **B-19** | 🟢 | **Chrome navigation drift.** Appendix C screenshots show "Local Shop" as a single top-level link; the live app now renders it as a dropdown of the nine Local Shop destinations. The in-page tab bar in C.14–C.22 is unchanged. | `[P]` Low risk. Either say nothing, or one line if asked: "the top-bar grouping changed after submission; the pages are the same." |
| **B-20** | 🟢 | **Migration count.** §3.2.6 says "created in 16 migrations"; the repo now has **17** (`0017_forecast_results_mase.sql`). | `[P]` Say 16 if quoting the dissertation; say "17 today" only if asked about current state. `[D]` Update §3.2.6. |

---

## C. Marking Scheme Coverage Matrix

| Criterion (Form 13 wording) | ×  | Max | % | "Very Good (5)" requires | Carried by | Evidence? | Residual risk |
|---|---|---|---|---|---|---|---|
| **Subject knowledge and content** | **×5** | **25** | **55.6%** | "present the research outcome professionally and clearly, **showing mastery**… **Facts presented are accurate**" | All 22 slides; load-bearing S5, S9–S10, S16–S20 | ✅ Every number traces to a re-runnable artefact (A.2) | B-1, B-5, B-15 are the live risks |
| Confident delivery of research ideas | ×1 | 5 | 11.1% | "with excellent confidence" | Delivery; sparse slides so you speak, not read | n/a | The 2-min demo is the highest-risk stretch |
| Effective and articulate delivery | ×1 | 5 | 11.1% | "with great effect and articulate" | Narrative arc (D), one idea per slide | n/a | Avoid paragraph slides |
| **Use of visual aids and supportive materials (incl. product demo)** | ×1 | 5 | 11.1% | "shows **excellent understanding** on the research outcome" | S15 demo + chart slides; asset map (H) | ✅ 22 system screenshots, 7 result figures, 8 diagrams | **Single point of failure: B-1/B-2/B-3** |
| **Response to questions** | ×1 | 5 | 11.1% | "**fully** understand and respond extremely well" | 10 appendix slides (I) | ✅ Limitations documented in depth | Rehearse the 12 questions in I |
| | | **/45** | | | | | |

**Implication 1 — content outweighs everything else combined (25 vs 20).** Every design choice below subordinates visual flourish to factual traceability. One wrong number drops the ×5 criterion to Weak (2): a 15-mark swing.

**Implication 2 — Q&A is worth as much as the entire visual design.** The appendix (Section I) is not padding; it is 5 marks.

---

## D. Final Presentation Concept

**Title:** INSIGHTAID AI — *An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups*

**Audience:** FYP examiner panel, Faculty of Science, Management & Computing, UTP. Computer-science literate; not necessarily specialists in multilingual NLP or forecast evaluation. They will probe: *is this real, did you measure it, and do you know what you did not prove?*

**Central narrative:**
> Malaysian small businesses already hold the data that would warn them — in three languages — but cannot read it in time or afford to. InsightAid AI turns that data into evidence-backed actions using only free tools, **and reports honestly where it did and did not work.**

**Personality:** *evidence-first engineer, not salesperson.* The distinguishing move is that this project reports its own negative results: sentiment did **not** improve the forecast; the chart colours **failed** the contrast check; end-to-end timing was **never** measured. Under a rubric weighting factual accuracy ×5, leaning into that is the strategy. Tagline, borrowed from the app's own sign-in screen: **"Decisions, backed by evidence."**

**Hook (labelled illustrative):** the skincare-batch scenario from dissertation §1.1 — Malay complaints on a short-video platform first, then Mandarin marketplace reviews, then English; sales still look healthy because they reflect orders placed weeks earlier; by the time revenue drops the rating is gone. Then: *"The information was public for weeks. The owner had no affordable way to read it."* **Must be captioned as illustrative on the slide itself.**

**Design direction** (described only):
- Palette anchored to the application's own identity: Deep Forest Green `#15211C`, Emerald `#22C55E`, Soft Off-White `#F6F8F7`, Dark Background `#0F1714`, neutral greys.
- **Dark sections for product/demo slides** (matching the live dark-glow UI so screenshots sit in context); **light sections for research/results** (charts read better; the dissertation's figures are light-background).
- One large claim per slide, one supporting figure, one caption naming the source — `Source: Table 4.4, daily 7-day protocol, 10 folds`. The caption is itself evidence of mastery.
- **Restraint rules:** no gradients beyond one background wash, no glassmorphism, no floating decorative cards, no icon rows, **no pie or donut charts anywhere** (the project's own chart audit removed one; reintroducing one would be self-contradicting).
- Layout variety: editorial opener → two-column research slides → full-bleed diagram → full-bleed screenshots → evidence-led chart slides with one highlighted number → minimal closer.
- **Accessibility, deliberately:** the project reports a contrast failure, so the deck itself must pass — every chart colour ≥3:1 on its slide background, series labelled directly rather than by colour alone. An examiner noticing the deck practises what the dissertation preaches is a free mastery signal.

---

## E. Recommended Presentation Flow

**Assumed: 20 minutes + Q&A.** ⚠️ The marking scheme states no duration — **confirm with your supervisor**; all timings scale proportionally.

| Part | Slides | Topic | Time | Running |
|---|---|---|---|---|
| 01 | 1–5 | Introduction & research context | 3:30 | 3:30 |
| 02 | 6–7 | Literature & research gap | 2:00 | 5:30 |
| 03 | 8–11 | Methodology & system design | 3:30 | 9:00 |
| 04 | 12–14 | Implementation | 2:30 | 11:30 |
| 05 | 15 | **Product demonstration** | **2:00** | 13:30 |
| 06 | 16–19 | Results & evaluation | 4:00 | 17:30 |
| 07 | 20–22 | Discussion, conclusion, close | 2:30 | 20:00 |
| — | A1–A10 | Appendix (Q&A only) | — | — |

**Changes from the draft structure, with justification:**
1. **22 core slides, not 23** — the draft's "Overall System Experience" and "BI Dashboard" overlapped; merged, with the live demo doing what a screenshot tour would do worse.
2. **Demo at S15 (~11:30), not after four implementation slides.** It answers "is this real?" — the question blocking attention until settled — *before* the results chapter, so the panel listens to the numbers rather than wondering whether a system exists. It also protects the demo from being squeezed if you run long.
3. **Dedicated targets slide (S5) paired with a scoreboard (S19).** Stating falsifiable targets up front and scoring yourself against them is the clearest demonstration of research discipline available under a ×5 content rubric.
4. **Dedicated "what this does not prove" slide (S20).** Volunteering limitations before being asked converts a Q&A weakness into a content strength.

---

## F. Detailed Slide-by-Slide Blueprint

Eleven fields per slide. Figure/table references are to the **dissertation** unless stated.

---

### PART 01 — INTRODUCTION AND RESEARCH CONTEXT

**SLIDE 1 — Cover**
1. **Section:** 01 · Opening
2. **Title:** InsightAid AI — An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups
3. **Purpose:** Identify the work and author; set the visual tone.
4. **Key message:** This is a completed, evaluated FYP II artefact.
5. **Content:** Full title; name + ID 22006390; BCS (Hons), UTP; supervisor Ts. Ahmad Izuddin Bin Zainal Abidin; FYP II Viva; date.
6. **Source:** Dissertation title page, pp. i–ii.
7. **Visual:** Editorial full-bleed dark slide; title large, left-aligned over negative space; InsightAid wordmark; no stock imagery.
8. **Recommended visual:** The app's own wordmark (crop of Fig C.1), or no image.
9. **Assets:** InsightAid logo crop.
10. **Verification:** ✅ Matches title page.
11. **Transition:** "I'll start with the problem that made this project necessary."

**SLIDE 2 — Opening hook**
1. **Section:** 01
2. **Title:** The warning arrives in a language the dashboard doesn't read
3. **Purpose:** Create the problem viscerally before any statistic.
4. **Key message:** The information that would have warned the owner was public for weeks — in the wrong languages, on the wrong platforms, with no affordable way to read it.
5. **Content:** Four beats: (1) Malay comments on a short-video platform; (2) Mandarin marketplace reviews; (3) English reviews; (4) sales dip — rating already lost. Closing question: *"What if a business could recognise these signals before they become bigger problems?"* **Caption required: "Illustrative scenario (Dissertation §1.1) — not a customer case study."**
6. **Source:** §1.1, pp. 1–2.
7. **Visual:** Horizontal 4-stage timeline; three feedback stages in emerald, the sales dip muted-alert; the span between stage 1 and 4 annotated "weeks".
8. **Recommended visual:** **Newly drawn** timeline — no screenshot here.
9. **Assets:** None beyond the diagram.
10. **Verification:** ✅ Scenario is in the dissertation. ⚠️ **Must be labelled illustrative on the slide**, not only spoken.
11. **Transition:** "That is one invented business. Here is how many real ones are in that position."

**SLIDE 3 — The business intelligence gap**
1. **Section:** 01
2. **Title:** 96.1% of Malaysian businesses, and almost none of the analytics
3. **Purpose:** Establish scale and the affordability barrier with cited statistics only.
4. **Key message:** The businesses that most need affordable analytics are the overwhelming majority, and they are not served.
5. **Content:** MSMEs = **96.1%** of establishments, **39.5%** of GDP, **48.7%** of employment (2024, DOSM [1]). **1,086,386** MSMEs; **1,068,661** micro or small (Table 4.12). Own preliminary survey (**n = 30, convenience sampling**): **86.7%** use no paid analytics tool; **43.3%** learn of a customer problem only after sales drop; confidence using digital tools **4.07/5** vs. confidence turning data into decisions **2.93/5**.
6. **Source:** §1.1, §4.2.3, Table 4.12; refs [1], [2].
7. **Visual:** Left — three stacked DOSM statistics; right — the 4.07 vs 2.93 gap as a single paired bar. That contrast *is* the slide.
8. **Recommended visual:** **Newly built** paired bar. Fig 4.2 only if redrawn (it is a Microsoft Forms screenshot — see H.2).
9. **Assets:** Survey values from §4.2.3.
10. **Verification:** ✅ Cited to DOSM [1] or the project's own n=30 survey. **State n=30 and "convenience sampling" on the slide** — the dissertation does.
11. **Transition:** "Those barriers decompose into four specific problems."

**SLIDE 4 — Problem statement**
1. **Section:** 01
2. **Title:** Four barriers — cost, language, timing, trust
3. **Purpose:** Convert context into four precise, researchable problems.
4. **Key message:** Each barrier maps to a specific later design decision.
5. **Content:** **Cost & complexity** — platforms assume a budget and a trained analyst. **Language** — signal in Malay and Mandarin lost to English-built tools; code-mixed text under-resourced. **Timing** — sales records describe demand that already happened. **Trust** — a chart does not say what to do, and an LLM that writes advice can invent figures. Plus the fifth condition creating Pathway A: **with no data at all, none of these tools help.**
6. **Source:** §1.2, p. 2.
7. **Visual:** 2×2 grid of four cards, bold noun + one line each; the no-data condition as a full-width strip beneath.
8. **Recommended visual:** Typographic only — no icons.
9. **Assets:** None.
10. **Verification:** ✅ Verbatim §1.2.
11. **Transition:** "Three research questions follow, each answered by one objective."

**SLIDE 5 — Research questions, objectives, and targets set before development**
1. **Section:** 01
2. **Title:** Three questions, three objectives — and the targets I set before building
3. **Purpose:** **Spine of the ×5 content criterion.** Establish falsifiability.
4. **Key message:** The pass/fail thresholds were fixed before any result existed — which is what makes the later scoreboard meaningful.
5. **Content:** **RQ1/O1** multilingual sentiment (XLM-RoBERTa) → ≥80% overall **and** ≥75% per language. **RQ2/O2** forecasting incl. a sentiment variant, rolling-origin → MAPE < 15%. **RQ3/O3** integrated DSS (crisis + recommendations + planning + controlled assistant) → UAT mean ≥ 4.0/5.0, response < 3 s. Beneath: **"Targets fixed before the runs. Protocols fixed before the runs. All results reported, including the ones that missed."**
6. **Source:** §1.3, §1.4, **Table 3.1**; Table 3.8; §4.7 "Selection of protocols".
7. **Visual:** Three-row table RQ → Objective → Measure & target; the targets column visually distinct (it reappears identically on S19).
8. **Recommended visual:** **Reuse Table 3.1** (p. 13), reduced to three columns.
9. **Assets:** Table 3.1 content.
10. **Verification:** ✅ Exact match. ⚠️ **Use the dissertation's O1/O2/O3 ordering** (B-4).
11. **Transition:** "Scope, briefly, then what the literature already answered."

---

### PART 02 — LITERATURE REVIEW AND RESEARCH FOUNDATION

**SLIDE 6 — Scope and literature in one view**
1. **Section:** 02
2. **Title:** What this project is — and what it deliberately is not
3. **Purpose:** Pre-empt scope questions; compress the literature into themes.
4. **Key message:** A prototype tested on public and synthetic data with 15 users, evaluated honestly — not a production deployment.
5. **Content:** **In scope:** two pathways; uploaded files (CSV/JSON/Excel); Olist public data for forecasting; a labelled multilingual corpus for sentiment; a synthetic skincare brand for demonstration; 15 UAT participants; all tools free/open-source. **Out of scope:** direct social-platform API ingestion; real Malaysian small-business sales records; production deployment. **Five literature themes:** AI-in-SMEs reviews treat all SMEs alike [2]; multilingual sentiment proven across languages but rarely on *business* text per language [4][15][16]; forecasting has no single best method, baselines essential [19][20][21]; social signals predict demand — for large retailers [23]; LLMs hallucinate, tool-grounding mitigates [5][6][12].
6. **Source:** §1.5, §2.1–2.8, Table 2.1.
7. **Visual:** Two columns — in/out scope lists left; five one-line theme claims with bracketed citations right.
8. **Recommended visual:** **Compress Table 2.1** (p. 10) to five lines. Do not show its 15 rows.
9. **Assets:** Table 2.1 content.
10. **Verification:** ✅ **Caveat to state: the demonstration dataset is synthetic and the forecasting data is Brazilian retail, not Malaysian.**
11. **Transition:** "Across those five themes, six specific gaps remain for a small Malaysian business."

**SLIDE 7 — Research gap and response**
1. **Section:** 02
2. **Title:** Six gaps — and the design decision each one forced
3. **Purpose:** Show the system is derived from the literature, not assembled from features.
4. **Key message:** Every major architectural decision traces to a named gap.
5. **Content:** **G1** per-language multilingual sentiment on business text → three classifiers + translate-then-classify test. **G2** sentiment-as-forecast-input untested for small businesses → five methods ± sentiment, identical folds, DM tests. **G3** scores instead of actions → seven-signal detector + six evidence-citing rules. **G4** ungrounded LLM advice → **two-layer architecture: rules decide, the LLM may only reword.** **G5** no design for varying data readiness → two pathways in one codebase + readiness engine. **G6** dashboards unchecked for diverse viewers → Tufte review, W3C contrast check, visual-clarity survey dimension.
6. **Source:** §2.10, **Table 2.2** (p. 12); paper Table 1.
7. **Visual:** Six rows gap → response; **G4 emphasised** as the headline technical contribution.
8. **Recommended visual:** **Reuse Table 2.2 directly.**
9. **Assets:** Table 2.2 content.
10. **Verification:** ✅ ⚠️ **Say six, not five** (B-11).
11. **Transition:** "Here's how the project was run."

---

### PART 03 — METHODOLOGY AND SYSTEM DESIGN

**SLIDE 8 — Methodology: five phases, six increments**
1. **Section:** 03
2. **Title:** Iterative and Incremental Development — and why it was right here
3. **Purpose:** Satisfy the methodology criterion with justification, not just a diagram.
4. **Key message:** The no-data pathway exists *because* iterative development surfaced a need the plan did not anticipate.
5. **Content:** Five phases (literature → data prep → model development → system development → testing/evaluation); O1/O2 answered in Phase 3, O3 in Phases 4–5. Six increments: foundation & upload → sentiment → forecasting → crisis detection → recommendations → planning & assistant. **Three stated reasons for IID (§3.1.1):** analysis and dashboard are mutually dependent; needs became clear only once screens worked — *this is how the Local Shop pathway was discovered*; short cycles contained risk.
6. **Source:** §3.1, Fig 3.1, Fig 3.2, Table 3.2.
7. **Visual:** Fig 3.1's five-phase chain across the top; six increments as a numbered strip below; annotate increment 6 "Local Shop pathway discovered here".
8. **Recommended visual:** **Reuse Fig 3.1** (p. 13). **Omit or redraw Fig 3.2** — its hand-drawn arrow style clashes with the deck.
9. **Assets:** Fig 3.1 image; Table 3.2 content.
10. **Verification:** ✅ §3.1.1, Table 3.2.
11. **Transition:** "The architecture those increments built is four layers."

**SLIDE 9 — System architecture**
1. **Section:** 03
2. **Title:** Four layers, two pathways, one codebase
3. **Purpose:** Core technical explanation.
4. **Key message:** The decision logic is independent of both database and interface — which is why every rule is unit-testable and every number traceable.
5. **Content:** **Data Layer** (uploads, processed records, daily summaries, accounts; row-level security so each user reads only their own rows). **AI & Analytics Layer** (sentiment models, forecasting models, hosted language assistant). **Decision Support Layer** (crisis detection, recommendation rules, scenario planning). **User Interaction Layer** (dashboard, charts, recommendations, planning tools, assistant). Both pathways share the core; the pathway changes which inputs and outputs surface first, not the engine.
6. **Source:** §3.2.1, **Fig 3.3** (p. 16) = paper Fig. 1.
7. **Visual:** Full-bleed diagram; annotate the Decision Support Layer "pure functions — no DB, no UI" and the RLS boundary on the Data Layer.
8. **Recommended visual:** **Reuse Fig 3.3 directly** — cleanest diagram in the dissertation, identical in both documents.
9. **Assets:** Fig 3.3 image.
10. **Verification:** ✅ Matches implementation (Section M.4). ⚠️ **Say "Decision Support Layer"** (B-9).
11. **Transition:** "Data reaches that engine through three stages."

**SLIDE 10 — Data pipeline and datasets**
1. **Section:** 03
2. **Title:** Three stages, three datasets — and exactly which is real
3. **Purpose:** Data provenance, stated before any result.
4. **Key message:** Public data for the benchmarks, synthetic data for the demo, and the slide says which is which.
5. **Content:** Pipeline: upload (CSV/JSON/Excel) → columns matched → **original stored unchanged** → cleaned, language-tagged, sentiment-labelled → daily summaries → dashboard & crisis detector. Datasets: **Olist** (public, Kaggle, ~100k orders, 470-day mature period from 17 May 2017) → forecasting; **composite labelled corpus** (five public datasets; 107,171 rows = 85,639 / 10,763 / 10,769; EN/BM/ZH) → sentiment; **synthetic "Embun Botanica"** (4,080 transactions, 2,810 posts, 7 products) → demonstration and UAT. Two honest notes: **language detection is a rule, not a trained model**; the 1,000-row silent truncation bug found only in live testing and fixed by paged reading.
6. **Source:** §3.2.7, Fig 3.9, **Table 3.6**; `knowledge.md` §11.
7. **Visual:** Horizontal 3-stage flow on top; three dataset cards beneath, colour-coded **Public / Public / Synthetic**.
8. **Recommended visual:** **Redraw Fig 3.9 horizontally**; **simplify Table 3.6** to dataset / source / size / role.
9. **Assets:** Table 3.6 content; Fig 3.9 for reference.
10. **Verification:** ✅ ⚠️ Olist licence is marked "**CC BY-NC-SA 4.0 (verify)**" in Table 3.6 — the parenthetical is visible in the submitted document. Resolve before the viva (J.2).
11. **Transition:** "Four analytical modules sit on that pipeline."

**SLIDE 11 — The four intelligence modules**
1. **Section:** 03
2. **Title:** Sentiment · Forecasting · Crisis detection · Recommendations
3. **Purpose:** One compact map so later slides can go deep without re-explaining.
4. **Key message:** Three of the four are deterministic and auditable; only sentiment involves a learned model.
5. **Content:** **Sentiment** — 3 classifiers (XLM-R primary, mBERT, TF-IDF baseline), 3 classes, two inference paths; **word-list methods rejected as unsuitable for Malay and Mandarin**. **Forecasting** — 5 methods × 3 pre-set protocols, rolling-origin, identical folds; "best" chosen by measured error, never pre-assigned. **Crisis detection** — 7 signals scored against *the same business's own* 7-day baseline (10 pts warning, 20 critical, cap 100; <25 Normal, 25–59 Warning, ≥60 Critical); <3 days of history → "insufficient data", never a guess. **Recommendations** — 6 fixed rules, each citing its evidence.
6. **Source:** §3.2.8–§3.2.11, Table 3.3, Table 3.4, Fig 3.10.
7. **Visual:** 2×2 grid; each quadrant = module, method in one line, and the design rule keeping it honest.
8. **Recommended visual:** Table 3.3 belongs in **appendix A-5**, not here — too dense for 30 seconds.
9. **Assets:** None new.
10. **Verification:** ✅ ⚠️ **Must state: the dashboard's live sentiment label is `rating_heuristic_v1`, not the trained model.** Highest-probability "gotcha" in the viva (A-1).
11. **Transition:** "And the rule that governs the AI layer."

---

### PART 04 — IMPLEMENTATION

**SLIDE 12 — The two-layer rule: the LLM may only reword**
1. **Section:** 04
2. **Title:** Rules decide. The language model only rewords.
3. **Purpose:** Present the headline technical contribution (G4).
4. **Key message:** The model structurally cannot change a number, a priority, or a piece of evidence — and if it is unavailable, the rule text is shown.
5. **Content:** Step 1: fixed rules decide from system evidence (risk level, sentiment trend, data readiness, scenarios). Step 2: the language service rewords the reason in plain words. **Only the wording is accepted; every other field returned is discarded.** If the service fails, the owner sees the rule text — the system never degrades into silence or invention. Same discipline in the assistant: it picks **at most one** of three **read-only** tools; the system validates the choice, runs the tool, and the answer is written only from that tool's real output; question, tool and answer are all logged. Implementation note: the AI client is **provider-agnostic** (OpenAI chat-completions shape, three secrets), currently Groq.
6. **Source:** §3.2.11, **Fig 3.11**, §3.2.13, Fig 3.12; `knowledge.md` §16.1.
7. **Visual:** Full-bleed Fig 3.11 with the "Only the wording is accepted; the decision cannot change" node as the focal point.
8. **Recommended visual:** **Reuse Fig 3.11 directly** (p. 26). Fig 3.12 → appendix A-6.
9. **Assets:** Fig 3.11 image.
10. **Verification:** ✅ Matches `_shared/aiClient.ts`, `explain-recommendations`, `agent-manager`. ⚠️ If you name Groq, add "swappable by configuration" (B-14).
11. **Transition:** "That engine serves two different kinds of owner."

**SLIDE 13 — Two pathways from one engine**
1. **Section:** 04
2. **Title:** Malaysian Local Shop · Business Startup
3. **Purpose:** Explain the data-readiness-aware design (G5), a stated contribution.
4. **Key message:** A capability is never shown as available unless the data behind it actually exists.
5. **Content:** **Business Startup** (has data): upload → sentiment, forecast, crisis risk, recommendations, Action Centre, reports. **Malaysian Local Shop** (no data): guided setup → profile confirmation → break-even, scenarios, what-if, capital planning, cost pressure → controlled assistant. **The readiness engine is the hinge:** forecasting and sentiment stay **locked with a stated reason** rather than showing an empty chart; every planning output is labelled **simulation, never forecast**; every profile field is labelled user-entered / AI-suggested / assumed, and a typed value is never overwritten by a suggestion.
6. **Source:** §3.2.12, §3.2.14, **Fig 3.5**, Fig 3.4.
7. **Visual:** Fig 3.5's two branches side by side, simplified; the locked-capability concept called out between them.
8. **Recommended visual:** **Simplify Fig 3.5** (p. 18) to its two branches; full Fig 3.5 + Fig 3.4 → appendix A-4.
9. **Assets:** Fig 3.5 for redraw.
10. **Verification:** ✅ ⚠️ **Do not claim DOSM/KPDN/BNM integration — it does not exist.** Describe the page honestly as cost-pressure analysis on the shop's own recorded costs.
11. **Transition:** "Built entirely on free and open-source tools."

**SLIDE 14 — Technology stack and environment**
1. **Section:** 04
2. **Title:** Everything free or open-source — affordability as a design constraint
3. **Purpose:** Support the affordability claim (G5) with concrete versions.
4. **Key message:** The cost barrier from slide 4 is answered by the stack itself, not by a pricing promise.
5. **Content:** **Web:** React 19.2.7, Vite 8.1.3, React Router 7.18.1, Tailwind 4.3.2, Recharts 3.9.2, Framer Motion 12.42.2, Supabase JS 2.110.5. **Database/auth:** Supabase (PostgreSQL + RLS). **Models:** Python — pandas, scikit-learn, transformers, statsmodels, Prophet, XGBoost. **Testing:** Vitest, Playwright, pytest, ESLint. **Training:** Google Colab free tier, NVIDIA T4 (16 GB). **Dev machine:** Intel i5-11400H, 16 GB RAM, Windows 11 Pro.
6. **Source:** **Table 3.9**, **Table 3.10** (p. 33); full detail in Section M.2.
7. **Visual:** Four grouped columns by purpose; free-tier training called out as a deliberate reproducibility choice.
8. **Recommended visual:** Re-typeset Table 3.9/3.10. **No logo wall** — version numbers are the evidence, logos are decoration.
9. **Assets:** None.
10. **Verification:** ✅ Matches `package.json`. ⚠️ Table 3.10 typo "hromium" → Chromium. ⚠️ Vitest 5.0.2 currently fails on the dev machine (B-6).
11. **Transition:** "Rather than describe the system further — here it is."

---

### PART 05 — PRODUCT DEMONSTRATION

**SLIDE 15 — Live product demonstration (≈2 minutes)**
1. **Section:** 05
2. **Title:** InsightAid AI — live
3. **Purpose:** Prove the artefact exists and works end to end; earn the visual-aids criterion.
4. **Key message:** Every number on screen traces to a calculation, and the system says so on screen.
5. **Content:** Holding slide only — run-of-show in Section G.
6. **Source:** Live application; fallbacks per G.
7. **Visual:** Near-empty dark slide so the screen share is the content; a small persistent "Demo — synthetic data" corner label.
8. **Recommended visual:** None (the live app).
9. **Assets:** Live app **plus** a pre-recorded capture of the same journey.
10. **Verification:** ⚠️ **Three blocking prerequisites: B-1 (restore Kedai Makmur), B-2 (unpause Supabase), B-3 (refresh Business Startup data).**
11. **Transition:** "That is the artefact. The rest of this presentation is what measuring it showed."

---

### PART 06 — RESULTS AND EVALUATION

**SLIDE 16 — Objective 1: multilingual sentiment**
1. **Section:** 06
2. **Title:** XLM-RoBERTa, 84.12% — and translating first costs 12.2 points
3. **Purpose:** Report O1 with its negative sub-result.
4. **Key message:** One multilingual model is enough for the three languages tested, and classifying in the original language beats translating first by a wide margin.
5. **Content:** XLM-R **84.12%** / macro-F1 **0.807** (95% CI 83.42–84.80, n = 10,769); mBERT 82.5 / 0.791; TF-IDF 74.3 / 0.727; **XLM-R translate-then-classify 71.9 / 0.689 — 12.2 percentage points worse.** Per language: English 78.28, Bahasa Melayu 86.88, Mandarin 94.37 — **all three clear 75%; overall clears 80%. O1 achieved.** Two constraints stated: **code-mixed text was not evaluated**; **Cohen's κ was not computed** (the second-annotator column was never labelled).
6. **Source:** §4.3.1, **Table 4.2**, **Table 4.3**, **Fig 4.3**, Fig 4.5; `ml/sentiment/results/O1_SCORECARD.md`.
7. **Visual:** Left — four-bar accuracy comparison with the 80% target line; right — three per-language numbers against the 75% line. Annotate the 12.2 pp gap on the bars.
8. **Recommended visual:** **Reuse Fig 4.3 directly** (p. 36). Confusion matrix → appendix A-2.
9. **Assets:** Fig 4.3; `reports/figures/fig_confusion_xlmr.png`.
10. **Verification:** ✅ Re-verified against `O1_SCORECARD.md`. ⚠️ Say "percentage points" (B-13); rephrase the garbled §4.3.1 sentence (B-16).
11. **Transition:** "Objective 2 did not go as cleanly."

**SLIDE 17 — Objective 2: forecasting, and the hypothesis that failed**
1. **Section:** 06
2. **Title:** MAPE < 15% in one protocol of three — and sentiment did not help
3. **Purpose:** Report a partial achievement and a negative result without softening either.
4. **Key message:** The project's own hypothesis — that customer sentiment improves a small-business forecast — was tested properly and **not supported**.
5. **Content:** Daily 7-day (10 folds): Prophet sales-only **15.17%** (best), Prophet+sentiment 15.79, ARIMA 16.86, XGBoost 17.41, moving average 18.54; **all five beat a naive forecast** (MASE < 1.0). Across the three pre-set protocols: daily-30 XGBoost 21.41% ✗; daily-7 Prophet 15.17% ✗; **weekly 4-week ARIMA 13.28% ✓. O2 partially achieved — 1 of 3.** Sentiment: **worse in 6 of 8 Diebold–Mariano comparisons; p from 0.137 to 0.781; none significant.** Caveat stated aloud: **the sentiment input was a star-rating proxy, not the trained XLM-R model**, and 10 folds give the DM test little power — so this is "not demonstrated", not "disproved".
6. **Source:** §4.3.2, **Table 4.4**, **Table 4.5**, **Fig 4.6**; Appendix E; `protocol_summary_a8b3bb637d28.json`.
7. **Visual:** Fig 4.6's five-bar MAPE chart with the 15% target line + a three-row protocol table showing ✗ ✗ ✓.
8. **Recommended visual:** **Reuse Fig 4.6 directly** (p. 39). Full Table 4.4 → appendix A-3.
9. **Assets:** Fig 4.6; `reports/figures/fig_appendix_e_artefact.png`.
10. **Verification:** ✅ Every value re-verified against the run artefact, incl. all eight DM p-values. ⚠️ Per-category claims — verify or soften (B-8).
11. **Transition:** "Objective 3 was evaluated with users, not only with metrics."

**SLIDE 18 — Objective 3: system testing and user evaluation**
1. **Section:** 06
2. **Title:** UAT 4.07 / 5.0 — met overall, missed on three dimensions
3. **Purpose:** Report O3 including the dimensions and the objective check that failed.
4. **Key message:** The two dimensions the design was *supposed* to be strongest in — trust and visual clarity — both came in below target, and an objective measurement agrees with the users.
5. **Content:** **n = 15** (7 students, 4 founders/owners, 3 local-shop or home-business owners, 1 marketing staff). Overall **4.07** (SD 1.02) — **target 4.0 met.** Above: functionality 4.32, performance 4.29, usefulness 4.24. **Below: usability 3.93, trust & transparency 3.93, visual clarity & accessibility 3.81.** Lowest item: *"colours in the charts can be told apart"* — **3.67**. System checks: **462 automated tests passing in 57 files**; computation **2.70 ms mean / 3.90 ms p95** (well under 3 s) — **but end-to-end page time was never measured**; **chart green 2.28:1 against the light theme, below the W3C 3:1 minimum — a failed check**; 4 of 15 chart colours below 3:1. **The subjective and objective findings agree** — the strongest sentence on this slide.
6. **Source:** §4.3.3, **Table 4.6**, **Table 4.7**, **Fig 4.7**; `reports/CHART_AUDIT.md`.
7. **Visual:** Fig 4.7 dimension bars with the 4.0 line (three above / three below in different treatments) + a small "system checks" panel including the failed ratio.
8. **Recommended visual:** **Reuse Fig 4.7** (`reports/figures/fig_uat_dimensions.png`, already presentation-resolution).
9. **Assets:** `fig_uat_dimensions.png` — ⚠️ this file is modified and uncommitted; confirm the version presented matches the dissertation's Fig 4.7.
10. **Verification:** ✅ Tables 4.6/4.7. ⚠️ **State n=15 and that nearly half were students** — volunteering it beats being asked. Report **462** (B-5) and **2.28:1** (B-15).
11. **Transition:** "Set against the targets I fixed before starting:"

**SLIDE 19 — The scoreboard: targets vs. results**
1. **Section:** 06
2. **Title:** Seven targets, scored honestly
3. **Purpose:** **Highest-value slide for the ×5 criterion.** Closes the loop opened on S5.
4. **Key message:** Three met, one partially, three missed — and the misses are reported as plainly as the hits.
5. **Content:** Table 4.9 verbatim — sentiment ≥80% → **84.12% ✅**; ≥75% per language → 78.28 / 86.88 / 94.37, **code-mixed not evaluated** ✅ *(for the three tested)*; MAPE <15% → 21.41 / 15.17 / 13.28, **1 of 3** ◐; sentiment beats sales-only → **worse in 6 of 8, none significant** ❌; UAT ≥4.0 → **4.07 ✅** (three dimensions below); response <3 s → 2.70 ms computation, **end-to-end not measured** ◐; chart contrast ≥3:1 → **2.28:1 ❌**.
6. **Source:** **Table 4.9** (p. 44); Table 5.1.
7. **Visual:** Full-width table, one row per target, status column. Use three marks **distinguishable without colour** — this slide above all must not fail the project's own accessibility rule.
8. **Recommended visual:** **Reuse Table 4.9 directly.**
9. **Assets:** None.
10. **Verification:** ✅ Verbatim. **Must not be softened — its credibility is its value.**
11. **Transition:** "So what does that mean, and what is still unproven?"

---

### PART 07 — DISCUSSION, CONCLUSION AND CLOSE

**SLIDE 20 — What this does not prove**
1. **Section:** 07
2. **Title:** Threats to validity, stated before you ask
3. **Purpose:** Convert the strongest Q&A attack surface into a content strength.
4. **Key message:** I can tell you precisely what this evidence does not support.
5. **Content:** **Labels** — no Cohen's κ, so label reliability is unmeasured; code-mixed text, the very thing motivating a multilingual model, was never evaluated. **Deployment** — the dashboard's sentiment is a rating heuristic; the trained model is evaluated offline only. **Forecasting** — Brazilian retail data, not Malaysian small businesses; sentiment inputs were a star-rating proxy; LSTM untrained (470 < 730 days); 10 folds give DM tests little power — "not significant" means "not certain", not "no effect". **Crisis detection** — **no labelled set of real crises exists, therefore no precision, recall or lead time is reported.** **Evaluation** — n = 15, 7 students; end-to-end response time unmeasured; chart contrast failed. **Data** — the demonstration dataset is synthetic.
6. **Source:** **§4.7 Threats to Validity**, **§5.3 Limitations**; `knowledge.md` §10 + §16.9.
7. **Visual:** Five grouped headings, one line each. Deliberately plain — the restraint carries the tone.
8. **Recommended visual:** Typographic only.
9. **Assets:** None.
10. **Verification:** ✅ Verbatim §4.7/§5.3. **Nothing here may be softened.**
11. **Transition:** "Against that, here is what the project does contribute."

**SLIDE 21 — Contribution and discussion**
1. **Section:** 07
2. **Title:** Four contributions — including two negative results
3. **Purpose:** State the academic and practical contribution precisely.
4. **Key message:** A reported negative result is a contribution, because it tells the next researcher where not to go.
5. **Content:** **Knowledge** — original-language classification beat translate-first by 12.2 pp on this data; rating-based sentiment did not improve forecasts under three pre-set protocols. **Method** — a forecasting comparison with horizons and tests fixed before the runs and *all* outcomes reported, including off-target ones. **Technical** — the two-layer design (rules decide, LLM rewords) plus the rule that every displayed number must trace to a real calculation or a stated assumption. **Practical** — one free, open-source system serving both a business with years of records and one with none. Versus prior work: agrees with XLM-T [15] and Zeng et al. [21]; **disagrees with Fu & Fisher [23]** — with the inputs and data differing, stated explicitly.
6. **Source:** **§5.2**, §4.4, **Table 4.10**.
7. **Visual:** Four labelled blocks; the two negative results visually marked *as* contributions.
8. **Recommended visual:** Optionally compress Table 4.10 to the agree / partly differ / disagree rows.
9. **Assets:** Table 4.10 content.
10. **Verification:** ✅
11. **Transition:** "To close."

**SLIDE 22 — Conclusion, future work and Q&A**
1. **Section:** 07
2. **Title:** "Yes, but" — and exactly where the "but" goes next
3. **Purpose:** Land the takeaway and open questions.
4. **Key message:** A free, multilingual, evidence-backed decision support system is achievable for a Malaysian small business — and this work shows both that it works and where it does not yet.
5. **Content:** One-line answer using the dissertation's own phrase (§5.1): ***"yes, but."*** Highest-priority future work from Table 5.2: label code-mixed comments with two annotators and report κ; **deploy the trained sentiment model and retire the star-rating rule**; repeat the sentiment-forecast comparison using the trained model on Malaysian sales; fix chart contrast to 3:1; measure end-to-end response time; collect labelled incidents so precision and recall become reportable; pilot with real local shops. Closing line: **"Every number you saw today came from a script that can be re-run."**
6. **Source:** §5.1, **Table 5.2** (pp. 50–51); paper Conclusion.
7. **Visual:** Minimal — takeaway sentence large, six future-work items small beneath, "Thank you — questions?" and contact.
8. **Recommended visual:** None, or a faint InsightAid wordmark.
9. **Assets:** None.
10. **Verification:** ✅
11. **Transition:** → Q&A (appendix on standby).

---

## G. Two-Minute Product Demonstration Plan

**Purpose:** prove in 120 seconds that the artefact is real, that it reaches an *action* rather than a chart, and that it refuses to show what it cannot support.

**Spoken one-liner on the way in:** *"Two minutes on the live system — watch for one thing: every number carries a label saying where it came from, and anything the data can't support stays locked."*

**Journey:** Business Startup → crisis evidence → evidence-cited recommendation → recorded decision → 25-second cut to the Local Shop pathway for the locked-capability contrast. Covers **both pathways** and pays off the opening hook without a feature tour.

### Run of show

| Time | Screen / route | Action | What the examiner should notice | Key message |
|---|---|---|---|---|
| **0:00–0:12** | Overview dashboard (`/`) | Pre-loaded and signed in — **never demo the login** | Executive summary band: positive sentiment %, crisis risk **Warning**, revenue forecast — three analyses in one sentence | "One screen, three analyses, written as a sentence an owner can read." |
| **0:12–0:40** | Crisis Detection (`/crisis-detection`) | Click through from the dashboard; point at the risk gauge, then the triggered-signals list | Score **30/100 → Warning**; the **named signals** (negative share 50%, average rating down 0.59); signals with too little history read **"not enough data"**, not zero | "The score is addition, not a black box: 20 points for a critical signal plus 10 for a warning. Where there isn't enough history, it says so." |
| **0:40–1:05** | Crisis Detection — episode view | Scrub the episode timeline briefly | Episodes are **grouped consecutive warning days** with start, peak and the signals that drove them | "This is the hook from slide 2, running: the signals were there before revenue moved." |
| **1:05–1:32** | AI Recommendations (`/recommendations`) → Action Centre (`/action-centre`) | Expand one card's **"Why this recommendation?"**, then Accept it | The card cites the **exact evidence** that triggered it; accepting **records a decision and changes nothing else** — no price edited, no supplier contacted | "The language model rewrote this sentence. It could not have written the decision, the priority or the evidence." |
| **1:32–1:55** | Local Shop (`/local-shop`) → Business Overview | Switch pathway; **Load demo shop (Kedai Makmur)**; point at break-even **RM7,131**, then the readiness list | Break-even computed from the owner's own entries; **Forecasting and Sentiment shown LOCKED with a stated reason** — "no sales history yet" — not an empty chart | "Second pathway: a shop with no data at all still gets a break-even — and the system refuses to pretend it can forecast." |
| **1:55–2:00** | — | Stop sharing | — | "That's the artefact. Now the evidence." |

### Demo discipline

- **Sign in beforehand**; all four routes pre-loaded in tabs. Never type credentials live.
- **Keep the "synthetic data" label visible** — the Business Startup demo is the fictional Embun Botanica brand.
- **Use Kedai Makmur** for the Local Shop beat so the screen matches Table 4.8 S2 and Figs C.14–C.19 (B-1).
- **Do not open** Dataset Management, Reports, Model Performance, Social Intelligence or Settings — appendix material (A-8).
- **Do not run the AI assistant live** — it depends on an external provider with a free-tier rate limit. Show the investigation-trace screenshot (Fig C.21) on a slide instead, where the trace is more readable anyway.

### Fallback — three tiers, all legitimate

**Tier 1 — pre-recorded screen capture** of this exact journey, recorded from the real running system, 2 minutes, no baked-in narration (you narrate live). Record it the day before, after B-1/B-2/B-3 are resolved. Keep it on the local machine, not in cloud storage.

**Tier 2 — Appendix C figures**, which are genuine captures of the real system: Fig C.3 (dashboard) → C.6 (crisis detection) → C.13 (recommendation cards) → C.22 (Action Centre) → C.14 (Local Shop overview) → C.18 (what-if). Walking these in order tells the same story.

**Tier 3 — local dev run with the auth bypass** *(backend completely dead)*. `/local-shop` sits behind `RequireAuth`, but a **dev-only** bypass exists (`VITE_DEV_BYPASS_AUTH=true`, which Vite dead-code-eliminates from production builds, so it cannot be enabled in deployment). Running `npm run dev` locally with it set demos the **entire Local Shop pathway — Kedai Makmur, break-even, what-if, capital, cost pressure — with no backend at all**, because that pathway's data is a local fixture, not a Supabase read. The Business Startup pathway stays empty under RLS without a session.

**What the fallback must never be:** a mock-up, a re-created screen, or figures described as live. If the system fails, say so in one sentence — *"the backend is on a free tier that auto-pauses; here is the same journey recorded yesterday"* — and move on. Handling a failure transparently costs far less under this rubric than being caught dressing one up.

---

## H. Visual Asset and Evidence Map

### H.1 Reuse directly (presentation-quality already)

| Asset | Source | Slide | Why | Insight it must deliver |
|---|---|---|---|---|
| **Fig 3.3** System architecture | p. 16 (= paper Fig. 1) | S9 | Clean four-box diagram, consistent across both documents | Decision logic independent of database and interface |
| **Fig 3.11** Two-step recommendation | p. 26 | S12 | Carries the headline contribution in one picture | The LLM's output is constrained to wording |
| **Fig 4.3** Sentiment accuracy & macro-F1 | p. 36 | S16 | Already carries the 80% target line | Only XLM-R clears it; translation-first is worst |
| **Fig 4.6** MAPE by method | p. 39 | S17 | Already carries the 15% target line | Prophet closest; target still missed on this protocol |
| **Fig 4.7** UAT dimension means | p. 41 + `reports/figures/fig_uat_dimensions.png` | S18 | Repo file is full resolution | Three dimensions above, three below 4.0 |
| **Table 2.2** Gaps → response | p. 12 | S7 | Already a two-column slide-shaped table | Each gap forced a design decision |
| **Table 4.9** Targets vs. results | p. 44 | S19 | The honest scoreboard | Three met, one partial, three missed |
| **Fig 3.1** Research framework | p. 13 | S8 | Simple five-phase chain | Objectives map to phases |

### H.2 Simplify or redraw before use

| Asset | Source | Slide | Why | What to change |
|---|---|---|---|---|
| Fig 3.9 Data handling | p. 22 | S10 | Vertical, wastes slide width | Redraw horizontally in deck styling |
| Fig 3.5 Flow chart | p. 18 | S13 | Too many nodes projected | Reduce to the two pathway branches |
| Table 2.1 Related studies | p. 10 | S6 | 15 rows, unreadable at size | Compress to five theme statements |
| Table 3.6 Datasets | p. 30 | S10 | Dense six-column table | Three cards: dataset / size / role, colour-coded public vs synthetic |
| Fig 3.2 IID cycle | p. 14 | S8 (optional) | Hand-drawn style clashes with the deck | Redraw or omit |
| Table 4.10 Comparison | p. 44 | S21 | Seven rows is two too many | Keep agree / partly differ / disagree |
| **Fig 4.1 / 4.2 Survey charts** | p. 35 | S3 | **Microsoft Forms screenshots** — wrong typography, low contrast, visible UI chrome | Redraw as native charts from the same counts |

### H.3 Capture fresh

| Needed | Why | For |
|---|---|---|
| **2-minute screen recording** of the Section G journey | No recording exists; the only legitimate Tier-1 fallback | S15 |
| **A re-run forecast** so Forecasting shows a future-dated horizon | The stored run forecasts dates now past (B-3) | Demo |

### H.4 Appendix-only assets (already exist)

Fig 4.5 confusion matrix (`reports/figures/fig_confusion_xlmr.png`) · full Table 4.4 · Appendix E JSON artefact (`reports/figures/fig_appendix_e_artefact.png`) · Table 3.3 crisis thresholds · Table 3.4 recommendation rules · Fig 3.12 assistant flow · Fig 3.8 ERD · Fig 3.4 use case · Fig 3.7 class diagram · Figs C.1–C.22 · Fig D.1 Gantt.

### H.5 Charts that would help but whose data does not exist — **do not fabricate**

Each is a legitimate "that was not measured" answer:
- **Forecast-vs-actual per fold** — only averaged metrics and the final forecast are persisted; fold-level predictions were never stored.
- **Crisis precision/recall or ROC** — no labelled ground truth exists anywhere in the project.
- **Code-mixed accuracy** — the evaluation corpus carries no code-mixed language tag.
- **End-to-end page-time distribution** — the Playwright timing test exists but has not been executed (see J.3).
- **Cohen's κ** — the second-annotator column was never labelled.

---

## I. Appendix Slide Recommendations

| # | Slide | Content | Question it answers |
|---|---|---|---|
| **A-1** | **Trained model vs. live dashboard label** | Dashboard shows `rating_heuristic_v1` (4–5 positive, 3 neutral, 1–2 negative); the three trained classifiers are offline-only; unrated posts are left unlabelled, never guessed | *"Is the 84% model actually running in the app?"* — **the highest-probability question in the viva.** Answer: no, and the system names the rule so the two can't be confused |
| **A-2** | Confusion matrix + Mandarin F1 anomaly | Fig 4.5; neutral recall 65.8% vs positive 91.6%; **Mandarin accuracy 94.37% but macro-F1 0.6292** | *"Why is Mandarin's F1 so much lower than its accuracy?"* — class imbalance; accuracy alone overstates it |
| **A-3** | Full forecast results | Tables 4.4 + 4.5, MAE/RMSE/MAPE/MASE for all five methods | *"Show me all the numbers, not just MAPE."* |
| **A-4** | Use case · flow chart · ERD · class diagram | Figs 3.4, 3.5, 3.7, 3.8; 18 tables; RLS owner-only on every user table | *"How is the data modelled and isolated between users?"* |
| **A-5** | Crisis thresholds in full | Table 3.3's seven signals, warning/critical thresholds, scoring, "insufficient data" below 3 days | *"How did you choose those thresholds?"* — honest answer: by design against the business's own baseline, **not tuned against labelled outcomes, because none exist** |
| **A-6** | Assistant architecture | Fig 3.12; three read-only tools; validated tool choice; max one call; question/tool/answer logged | *"How do you stop the assistant inventing numbers?"* |
| **A-7** | Diebold–Mariano detail | All eight: p = 0.1374, 0.3636, 0.7808, 0.4880, 0.7340, 0.1907, 0.5696, 0.1485; n and h per test; star-rating proxy caveat; low power at 10 folds | *"Does this prove sentiment doesn't help?"* — no: not demonstrated ≠ disproved |
| **A-8** | Remaining system screens | Figs C.4, C.7, C.9, C.10, C.11, C.12 | *"What else does it do?"* — without spending demo time |
| **A-9** | Testing strategy | Four levels (unit / service / browser / live feature); 462 tests in 57 files; real bugs found only by live testing (1,000-row truncation, column-synonym false error) | *"How do you know it works?"* |
| **A-10** | Reproducibility | Seed 42, hyperparameters (Table 3.8), run id `a8b3bb637d28`, dataset version `olist_v1_trimmed_20261112`, protocols fixed before runs, Appendix E raw artefact | *"Can this be re-run?"* — also covers the ramp-up-trim decision |

**Two answers to rehearse without slides:**
- *"Why is your in-app forecast the worst of the five?"* — Deno Edge Functions cannot import Prophet/ARIMA; the moving average was chosen for speed and explainability; its real MAPE (18.54%) is **shown in the app rather than hidden**; the fix is a Python microservice (Table 5.2).
- *"15 people, 7 students — is that a valid evaluation?"* — No, not as a measure of acceptance among Malaysian small businesses, and §4.2.2 and §4.7 say so. It is an indicative pilot.

---

## J. Missing Information and Action Checklist

### J.1 Essential — blocks slide production or the demo

| # | Item | Status |
|---|---|---|
| 1 | **Demo shop: Kedai Makmur** | ✅ **DECIDED.** Code restore still pending — see B-1 for the exact command |
| 2 | **Unpause and warm Supabase** | ⏳ Day before |
| 3 | **Refresh Business Startup demo data / re-run forecast** | ⏳ Day before |
| 4 | **Confirm the presentation time limit** | ⏳ Supervisor |
| 5 | **Record the 2-minute fallback video** (after 1–3) | ⏳ Day before |
| 6 | **Proposal Defence slides** — supply, or confirm the deck derives identity from the live app | ⏳ Your call |
| 7 | **Canva link** — confirm whether it may be fetched, or supply screenshots | ⏳ Your call |

### J.2 Important — affects factual accuracy on specific slides

| # | Item | Affects |
|---|---|---|
| 8 | Resolve the Olist licence "(verify)" in Table 3.6 | S10 |
| 9 | Decide how to present 462 vs 470 tests (B-5) | S18 |
| 10 | Decide whether to claim any chart-contrast fix — only if re-measured (B-15) | S18, S19, S22 |
| 11 | Verify the "5 category series" per-method sentence (B-8) | S17 |
| 12 | Decide whether to name Groq as the provider (B-14) | S12 |
| 13 | Decide how to frame the Local Shop EN/BM/ZH switch (B-7) | S13, S22 |

### J.3 End-to-end timing test — the single highest-value optional item

**What exists:** `e2e/journey-existing-data.spec.js` already times each page from navigation start to network idle, asserts `< 3000 ms` per page, and prints a summary with a SLOWEST line and a "Target < 3000 ms: met / NOT met" verdict. It has never been *run*, because `e2e/helpers.js` honestly `test.skip()`s without real credentials rather than faking a session.

**Procedure:**
1. Unpause Supabase; confirm `usertest1` signs in through the UI.
2. Build and serve **production**, not the dev server: `npm run build` → `npm run preview` → point `E2E_BASE_URL` at the preview port.
3. Set `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` in the environment — never in a file.
4. `npx playwright test e2e/journey-existing-data.spec.js --reporter=list`
5. Run **5 times**; report **median and maximum per page**, not a single run — the dissertation's computation figure is a mean with a p95, so the end-to-end figure should match that rigour.
6. Save the console output verbatim as the artefact, the way `O1_SCORECARD.md` serves O1.

**Three things to decide before running, not after:**
- **It can come back "NOT met."** Table 4.9 currently says "end-to-end not measured" — honest and unfalsified. Measuring converts that to ✅ or ❌. On a cold free-tier backend with real network latency, >3 s on the heaviest page is entirely plausible. **If you run it, you must report what it says.** An examiner learning you measured and withheld it would be far more damaging than a missed target. Still worth running: a measured miss with a stated cause beats no measurement.
- **"Navigation start to network idle" is a conservative proxy** — it includes Supabase round trips and full render, so it over-counts relative to "the user can see the answer." Say so on the slide rather than let it be pointed out.
- **It measures one machine and one network** — a single-environment result, not a performance claim. Report the environment alongside it (Table 3.10).

### J.4 Optional

| # | Item | Gain |
|---|---|---|
| 14 | Bump and re-verify the test runner (B-6) | Removes a reproducibility stumble |
| 15 | Redraw Figs 4.1/4.2 as native charts | Removes the only visibly low-quality figures |

---

## K. Final Presentation Quality Review

**Narrative flow — strong.** HOOK (S2) → PROBLEM (S3–S4) → INSIGHT (S6–S7) → SOLUTION (S9, S12–S13) → IMPLEMENTATION (S14) → EVIDENCE (S15–S19) → VALUE (S21) → TAKEAWAY (S22). The hook pays off twice: in the demo's crisis-episode beat, and in S17's negative result. Targets set on S5 are scored on S19 — the deck closes its own loop.

**Academic completeness — complete:** motivation, literature, gap, objectives/questions/scope, methodology, architecture, datasets and preprocessing, model selection, implementation, database/API integration, demo, model evaluation, system testing, results, limitations, contribution, future work. Requirements engineering is thinnest (the dissertation itself treats it via the use-case diagram); Fig 3.4 in A-4 is the right depth.

**Marking-scheme coverage — strong, with one structural dependency.** Content (×5) is carried by S5, S9, S16–S19 and backed by re-runnable artefacts. Q&A (×1) is carried by ten appendix slides. **Visual aids (×1) depends entirely on J.1 items 1–3** — the only criterion with a single point of failure.

**Technical defensibility — strong, with three known soft spots**, all disclosed in the dissertation and all with prepared answers: the live sentiment heuristic (A-1), crisis detection without ground truth (A-5), and the small, student-heavy UAT sample.

**Repetition check — one real risk.** The two-layer idea appears on S12, in the demo, and on S21. Deliberate (it is the headline contribution) but phrase it differently each time: S12 explains *the mechanism*, the demo *shows it*, S21 claims it *as a contribution*. Three identical sentences would read as padding.

**Time allocation — sound, one pressure point.** 3:30 for five opening slides is tightest; S3 and S4 must be ~40 seconds each. If you run long, the recoverable minute is in S6 — **never** in S19 or S20.

**Factual consistency — managed.** Twenty discrepancies registered in Section B, each with a `[P]` presentation handling and, where relevant, a `[D]` post-viva fix. The documents are frozen; the deck follows the dissertation.

**Honesty posture — the deck's strongest asset.** S19 and S20 would be unusual in an FYP viva: most presentations bury partial achievement. Under a rubric scoring "facts presented are accurate" at ×5, a scoreboard marking three of seven targets as missed is the most direct demonstration of mastery available — provided the delivery is matter-of-fact, not apologetic.

---

## L. Final Recommendations

1. **22 core slides + 10 appendix.** Within the 20–24 range; every core slide carries one idea.
2. **20 minutes** — **confirm with your supervisor**; Section E scales proportionally.
3. **Demo at slide 15 (~11:30)** — earlier than the draft structure, so "is this real?" is settled before the results chapter and a slow start cannot squeeze it.
4. **Demo exactly 120 seconds**, per Section G. Secondary features go to A-8.
5. **Structural changes:** merged the two overlapping implementation slides; added a targets slide (S5) paired with a scoreboard (S19); added a threats-to-validity slide (S20). Net 23 → 22.
6. **Lead with falsifiability and close with it.** S5 sets seven targets, S19 scores them, S20 says what remains unproven. This pairing is the spine and the clearest route to the ×5 criterion.
7. **Resolve J.1 items 1–3 before anything else** — they are the only items that can fail visibly in the room.
8. **If you have time for exactly one improvement, run the end-to-end timing test (J.3).** It is the only outstanding item that could convert a "partially achieved" objective into a measured result.

---
---

# SECTION M — SOURCE CODE AND WORKING APPLICATION REFERENCE

Included so this document is self-sufficient for slide drafting without repository access. Everything below was read directly from the codebase, not from the dissertation.

## M.1 Repository at a glance

| | |
|---|---|
| **Repository** | `insightaid-ai`, branch `main` |
| **Application type** | Single-page React web application + Supabase backend + a separate Python ML workspace |
| **Pages** | **16** page components; 14 authenticated top-level routes + the Local Shop sub-app (9 sub-routes) |
| **Database** | Supabase PostgreSQL, **17 sequential migrations** (`0001` → `0017`), row-level security on every user table |
| **Edge Functions** | **9** Deno functions |
| **Automated tests** | **470 passing in 57 files** today (Vitest) + Playwright E2E + pytest in the ML workspace. *The dissertation reports 462/57 at submission* |
| **Quality gate** | ESLint zero errors/warnings, full test suite passing, `npm run build` succeeding |

## M.2 Technology stack (verified against `package.json`)

**Frontend:** React 19.2.7 · Vite 8.1.3 · React Router DOM 7.18.1 · Tailwind CSS 4.3.2 · Recharts 3.9.2 · Framer Motion 12.42.2 · Lucide React 1.23.0 · `@supabase/supabase-js` 2.110.5 · jsPDF + jspdf-autotable (report export). **JavaScript throughout — no TypeScript in `src/`.** No Axios; Supabase JS and native `fetch` only.

**Backend:** Supabase — PostgreSQL, Supabase Auth, Row Level Security, Deno Edge Functions.

**ML workspace (Python):** pandas · scikit-learn · transformers · statsmodels · Prophet · XGBoost; trained on Google Colab free tier (NVIDIA T4, 16 GB VRAM).

**Quality:** Vitest 5.0.2 *(pinned; see B-6)* · Playwright 1.63.0 · `@axe-core/playwright` 4.14.0 · ESLint 10.6.0 · pytest. Node.js 24.13.

## M.3 Application structure

```
src/
├── App.jsx, main.jsx
├── routes/          index.jsx (router), RequireAuth.jsx, paths.js, pages.js
├── pages/           16 page components (list below)
├── features/
│   └── localshop/   the Malaysian Local Shop sub-application
│       ├── LocalShopLayout.jsx, routes.jsx, paths.js, nav.js
│       ├── pages/     Overview · MyBusiness · ProductsPricing · FinancialPlanning
│       │              WhatIf · StartupCapital · EconomicIntelligence · Assistant · ActionCentre
│       ├── engine/    breakEven · margins · expenses · scenarios · startupCapital
│       │              costPressure · readiness · nextStep · core   (+ __tests__)
│       ├── ai/        orchestrator · tools · guard · mockPlans      (+ __tests__)
│       ├── i18n/      strings.js (EN / BM / ZH), LanguageProvider, useLang
│       ├── store/     ShopProvider (localStorage), ActionsProvider
│       └── data/      demoShop.js (the "Kedai Makmur" fixture), cpi.js
├── services/        28 files — the ONLY layer allowed to touch Supabase
├── utils/           ~40 pure-logic modules, each with a matching *.test.js
├── components/      shell/ (AppShell, TopNav, MobileNavSheet, CommandPalette)
│                    charts/ · ui/ · common/
├── config/          designTokens.js · colorTokens.js · crisisThresholds.js
│                    recommendationThresholds.js · env.js
├── contexts/        ModeProvider · UIModeProvider · Notifications
└── constants/       modes.js · navigation.js · uiModes.js
```

**Layering rule enforced throughout:** page → `*Service.js` (Supabase) → `*.js` pure util (no I/O, unit-tested). The Local Shop engine is pure functions with no database or UI dependency, which is why its arithmetic is hand-verifiable.

**Authenticated routes:** `/` Dashboard · `/sentiment` · `/forecasting` · `/crisis-detection` · `/recommendations` · `/social-intelligence` · `/reports` · `/datasets` · `/model-performance` · `/agent-orchestrator` · `/financial-planning` · `/action-centre` · `/settings` · `/onboarding` · `/local-shop/*`. Public: `/welcome`, `/login`, `/signup`.

**Local Shop sub-routes:** `/local-shop` (Business Overview) · `/business` · `/products` · `/financial` · `/what-if` · `/capital` · `/economic` · `/assistant` · `/actions`.

## M.4 Database — 17 migrations, 18+ tables, RLS everywhere

| Migration | Adds |
|---|---|
| `0001_init` | `profiles`, `companies`, `user_preferences`, `api_keys`, `report_templates`, `storage_usage` |
| `0002_business_planning` | `business_profiles`, `business_assumptions` |
| `0003_data_pipeline` | `raw_data`, `processed_data`, `daily_aggregates` |
| `0004_model_versions` | `model_versions` — **the one shared/global table**; any authenticated user may read, only the service role may write (it holds benchmark results, not user data) |
| `0005_forecast_results` | `forecast_results` |
| `0006_crisis_events` | `crisis_events` |
| `0007_recommendations` | `recommendations` |
| `0008` / `0009` | template constraint widening; `marketplace_products` + snapshots + sync log |
| `0010_workspace_mode` | `user_preferences.workspace_mode` (pathway selection) |
| `0011` / `0012` | recommendation feedback; UI accessibility mode |
| `0013_agent_investigations` | `agent_investigations`, `agent_tasks`, `agent_tool_logs` |
| `0014_startup_capital` | `business_assumptions.startup_capital_items` (JSONB), `.available_capital` |
| `0015_recommendation_status` | `recommendations.status` — `pending` / `accepted` / `dismissed` |
| `0016_local_shop` | Local Shop pathway tables |
| `0017_forecast_results_mase` | MASE column on forecast results |

**Every user table carries an owner-only RLS policy** (`auth.uid() = user_id`), which is the mechanism behind the dissertation's claim that no business can see another's data.

## M.5 Edge Functions (Deno)

| Function | Role |
|---|---|
| `_shared/aiClient.ts` | **Provider-agnostic LLM client.** OpenAI chat-completions shape; configured by `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`; retries on 429/503 only; typed errors for not-configured, upstream failure, malformed response. **Swapping provider is a secrets change, never a code change.** Currently Groq |
| `explain-recommendations` | Layer 2 rewording of rule output — **only the wording is accepted** |
| `explain-report` | Narrative wording for generated reports |
| `extract-business-profile` | Parses a free-text business description into profile fields, each labelled `ai_extracted` |
| `agent-manager` | The real Manager Agent: picks ≤1 tool from a validated registry, executes, logs to `agent_*` tables |
| `agent-orchestrator` | Earlier, simpler keyword-routed demo — retained and labelled as simplified |
| `chat-assistant` | General app-help chat; explicitly instructed it has no access to real business data |
| `run-forecast` | The in-app moving-average forecast with the ±1.96×RMSE band |
| `source-status` | Data-source connectivity reporting |

## M.6 Decision logic — where each dissertation claim lives in code

| Dissertation claim | Implementation | Test |
|---|---|---|
| 7 signals, 10/20 points, cap 100, Normal/Warning/Critical at 25/60 | `src/config/crisisThresholds.js`, `src/utils/crisisDetection.js` | `crisisDetection.test.js` |
| Episodes = grouped consecutive non-Normal days | `src/utils/crisisHistory.js` | `crisisHistory.test.js` — **deliberately uses non-matching dates to prove the logic isn't hard-coded to the demo's dates** |
| 6 recommendation rules citing evidence | `src/utils/recommendationRules.js`, `src/config/recommendationThresholds.js` | `recommendationRules.test.js` |
| Break-even = fixed ÷ (price − cost) | `src/utils/scenarioEngine.js`; `features/localshop/engine/breakEven.js` | `scenarioEngine.test.js`, `engine.test.js` |
| Conservative 0.7× / expected / growth +40% | `src/utils/scenarioEngine.js` | `scenarioEngine.test.js` |
| Rating heuristic 4–5/3/1–2, named `rating_heuristic_v1` | `src/utils/ratingSentimentHeuristic.js` | `ratingSentimentHeuristic.test.js` |
| Rule-based language detection (EN/BM/ZH/Tamil/mixed/unknown) | `src/utils/textPreprocessing.js` | `textPreprocessing.test.js` |
| Readiness / capability gating | `src/utils/dataReadiness.js`, `capabilityMapping.js`, `features/localshop/engine/readiness.js` | `dataReadiness.test.js`, `capabilityMapping.test.js` |
| 3-tool registry with enforced input schema | `src/utils/agentToolRegistry.js` (mirrored server-side) | `agentToolRegistry.test.js` |
| W3C contrast checking | `src/utils/contrastRatio.js` | `contrastRatio.test.js` |
| Response-time measurement | `src/utils/responseTime.test.js` | — |

## M.7 ML workspace

```
ml/
├── sentiment/      src/ · notebooks/ · tests/ · data/
│   └── results/    O1_SCORECARD.md
│                   model_versions_v20261020-171546.json
│                   PHASE3_STATUS.md
└── forecasting/    src/ · notebooks/ · scripts/ · tests/ · run_protocol.py · colab_adapter.py
    └── results/    protocol_summary_a8b3bb637d28.json      ← the dissertation's headline run
                    forecast_results_a8b3bb637d28_{daily_h7,daily_h30,weekly_h4}.json
                    protocol_summary_a1bf3708ed4a.json      ← earlier untrimmed run (superseded)
                    phase4_sentiment_regressor/results.json
```

**Reproducibility handles for A-10:** run id **`a8b3bb637d28`** · dataset version **`olist_v1_trimmed_20261112`** · mature start **2017-05-17** · `trim_ramp_up: true` · Prophet config (multiplicative seasonality, changepoint prior 0.01, BR holidays) · seed **42** · XLM-R `xlm-roberta-base`, LR 2e-5, batch 16, 3 epochs, max length 128.

**Worth knowing for a methodology question:** the earlier run `a1bf3708ed4a` (untrimmed) produced daily-h7 MAPEs of 40–48%; trimming the dataset's ramp-up period to the mature 470-day window brought the same methods to 15–18%. **Trimming the ramp-up is a defensible methodological decision — justify it as excluding a marketplace's growth phase, not as selecting a favourable window**, and note that the protocols were fixed before the runs either way.

## M.8 Demo data — two datasets, which is which

This distinction matters for the demo, because **only one of the two can go stale**.

| | **Business Startup demo** | **Local Shop demo** |
|---|---|---|
| Name | **Embun Botanica** — fictional Malaysian skincare brand, Lab Embun, Shah Alam | **Kedai Makmur** — grocery shop |
| Account | `usertest1@insightai.com` | None — a "Load demo shop" button |
| Storage | **Supabase**: `raw_data` → `processed_data` → `daily_aggregates` | **Hardcoded fixture** in `src/features/localshop/data/demoShop.js`, held in `localStorage` |
| Size | 4,080 sales transactions · 2,810 review/social posts · 7 products across 3 categories · RM1,849,420.30 revenue · avg price RM39.87, avg cost RM15.37 (58.4% margin) · 1,143 rated reviews (~73% positive / 16% negative / 10% neutral) across 4 platforms and 5 language buckets | 28 products · 6 expense lines (RM2,500 fixed, RM2,750 total) · 8 capital items (RM29,400) · **no sales history at all** |
| Date range | **2024-09-01 → 2026-10-21** | **No dates whatsoever** |
| Dissertation scenario | **Table 4.8 S1** — "Incident period, Business Startup" → Warning, score 30, negative share 50%, rating drop 0.59 | **Table 4.8 S2** — "New shop with no data" → break-even **RM7,131** (hand-check RM2,500 ÷ 35.06% = RM7,130.6) |
| Figures | C.3–C.13 | **C.14–C.19** |
| **Can it age?** | **Yes — this is the one that aged.** Its last day is 2026-10-21, so "last N days from today" charts are now past the end of their own data | **No.** Dateless, so it recomputes identically forever |

**Other demo accounts:** `usertest2` — Local Shop no-data planning path. `usertest3` (Kedai Makan Pak Long) and `usertest4` (Kasual Thread Co.) — specs written in `docs/SYNTHETIC_DATASET_SPECS.md`, but `knowledge.md` §16.8 records their **data generation as still outstanding**; do not plan a demo around them without checking. `demotest1` — main demo identity.

**The five Local Shop scenarios** in `docs/demo/LOCAL_SHOP_DEMO_SCENARIOS.docx` (Warung Nasi Lemak Kak Yah, Dobi Layan Diri Bersih Jaya, Gerai Bunga & Hadiah Seri, Barbershop Gunting Abang Din, Kedai Telefon & Aksesori Nexa) are **reference sheets for manual entry, not shipped data** — useful as backup material if an examiner asks to see the planning pathway driven by a different business, but each must be typed in.

## M.9 How to run the application and its checks

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build      # production build (must succeed — quality gate)
npm run preview    # serve the production build
npx eslint .       # must be zero errors and zero warnings
npm test           # Vitest — 470 passing in 57 files
npx playwright test                                      # E2E (skips without credentials)
npx playwright test e2e/journey-existing-data.spec.js    # the timing test (J.3)
```

**Environment:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the app; `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` for authenticated E2E; `VITE_DEV_BYPASS_AUTH=true` **dev-only** auth bypass (Vite dead-code-eliminates it from production builds, so it cannot be enabled in deployment) — the Tier-3 demo fallback. Edge Function secrets: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, set via `supabase secrets set`, never as `VITE_*`.

## M.10 The design thesis, as actually enforced in code

Useful for S12, S13, S19 and for any "how do I know your numbers are real?" question:

1. **Missing data is never drawn as zero.** Every page renders one of five states — loading, data, empty, error, unavailable — and an unavailable feature gives a reason.
2. **Every displayed number traces to a real calculation or a stated assumption.** Provenance labels (`user_provided` / `ai_extracted` / `default_assumption`) travel with each profile field; a typed value is never overwritten by a suggestion.
3. **Forecasts show a range; simulations are labelled simulations**, never forecasts.
4. **Rule-based output is named after its rule** (`rating_heuristic_v1`) so it can never be mistaken for a model prediction.
5. **The LLM may not supply a number.** Rules decide; the model rewords; everything else it returns is discarded; if it is unreachable, the rule text is shown.
6. **Illustrative data is flagged as illustrative** and ribboned in the UI.
7. **No pie or donut charts** — the project's own chart audit replaced a 4-slice donut with a ranked bar on Cleveland–McGill grounds, and two colourblind-unsafe palette pairs were fixed.

---

**End of blueprint.** Section M makes this document self-sufficient: it can be handed to a slide-drafting session with no repository access and no further questions about what the system actually contains.
