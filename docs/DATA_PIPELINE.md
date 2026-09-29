# InsightAid AI — Data Pipeline

**Scope:** FYP2.md §35 (upload validation), §41 (fallback data), §42 (normalized schema), §43 (provenance), §44 (preprocessing), §45 (feature engineering).
**Status:** Implemented and unit-tested (74 tests, `npm run test`). Not yet verified against a live Supabase session — see "Known limitations" below.

This document describes what actually exists in the repository today. It does not describe aspirational or planned functionality.

---

## 1. What this phase does and does not do

**Does:** replace Dataset Management's previously-fake upload (`setTimeout` + random numbers) with a real pipeline — parse a CSV/JSON file → validate it → preprocess any text columns → compute features → store everything in a normalized schema.

**Does not:** wire any of the other 9 dashboard pages to read from this new schema. Those pages still render from the static fixtures in `src/data/*.js`, exactly as before this phase. Making the dashboards data-driven from `processed_data`/`daily_aggregates` is materially larger, separate work (the Phase 0 audit already flagged this as later "production dashboard" work). Nothing in this phase should be read as "the dashboards are now live."

## 2. Architecture

```
Upload (CSV/JSON) ──┐
                     ├──► validateDataset() ──► raw_data (every row, untouched)
Fixture seed ────────┘                              │
                                                      │ (text-bearing templates only:
                                                      │  reviews, social)
                                                      ▼
                                              preprocessText()
                                                      │
                                                      ▼
                                          computeTextFeatures() / computeReviewFeatures()
                                                      │
                                                      ▼
                                              processed_data (§42/§43)
                                                      │
                                                      ▼
                                              aggregateDaily() ──► daily_aggregates (§45)
```

Every stage is a pure, independently unit-tested function in `src/utils/`. The service (`src/services/dataPipelineService.js`) is the only place that touches Supabase — pages never call `supabase` directly, matching this codebase's existing convention.

## 3. Files

| File | Role |
|---|---|
| `supabase/migrations/0003_data_pipeline.sql` | `raw_data`, `processed_data`, `daily_aggregates` tables + RLS. Self-contained — does not depend on `0001_init.sql` or `0002_business_planning.sql`. |
| `src/utils/csvParser.js` | Hand-written CSV → object-array parser (no library). |
| `src/utils/datasetValidation.js` | §35 validation report + template inference from column headers. |
| `src/utils/textPreprocessing.js` | §44 pipeline, in the specified order (see §4 below). |
| `src/utils/ratingSentimentHeuristic.js` | §37's documented rating→sentiment weak label. |
| `src/utils/featureEngineering.js` | §45 text features + daily aggregation. |
| `src/services/dataPipelineService.js` | `ingestRows()`, `seedFixtureSample()` — the only Supabase-touching code in this phase. |
| `src/pages/DatasetManagement.jsx` | Real upload UI: drag-drop, validation report dialog, "Load Sample Dataset". |

## 4. Preprocessing order (§44)

Implemented exactly as specified, in `preprocessText()`:

1. **Preserve raw text** — returned untouched as `rawText`, never overwritten.
2. **Detect language — before cleaning.** A small heuristic (see §6), run on the raw text.
3. **Normalize / remove URLs.**
4. *(Duplicate detection is a cross-row operation — handled in `datasetValidation.js`, not per-text here.)*
5. **Handle platform-specific symbols** — retweet-style `RT @user:` prefixes, zero-width/control characters, collapsed whitespace.
6. **Preserve meaningful repeated letters** — runs of 4+ identical letters are capped to 3 (`"soooooooo"` → `"sooo"`), keeping the emphasis signal instead of erasing it entirely or leaving an unbounded run.
7. **Handle hashtags** — extracted into a `hashtags[]` array; left in the cleaned text (stripping them would discard information).
8. **Handle mentions** — same treatment as hashtags.
9. **Code-mixed Malay-English support** — the language detector returns `'ms-en'` when both Malay and English function words appear in comparable proportion, rather than forcing a single tag onto genuinely mixed text.

## 5. Normalized schema (§42) and provenance (§43)

