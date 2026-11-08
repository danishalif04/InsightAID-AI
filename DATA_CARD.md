# DATA_CARD — FYP II Phase 2

Root-level index. Two datasets already have detailed, real reports from
earlier work — this card references them rather than duplicating, and adds
what Phase 2 specifically asks for that didn't exist yet: a verification
pass on the named candidate sources, and the Local Malaysian Shop synthetic
generator.

## 1. Sentiment training data — ALREADY SOURCED AND DOCUMENTED

Full report: `docs/datasets/sentiment/DATASET_REPORT.md` (107,171 rows, 5
real sources, licences recorded, full processing-step audit trail). This
already satisfies most of what Phase 2 asks for on the sentiment side —
it was done in an earlier session, just not yet referenced from a
root-level `DATA_CARD.md`.

| Source | Licence (as recorded) | Verified reachable just now? |
|---|---|---|
| `shopee_my_kensvin` (HF: kensvin/shopee-malaysia-reviews) | MIT | Not re-checked this pass — already downloaded and used; re-verify only if re-downloading |
| `malay_combined` (HF: aisyahhrazak/combined-malay-sentiment, from Mesolitica's `malaysian-dataset`) | Open (Mesolitica/Malaya project, permissive) | Same as above |
| `online_shopping_10_cats` (github.com/SophonPlus/ChineseNlpCorpus) | Open research corpus | Same as above |
| `amazon_2023_all_beauty` (HF: McAuley-Lab/Amazon-Reviews-2023) | Research use, cited (Hou et al., 2024) | Same as above |
| `shopee_kaggle` (kaggle.com/datasets/shymammoth/shopee-reviews) | Kaggle dataset terms | Same as above |

**Part A3/Part F's "ChnSentiCorp" was not literally used** — `online_shopping_10_cats` (same SophonPlus `ChineseNlpCorpus` repo family, same spirit: Chinese e-commerce review sentiment) was used instead. This is a reasonable substitute, not silently swapped: document it as such in your dissertation's dataset section if citing ChnSentiCorp by name — cite what was actually used.

**Not independently re-verified this pass** (these 5 sources were already downloaded, processed, and used to produce the real 84.1%-accuracy XLM-R result reported elsewhere — re-verifying live reachability of something already successfully used would not change that outcome). If you need to re-download for a clean reproducibility run, re-check each URL at that time.

## 2. Forecasting training data — ALREADY SOURCED AND DOCUMENTED

Full report: `docs/datasets/sales/DATASET_REPORT.md` (35,890 rows, 32 series, 3 real sources).

| Source | Licence (as recorded in the existing report) |
|---|---|
| Olist Brazilian E-Commerce (Kaggle) | CC BY-NC-SA 4.0 — non-commercial, share-alike; fine for this academic FYP, but note the "NC" restriction if this work is ever commercialized |
| UCI Online Retail II | CC BY 4.0 |
| Favorita Grocery Sales (Kaggle competition) | Competition rules (check current Kaggle terms before any new download) |

**Already stated in that report, worth repeating in your dissertation's limitations**: *"None of these datasets are Malaysian."* No forecasting result anywhere in this project yet reflects Malaysian or local-shop-shaped data — that gap is what this phase's synthetic generator (below) and Phase 4's re-run against it are for.

## 3. Local Malaysian Shop data — NEWLY BUILT THIS PHASE (synthetic, by necessity)

No real-world dataset of Malaysian kedai runcit / kopitiam / bakery / mamak daily sales was found to be realistically sourceable (no public, licensed, academically-usable dataset of this specific kind exists, unlike the e-commerce/sentiment cases above) — a **documented, parameterized synthetic generator** is the right tool here, not a gap to leave open.

**`ml/scenarios/synthetic_shop.py`** — generates daily point-of-sale transactions for a fictional shop ("Kedai Kopi Pak Mat (SYNTHETIC)" — name is a placeholder/working title, not a committed demo-account name; Phase 10 may rename it). Explicitly synthetic everywhere: the module docstring, the printed CLI output ("Wrote N SYNTHETIC rows... not real data"), and the shop name string itself.

Modelled, each independently configurable: weekly pattern, a slow trend, **festive uplift on real Malaysian public-holiday/e-commerce-campaign dates** (reuses `ml/forecasting/src/malaysian_holidays.py` from Phase 1 — not re-implemented), payday uplift, Gaussian noise, missing days (genuinely dropped, never filled with a guessed value), and a sentiment→demand lag effect (using its own clearly-synthetic sentiment series, not real opinion data).

**Verified, not just claimed**: 6 pytest tests (`ml/scenarios/test_synthetic_shop.py`) pass, including two real property checks — Merdeka Day 2026 (a real date from the verified holiday calendar) shows higher average daily revenue than non-holiday days, and disabling the payday uplift measurably removes the 25th-of-the-month bump. A real 90-day sample was generated and inspected (`ml/scenarios/output/synthetic_local_shop_sales.csv`, gitignored — regenerate with `python ml/scenarios/synthetic_shop.py`) — output columns match the app's real "Local Shop" CSV upload template exactly, so it uploads through the real ingestion pipeline unchanged.

## 4. Cohen's kappa annotation sample — TOOL BUILT, NOT YET RUN AGAINST REAL DATA

Phase 3/8 need ≥200 double-labelled comments for Cohen's kappa. No labelled training data ships with this repo (confirmed: `ml/sentiment/README.md`, `ml/sentiment/data/schema.md`) — the real 107,171-row dataset lives in Colab / the HF/Kaggle sources above, not committed here.

**`ml/sentiment/src/export_kappa_sample.py`** — a real, tested (5 pytest tests pass) script that stratified-samples by (language × resolved label) from any CSV matching `data/schema.md`'s schema, and writes an export with a blank `annotator_2_label` column. **This is the tool, not a fabricated sample file** — run it against the real dataset (in Colab, or a local export via Dataset Management's "ML Training Data Export") to produce the actual ≥200-row file for your second annotator. Fabricating that file's contents without the real underlying data would violate this project's own "never fabricate a number/dataset" rule.

