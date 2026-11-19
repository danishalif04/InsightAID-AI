# Runbook — Everything Still Open, In Order

Written for you to execute. Commands are **PowerShell** (your default shell), run from the repository root.
Each item states what "done" means, so nothing is half-finished.

**Order is by value per hour of effort.** Step 0 is mandatory before the viva; the rest turn scoreboard rows green.

| # | Item | Needs | Effort | Turns a row green? |
|---|---|---|---|---|
| **0** | Pre-viva essentials | Supabase access | 30 min | No — but a failed demo costs more than any row |
| **1** | Task 2 · end-to-end timing | Credentials + unpaused backend | ~30 min | **Yes** — "Response < 3 s" |
| **2** | Task 4 · code-mixed evaluation | Checkpoint + licence check | ~1 h | **Yes** — "≥75% per language (code-mixed)" |
| **3** | Task 5 · sentiment-as-regressor | Checkpoint + your confirmation | ~2 h | **Possibly** — "Sentiment beats sales-only" |
| **4** | Task 3 · deploy the model | Checkpoint + a free host | ~half day | No row, but closes the biggest known gap |
| **5** | Housekeeping | Nothing | ~1 h | No — removes three loose ends |

**One prerequisite unlocks items 2, 3 and 4: the trained checkpoint.** Start there if you want maximum movement.

---

## STEP 0 — Pre-viva essentials (do this regardless)

### 0.1 Kedai Makmur — ✅ already done, nothing to set up

The grocery-shop demo is **restored in code** and loads complete. It is a hardcoded fixture, not account data:

- **To load it:** sign in → **Local Shop** → **Load demo shop (Kedai Makmur)**. That's the whole setup.
- It writes to **browser localStorage** (`insightaid.localshop.shop`), not Supabase. It cannot be "lost" from the server because it was never there.
- It **will** disappear if you use a different browser or machine, use incognito, or clear site data. **Load it once on the actual presentation machine and don't clear data.**

What loads, verified by the test suite (470/470 passing):

| Page | What it shows |
|---|---|
| Business Overview | Kedai Makmur · Grocery shop · Malaysia · 28 products · RM2,500 fixed · 35.06% margin · **break-even RM7,131** |
| My Business | name, category, location, operating model, language, available capital, **+ sector, revenue target, description** |
| Products & Pricing | 28 products ranked by margin |
| Financial Planning | 6 expense lines · fixed RM2,500 · total RM2,750 |
| What-If Simulator | editable price/cost/fixed/units, labelled *simulation* |
| Startup Capital | 8 items · total RM29,400 · available RM25,000 · **gap RM11,900** |
| Readiness | product margin / break-even / capital **ready**; forecasting + sentiment **locked** |
| Cash runway | **deliberately blank** — reads "not enough information yet" and names what it needs |

The three profile fields are **display-only**: no engine function reads them, so they cannot move RM7,131, 35.06% or any figure the dissertation reports.

### 0.2 Business Sector, Revenue Target, Business Description — the full flow

These three appear in **two different places**. Don't confuse them.

**(a) Local Shop → My Business** — the browser-local shop. Already filled for Kedai Makmur:

| Field | Value | Why |
|---|---|---|
| Business sector | **Retail / E-commerce** | A kedai runcit is retail; must be one of the 10 fixed options |
| Revenue target | **9000** | RM2,750 total recorded expenses ÷ 35.06% margin = RM7,844 to cover every recorded cost; RM9,000 adds headroom and clears the RM7,131 break-even |
| Business description | the grocery-shop paragraph in `demoShop.js` | Owner's voice; states there are no daily sales records yet |

**(b) Onboarding → "Tell us about your business"** — this is the **Supabase** profile, and this is what `usertest2` lost. Flow:

1. Sign in as **usertest2**.
2. Go to `/onboarding` (or Settings → re-run setup).
3. **"What kind of business is this?"** → **Malaysian Local Shop**.
4. **"Let's set up your business"** → **"I don't have data yet"**.
5. Fill the three fields, then **Generate My Business Plan**:

| Field | Enter |
|---|---|
| **Business Sector** | `Retail / E-commerce` |
| **Revenue Target (RM / month)** | `9000` |
| **Business Description** | *"I run a small grocery shop in Malaysia, open to walk-in customers and taking cash or e-wallet. I stock about 28 everyday items — rice, cooking oil, sugar, flour, eggs, milk, instant noodles, drinks, biscuits and household goods like detergent and soap — plus bread, coffee and mineral water that sell every day. My customers are households and workers from the surrounding neighbourhood. I do not keep daily sales records yet, so I want to know what I need to sell each month to cover my rent, wages and utilities."* |

6. On the review screen, **check every field's provenance badge**. Anything marked *AI extracted* is a guess — correct it or clear it. Anything you typed stays *User provided* and is never overwritten.
7. Leave fields you genuinely don't have **blank** — a blank reads "insufficient information to evaluate this factor", which is the honest behaviour worth showing, not a gap to fill.