`processed_data` uses §42's field list (`raw_text`, `cleaned_text`, `language`, `author_id_hash`, `product`, `category`, `rating`, `engagement`, `sales`, `revenue`, `sentiment`/`sentiment_score`/`sentiment_confidence`/`model_name`/`model_version`/`predicted_at`) plus §43's provenance columns (`collection_timestamp`, `processing_timestamp`, `dataset_version`). `raw_data` is the generic "store raw, never modify" staging table every uploaded row lands in regardless of template.

Only **reviews** and **social** templates (the text-bearing ones) produce `processed_data` rows. **Sales**, **product**, and **expenses** templates are structured numeric/categorical data with nothing to preprocess — forcing them through the text pipeline would mean inventing steps the data doesn't support, so they stay in `raw_data` only.

## 6. What's a real model vs. a documented heuristic — read this before trusting any sentiment/language value

**No trained sentiment or language-ID model exists anywhere in this project yet** (confirmed repeatedly across the Phase 0–4 audits). Two provisional, clearly-labeled heuristics fill the gap so the pipeline isn't blocked on that future work:

- **`sentiment` / `sentiment_score` on `processed_data`** are only ever populated from a **rating**, when one is genuinely present on the row (`ratingSentimentHeuristic.js`, FYP2.md §37's own documented mapping: 4–5★→positive, 3★→neutral, 1–2★→negative). These rows are stamped `model_name: 'rating_heuristic_v1'` — **never a real model name** — specifically so a future real model's output is never confused with this heuristic's output. Rows with no rating (e.g. social posts) get `sentiment: null`, not a guess.
- **`language`** comes from a small function-word/script heuristic (`textPreprocessing.js`'s `detectLanguage`) — CJK Unicode range for Mandarin, a short Malay vs. English function-word list otherwise. It is **not** a trained language-identification model and has the obvious limitations of a small wordlist (short texts, slang, or languages outside en/ms/zh will often land as `'unknown'`). Treat `language` as a best-effort signal, not ground truth.

## 7. Mock data through the same pipeline (§41)

`seedFixtureSample()` takes the existing mock post text already in `src/data/sentimentData.js` and `src/data/socialData.js` and runs it through the exact same `ingestRows()` path a real upload uses — same validation, same `raw_data`/`processed_data` tables, same feature engineering. This is the "same normalized schema, same processing pipeline" §41 asks for, not a second decorative pipeline.

One deliberate honesty constraint: the mock review posts never had a real star rating (they only ever had a hand-authored `.sentiment` label, itself mock UI content from an earlier phase). Synthesizing a fake rating from that fake label would be fabricating a data point that never existed. So the seeded review rows are sent through with **no rating**, and their `sentiment` correctly comes back `null` — same as any real review missing a rating would.

## 8. Known limitations

- **`.xlsx` is not supported.** Real binary Excel parsing needs a library (e.g. SheetJS) with no zero-dependency alternative; deferred rather than adding a new dependency inside an already-large phase. The upload UI says so explicitly instead of silently failing or faking success.
- **Recent Imports only shows this session's uploads.** It doesn't yet read back a persisted import history from `raw_data`; that's a small follow-up, not built here.
- **`daily_aggregates`'s unique constraint** (`user_id, date, source, platform`) has the standard Postgres NULL-in-unique-constraint behavior — two rows with the same date/source and both NULL `platform` won't upsert into each other. Not a practical issue for the current templates (all populate `platform`), but worth knowing if that changes.
- **Not yet verified against a live Supabase session.** Same standing blocker as every prior phase in this project: the test account is stuck on "Email not confirmed," and the migration hasn't been run yet. Everything unit-testable (all parsing/validation/preprocessing/feature-engineering logic) has 74 passing tests with no auth required; the actual Supabase writes (`ingestRows`, `seedFixtureSample`) are code-reviewed but not yet exercised live.

## 9. To deploy

1. Run `supabase/migrations/0003_data_pipeline.sql` in the Supabase SQL Editor.
2. Resolve the outstanding email-confirmation blocker so the app can actually be logged into.
3. Upload a CSV matching one of the 5 templates (download them from the Reports/Dataset Management "Data Templates" section), or click "Load Sample Dataset."