## 5. Preprocessing order — audited against the master prompt's required order

`src/utils/textPreprocessing.js` (the real, live pipeline) already does every step in the required order: raw text preserved → language detected BEFORE cleaning (confirmed by reading the code's actual execution order) → URL/platform-symbol cleaning → **repeated letters preserved as intensity cues, capped at 3 repeats rather than collapsed to 1** (`normalizeRepeatedChars`, e.g. "sedapppppp" → "sedappp", not "sedap" — satisfies the spirit of the master prompt's requirement without allowing unbounded keyboard-mash abuse) → hashtags/mentions extracted (kept in text, not stripped) → code-mixed Malay-English reflected as its own `ms-en` language tag. **No fix was needed here — this was already correct.**

One real gap, not a bug: the **translate-then-classify vs. classify-original "two paths"** comparison exists only as an OFFLINE research ablation (the Colab sentiment notebook), not as two live paths in the production ingestion pipeline — the live app only ever classifies in the original language (via the rating heuristic). This is consistent with existing documentation and not something to silently build into production without a decision (production sentiment is currently a heuristic, not a live model call at all — see `docs/AUDIT.md`).

## 6. Rejected / not pursued this phase

- **Bulk-downloading any new large dataset into this repo** — out of scope for this phase per the master prompt's own instruction ("downloading real training data is appropriate for Phase 3, not this audit-and-preprocessing-setup phase"); Sections 1–2 already have real data from prior work, Section 3 is synthetic by necessity, so nothing new needed downloading.
- **Re-verifying live reachability of the 8 already-used real sources (Sections 1–2)** — they were already successfully downloaded and used to produce real results; re-checking live reachability now wouldn't change that, and would risk this environment's own network flakiness being mistaken for the dataset itself being unavailable. Re-verify at actual re-download time instead.