> If you want a different business for this account, the five sheets in `docs/demo/LOCAL_SHOP_DEMO_SCENARIOS.docx` each have their own sector / target / description already drafted.

**Done when:** usertest2 signs in and the planning pages compute from its own profile instead of showing empty states.

### 0.3 Unpause Supabase and refresh demo data

1. supabase.com → the project → **Resume/Restore** if paused. Wait for "Healthy".
2. Sign in as `usertest1` in a real browser — if sign-in works, the backend is up.
3. The Embun Botanica dataset ends **2026-10-21**, so "last N days from today" charts are now past their own data. Open **Forecasting → Run Forecasting** to generate a future-dated horizon, and check the Dashboard and Crisis Detection show content rather than honest empty states.

**Done when:** all five demo routes render with data on the presentation machine.

### 0.4 Record the fallback video

After 0.1–0.3, record the 2-minute journey from the running system (Overview → Crisis Detection → Recommendation → Action Centre → Local Shop). Keep it on the local disk. This is the only legitimate fallback if the backend fails in the room.

---

## ITEM 1 — Task 2 · End-to-end page timing

**Target:** < 3000 ms per analysis page. **Currently:** never measured.

### Prerequisites
Step 0.3 complete (backend up, `usertest1` signs in).

### Steps

```powershell
# 1. Browser binary (first time only)
npx playwright install chromium

# 2. Production build - NOT the dev server
npm run build
npm run preview        # note the port it prints, usually 4173
```

Leave that running. **In a second terminal:**

```powershell
cd C:\Users\User\FYP\insightaid-ai
$env:E2E_BASE_URL  = 'http://localhost:4173'
$env:E2E_TEST_EMAIL    = 'usertest1@insightai.com'
$env:E2E_TEST_PASSWORD = 'usertest1'

# 3. Warm-up run - DISCARD this one (pre-registered in PROTOCOL.md)
npx playwright test e2e/journey-existing-data.spec.js --reporter=list

# 4. Five measured runs, each saved verbatim
for ($i = 1; $i -le 5; $i++) {
  npx playwright test e2e/journey-existing-data.spec.js --reporter=list 2>&1 |
    Tee-Object -FilePath "results/post_submission_2026-11/timing_run_$i.txt"
}
```

### Check before you trust the output
- The run must say tests **passed or failed**, not **skipped**. "skipped" means the credentials didn't reach Playwright — re-set the `$env:` variables in the *same* terminal you run from.
- Each run prints a table ending `Target < 3000 ms: met` or `NOT met`.

### Report
Per page across the 5 runs: **median and maximum**. Pass rule, fixed in advance: **the maximum across every page and every run must be < 3000 ms.** Median alone is not enough.

### If it fails
Report it. "Measured at X ms, target not met" is a stronger position than "not measured" — it is a real number with a real cause (free-tier backend latency, cold starts). Say that navigation-to-network-idle is a **conservative proxy** that includes every Supabase round trip.

**Done when:** `timing_run_1..5.txt` exist and RESULTS.md carries median + max per page with a plain met/not-met verdict.

---

## ITEM 2 — Task 4 · Code-mixed evaluation

**Currently:** not evaluated — the one gap in an otherwise-met O1.

### Step A — Recover the checkpoint (unlocks items 2, 3 and 4)

`train_xlmr.py` saves to **`ml/sentiment/results/xlmr_model/`** (its `--output_dir` default). That folder is not in the repository. Look in this order:

1. **Google Drive** — if the Colab notebook mounted Drive, the folder is wherever `output_dir` pointed (often `MyDrive/...`). Look for `config.json`, `model.safetensors`, `tokenizer.json`, `sentencepiece.bpe.model`.
2. **The Colab runtime** — gone if the session was recycled. Check "Files" in any still-open session.
3. **Re-train** — last resort, see Step A2.

Restore to `ml/sentiment/results/xlmr_model/`. **Do not commit the weights** (hundreds of MB); add the folder to `.gitignore` and record its origin in RESULTS.md.

Verify it loads:

```powershell
python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; p='ml/sentiment/results/xlmr_model'; m=AutoModelForSequenceClassification.from_pretrained(p); t=AutoTokenizer.from_pretrained(p); print('OK', m.config.num_labels, 'labels')"
```

**Step A2 — if you must re-train.** Re-run `ml/sentiment/src/train_xlmr.py` in Colab with the recorded config: `xlm-roberta-base`, LR 2e-5, batch 16, 3 epochs, max length 128, **seed 42** (Dissertation Table 3.8). ⚠️ **This produces a *new* model.** Its accuracy will be close to 84.12% but is unlikely to be identical — GPU non-determinism. If you use a re-trained model, **every number it produces must be reported as coming from a re-trained checkpoint, not as the submitted 84.12% model.** Say so on any slide that uses it.

### Step B — Verify the corpus licence **before** downloading

SentiBahasaRojak comes from Romadhona et al., COLING 2022 (reference [4]). Go to the paper's own resource link and confirm the licence permits academic use. **I have not verified it and will not assume it.** If the terms are unclear, email the authors. If it doesn't permit use, **stop** and say the task is blocked — do not silently swap in a different corpus.

### Step C — Pre-register the label mapping **before** running

Append an amendment to `PROTOCOL.md` stating the exact mapping from the corpus's labels to positive / neutral / negative. If the corpus is binary or 5-point, the mapping decision goes in the amendment **first**. Commit it, then run.

### Step D — Evaluate, zero changes to the model

No fine-tuning, no threshold tuning. Reuse the existing helpers — `ml/sentiment/src/evaluate.py`, `metrics.py` and `confidence_interval.py` (the Wilson interval the dissertation already uses).

### Report
Accuracy · macro-F1 · **per-class recall** · Wilson 95% CI. Whatever it says. A low score on code-mixed text is a genuine finding and a strong answer to *"the thing that motivated a multilingual model was never tested"*.

**Done when:** RESULTS.md has those four numbers with the command and the checkpoint's provenance.

---

## ITEM 3 — Task 5 · Sentiment-as-regressor re-test

**Only on your explicit confirmation.** Needs Step A.

Replace the star-rating proxy with trained-model sentiment, then re-run **identically** to `a8b3bb637d28`: same 3 protocols, same folds, same methods, same seed 42, same Olist mature period. The regressor construction is already pre-registered (daily mean score mapped to −1/0/+1, lag 0).

```powershell
python ml/forecasting/run_protocol.py --help     # confirm the flags first
```

Report **all eight** Diebold–Mariano comparisons beside the submitted ones, whatever the outcome.

⚠️ **Realistic expectation:** the submitted result was *not demonstrated*, not *disproved*. It may well stay non-significant — 10 folds give little power regardless of how good the sentiment input is. That is still a better-evidenced answer than the proxy version.

**Done when:** all 8 comparisons are in RESULTS.md, with a plain met/not-met.

---

## ITEM 4 — Task 3 · Deploy the trained model

The biggest gap: the dashboard labels sentiment with `rating_heuristic_v1` while the 84.12% model is evaluated offline only. Needs Step A.

### Plan (all free tier)

1. **Push the checkpoint to Hugging Face Hub** (free, private repo is fine).
2. **Serve it from a Hugging Face Space** — free CPU, FastAPI or Gradio, one `POST /classify` endpoint taking a list of texts and returning `{label, score, model_name, model_version}` per text.
3. **Call it from a Supabase Edge Function**, same shape as the existing `_shared/aiClient.ts` pattern: configured by secrets, typed errors, no code change to swap host.
4. **Dashboard provenance** — every label the service produced shows the **model name and version**; `rating_heuristic_v1` stays as an explicitly labelled fallback when the service is unreachable, never silently substituted.
5. **Tests** — service-up path, service-down fallback path, provenance string.

### Hard rule
**Nothing — no slide, no README, no dissertation correction — may say the model is deployed until the path runs end to end and its test passes.** The 2 s cold start of a free Space is a real caveat to state.

**Done when:** a real label on the Sentiment page carries the model version, and pulling the service down falls back to the named rule without breaking the page.

---

## ITEM 5 — Housekeeping

| # | Item | Why | Effort |
|---|---|---|---|
| 5.1 | **Legacy `CHART_COLORS`** in `src/theme/chartTheme.js` — **6 of 7 values below 3:1**, imported by 10 files, with `positive` and `tiktok` both `#22c55e` | The semantic palette now passes; the legacy map beside it does not. Needs its own pre-registered task. | ~1 h |
| 5.2 | **Vitest pin** — `5.0.2` runs no tests on this machine; `5.1.1` runs 470/470 | A "can you run your tests?" question currently has an awkward answer | 10 min |
| 5.3 | **`--color-accent-500`** still `#22c55e` while `BRAND_COLOR` moved to `#22a45f` | Two things documented as mirrors now differ | 15 min |
| 5.4 | **Local Shop never persists to Supabase** — migration `0016` created `shops`, `shop_products`, `shop_expenses`, `shop_startup_items`, `shop_scenarios`, `shop_actions`, and **nothing in `src/` reads or writes any of them** | Six unused tables, and a pathway whose data vanishes when site data is cleared | ~half day |

5.2 and 5.3 are quick wins. 5.1 and 5.4 are real work — decide whether they're worth it **before** the viva or belong in future work.

---

## Order if you only have one day

1. Step 0 (0.3, 0.2, 0.4) — the demo must work. **Non-negotiable.**
2. Item 1 — timing. One row green, ~30 minutes.
3. Step A — hunt for the checkpoint. Everything else depends on it.
4. Item 2 — code-mixed, if the checkpoint turns up.
5. Items 5.2 and 5.3 — quick wins.

Items 3 and 4 are honest future work if time runs out — and the dissertation already lists both in Table 5.2.
