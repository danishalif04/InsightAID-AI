# Replacement text for the 15 highlighted placeholders

Source for every figure: `docs/DISSERTATION_FACTS_REPORT.md` (repo HEAD `e65cdcc`, measured 2026-11-12).
Paste-ready text is in blockquotes. Where something cannot be filled, it says so and why — nothing is invented.

**Status: 6 fillable now · 3 partially · 6 need your survey, your bills, or a re-run.**

---

## ⚠ READ FIRST — four unsupported sentences already in the dissertation

These are not placeholders. They are **assertions already written as fact**, and the repository contains
**no saved evidence for them.** Having now read the dissertation itself, I can give exact locations.

**Claim: "XGBoost most often achieved the lowest error / lowest MAPE."** It appears in four places:

| Where | Current wording |
|---|---|
| **Abstract** (p.4) | "…on public retail benchmarks, where XGBoost most often achieved the lowest error." |
| **§4.3.2** (p.45) | "The main finding is that XGBoost most often achieved the lowest MAPE among the five candidates…" |
| **§4.2 Discussions** (p.47) | "XGBoost most often gave the lowest MAPE, but not always, and the winner changed from series to series." |
| **§5.1 Conclusion** (p.56) | "…in which XGBoost most often had the lowest error but no model dominated." |

`ml/forecasting/results/` contains only an empty template and the Phase 4 Prophet file. There are **no
per-model, per-series results on disk**, so this claim cannot be evidenced if a panel asks to see the output.
It also sits directly above Table 4.4, whose every cell is still `[value]` — which makes the gap visible.

**You must either** (a) re-run `ml/notebooks/04_train_forecasting_models.ipynb`, save the outputs, and then
the sentence is fine; **or** (b) delete the claim from all four places. There is no third option that is
honest. Suggested replacement for (b):

> A rolling-origin comparison framework was implemented for six model families on identical windows.
> Complete saved results are available for the Prophet comparison reported in Table 4.4; results for the
> remaining families were not retained from the training run and are therefore not reported.

**Claim: "415 automated tests."** Appears in the **Abstract** (p.4), **§3.1** (p.29), **Table 4.9** (p.48)
and **§5.1** (p.56). The current count is **461 across 56 files** (`npx vitest run`, 2026-11-12). Update all four.

**Also worth fixing while you are in there — broken cross-references:**

- §3.2.5 (p.39) points to "Section 4.3.6" for the visual review — **that section does not exist.**
- §4.2 (p.47) points to "the honesty-by-design contract in Section 3.2.9" — **§3.2 ends at 3.2.5.**
- §4.3.3 (p.46) points to "the scenario runs in Section 4.3.5" — **does not exist.** (The S1–S5 runs are in
  my facts report; if you add them, create that section.)
- §3.3 (p.40) says "Table 3.3 lists them" but the tools table is **Table 3.4**.
- Heading "4.1 4.3.1 Sentiment Model Performance" (p.44) has a **duplicated number**; §4.2 Discussions,
  §4.3 System Interface, §4.4 Commercialization and §4.5 Research Contribution should be **4.4–4.7**.
- Table numbering jumps 4.5 → 4.9 → 4.11; **4.6, 4.7, 4.8 and 4.10 do not exist.**

---

## 1. Abstract — user acceptance sentence

**CANNOT FILL — needs real UAT data.**

Once you have it, the sentence is:

> In user acceptance testing with **[n]** participants, the system achieved an overall mean score of
> **[m]** out of 5.0 and a task completion rate of **[x]%**.

Use the exact Section 4.2 numbers. Do not write this sentence until the UAT is real.

---

## 2. Table 3.3 — 3-D / decorative chart effects

**FILLABLE.** But "no decorative effects" is not quite true, so here is the accurate version:

> Confirmed: no three-dimensional chart effects, perspective transforms or rotation are used anywhere in the
> interface. No pie or donut charts are used; a four-slice donut on the dashboard was removed during the
> chart review as a Cleveland–McGill ranking violation and replaced with a ranked bar chart. One radial
> chart remains (`RiskGauge`), used to display a single risk value rather than to compare categories.
> Linear gradient fills are used beneath two area charts (Dashboard and Forecasting) as vertical alpha
> fades; drop shadows and glow are applied to card containers, not to plot areas.

**Why worded this way:** gradients *do* exist inside chart areas (`src/pages/Dashboard.jsx:285-297`,
`src/pages/Forecasting.jsx:181`). Claiming "no decorative effects" outright is refutable in thirty seconds by
anyone who opens the file. Declaring them costs nothing and is defensible.

---

## 3. Table 3.3 — measured contrast ratios

**FILLABLE.** Measured with the project's own tested `src/utils/contrastRatio.js` against the real design tokens.

> Contrast was measured programmatically against W3C (2023) level AA. All body text passes the 4.5:1
> threshold for normal text in both themes: dark-theme body text 16.60:1, muted 7.03:1, subtle 5.94:1;
> light-theme body text 16.59:1, muted 5.96:1, subtle 5.04:1. The brand accent reaches 8.00:1 on the dark
> surface. Chart gridlines (1.20:1 light, 1.38:1 dark) sit below the threshold but carry no information and
> are decorative. One genuine shortfall was identified: the light-theme chart green (`#22c55e` on white)
> measures 2.28:1, below the 3:1 required for meaningful non-text elements, and is recorded as a limitation
> rather than claimed as compliant.

Optional table if you want one:

| Element | Ratio | AA (4.5:1 text / 3:1 non-text) |
|---|---|---|
| Body text (dark) | 16.60:1 | Pass |
| Body text (light) | 16.59:1 | Pass |
| Muted text (dark) | 7.03:1 | Pass |
| Muted text (light) | 5.96:1 | Pass |
| Subtle text (dark) | 5.94:1 | Pass |
| Subtle text (light) | 5.04:1 | Pass |
| Brand accent (dark) | 8.00:1 | Pass |
| Chart green (light) | 2.28:1 | **Fail — disclosed** |
| Gridlines | 1.20–1.38:1 | Decorative, not informational |

**Do not claim blanket AA for charts.** Claim it for text and disclose the green.

---

## 4. Table 3.3 — text size, animation, reduced motion

**FILLABLE** (the "not yet tested with these users" clause stays true — keep it).

> Chart label text is set at 11–12 px and body text ranges from 10 px to 14 px, with 10–11 px reserved for
> provenance badges, axis ticks and footnotes. Animation uses Framer Motion 12.42.2 across eleven component
> files. A reduced-motion setting is implemented through two dedicated hooks (`useReducedMotion`,
> `useMotionAllowed`), which disable animation when either the operating system's `prefers-reduced-motion`
> setting is active or the in-app Low-Sensory accessibility mode is selected. These are design and
> implementation measures; they have not yet been tested with the target users.

**Flag:** 10 px is below the ~12 px minimum usually recommended. Reporting the true range is safer than
rounding it up, and the limitation is easy to defend as a deliberate hierarchy choice.

---

## 5. Section 3.3 — tool and library versions

**FILLABLE for the frontend. Python training versions are NOT available.**

> The frontend is built with React 19.2.7, Vite 8.1.3, React Router 7.18.1 and Tailwind CSS 4.3.2.
> Visualisation uses Recharts 3.9.2, animation uses Framer Motion 12.42.2 and icons use Lucide React 1.23.0.
> The backend client is Supabase JS 2.110.5. Testing uses Vitest 5.0.2 and Playwright 1.63.0, and report
> export uses jsPDF 4.2.1. The machine-learning packages declare minimum versions of pandas 2.0, NumPy 1.26,
> scikit-learn 1.4, SciPy 1.11, statsmodels 0.14, Prophet 1.1, XGBoost 2.0, PyTorch 2.2 and
> Transformers 4.40.

> **Correction to my earlier report:** I had flagged "React 18" as needing fixing. Having now read the
> actual dissertation, **Table 3.4 already states React 19.2.7 correctly**, as well as Vite 8.1.3, Recharts
> 3.9.2, Framer Motion 12.42.2 and the Groq provider. Every frontend version in Table 3.4 is **verified
> correct** against the installed packages. The abstract says only "React, Vite and Supabase" with no
> version, which is fine. **Nothing to change there** — this placeholder only needs the Python versions below
> and the confirmation that Table 3.4 is accurate, which it is.

**On the Python versions:** `requirements.txt` declares *floors* (`>=`), not pins, and the models were trained
in Google Colab, whose exact versions were never recorded. State the floors as above, or re-open the Colab
notebook and run `pip freeze` to capture the real training versions. **Do not state this machine's local
versions as the training versions** — they are different (e.g. pandas 3.0.3 here).

---

## 6. Section 4.1 and Table 4.2 — Preliminary Survey

**CANNOT FILL — and I need to raise something before you send anything.**

**First: no Excel or PDF arrived with this message.** Only `InsightAid_Completion_Guide.pdf` was attached
earlier. Nothing else came through.

**Second, and more important:** that guide states plainly that the workbook you previously uploaded was
byte-for-byte the synthetic practice file, generated by a random-number script and labelled synthetic on
every sheet. **If that is the same file, I will not write survey results from it**, and neither should
anyone else — reporting those numbers as findings would be fabricated data, which is research misconduct and
would collapse the moment a panel asks to see the Google Forms export.

So, to be concrete about what I need:

- **If you now have real Google Forms responses** — send the export (or screenshots of the Forms summary).
  I will fill Table 4.2 and write the interpretation paragraphs from them.
- **If the workbook still holds the synthetic rows** — it cannot be used. Collect real responses, even a
  small number.
- **If time is short** — a smaller real sample reported honestly is completely acceptable: *"n = 12,
  reported as a pilot; findings are indicative and not generalisable."* That is a defensible limitation.
  An invented n = 60 is not.

Screenshots of the Google Forms response summary are fine — I can read percentages and counts off those.

---

## 7. Section 4.2 and Table 4.3 — UAT

**CANNOT FILL — same position as #6.** The dimension means, SDs, target-met flags, task completion rate and
representative quotes can only come from real participants.

The same fallback applies: a small real sample (even 8–12 testers) reported as a pilot is defensible.

This also blocks **#1** (abstract sentence) and **#12** (objective vs subjective agreement), since both read
from these numbers.

---

## 8. Section 4.3.1 — per-language sentiment table and kappa

**FILLABLE IN FULL.** Source: `ml/sentiment/results/model_versions_v20261020-171546.json` and
`O1_SCORECARD.md`. Dataset `v20261012-ba90cb55d8f7`: 85,639 train / 10,763 validation / **10,769 test**.

**Table 4.3: XLM-RoBERTa per-language performance (original-language path)**

| Language | Test n | Accuracy | F1 | ≥ 75%? |
|---|---|---|---|---|
| English | 5,549 | 78.28% | 0.7797 | Yes |
| Bahasa Melayu | 2,820 | 86.88% | 0.7168 | Yes |
| Mandarin | 2,400 | 94.37% | 0.6292 | Yes |
| Code-mixed | 0 | — | — | **Not evaluated** |
| **Overall** | **10,769** | **84.12%** | **0.8066** | **Yes** |

Model comparison (overall, original-language): XLM-R 84.12% / F1 0.8066 · mBERT 82.48% / 0.7906 ·
TF-IDF+LR 74.34% / 0.7273. Every translate-to-English path scored lower (64.56%–71.88%).

> The O1 acceptance target — at least 80% overall accuracy and at least 75% for each language — was met by
> XLM-RoBERTa, which achieved 84.12% overall (macro F1 0.8066) on a held-out test set of 10,769 examples,
> with 78.28% for English, 86.88% for Bahasa Melayu and 94.37% for Mandarin. A 95% Wilson score confidence
> interval for the overall accuracy is 83.42% to 84.80%, entirely above the 80% threshold. mBERT also met the
> target at 82.48%, and TF-IDF with logistic regression did not, at 74.34%. Translating text to English before
> classification reduced accuracy for every model, confirming that native multilingual representation suits
> this code-mixed setting better.
>
> Two limitations are recorded. First, no example in the labelled dataset is tagged as code-mixed, so a
> code-mixed accuracy figure cannot be reported, even though the deployed language detector identifies
> code-mixed text at inference time. Second, **inter-annotator agreement was not conducted**: the
> second-annotator column in the annotation sample remains unlabelled, so no Cohen's kappa is reported.

**Two method points to state, not bury:**
- It is a **Wilson score interval**, not a bootstrap. A true bootstrap needs per-example predictions, which
  were never exported from Colab. If asked, call it a Wilson interval.
- **Kappa: "not conducted."** The tool (`compute_kappa.py`) exists and is tested; only the human labelling is missing.

---

## 9. Section 4.3.1 — confirm the benchmark SQL was run

**FILLABLE — confirmed YES.** Query: `select * from public.model_versions` on project `jtyjfblzxvmryjmvuzds`.

**Six rows are live**, matching the saved JSON exactly (tfidf_lr / xlmr / mbert × original_language /
translate_to_english). The Model Performance page will render real values, not "Not yet evaluated". Safe to
screenshot.

---

## 10. Table 4.4 — rolling-origin forecasting comparison

**CANNOT FILL AS DRAWN.** Only one forecasting result was ever saved to the repository. There are **no saved
MAE/RMSE/MAPE values for moving average, ARIMA, XGBoost or LSTM**, and no per-series "best model" counts.
`ml/forecasting/results/` contains only an empty template plus the Phase 4 file.

You have two honest options.

**Option A — re-run and fill the table.** Run `ml/notebooks/04_train_forecasting_models.ipynb` and save the
outputs. The comparison code exists; only the saved run is missing.

**Option B — replace Table 4.4 with what is actually measured.** This is defensible now:

**Table 4.4: Prophet rolling-origin comparison on `olist_total` (2 folds, 60 test points)**

| Model | MAE | RMSE | MAPE (%) | MASE |
|---|---|---|---|---|
| Prophet (sales only) | 6701.60 | 8061.42 | 30.04 | 1.1707 |
| Prophet (with review sentiment) | 6703.01 | 8090.79 | 29.75 | 1.1709 |

> The forecasting comparison framework was implemented for six model families and evaluated using
> rolling-origin cross-validation. Complete saved results are available for the Prophet comparison on the
> `olist_total` series across two folds and sixty test points. The sales-only variant achieved a MAPE of
> 30.04% and the sentiment-enhanced variant 29.75%. **Both are substantially above the project's acceptance
> target of below 15%, so the forecasting accuracy target was not met on this series.** Results for the
> remaining model families were not retained from the training run and are therefore not reported.

> **This is the most consequential correction in this document. Your target was MAPE < 15%; the measured
> value is ~30%. The target was not met, and the dissertation must say so.** A missed target that is reported
> honestly is a normal, defensible research outcome. A target reported as met without evidence is not.

**Second, independent piece of evidence for the same conclusion — from your own Figure 4.5.** The Sales
Forecasting screenshot already displays **MAE RM882, RMSE RM1390, MAPE 21.36%**, with the interface itself
labelling it **"target not met"**. That is the in-app moving-average baseline on the demonstration account.

This is useful to you: the figure is already in the dissertation, so the missed target is *already visible*
to any reader. Writing the text as though the target were met would contradict your own screenshot on the
facing page. You can cite it directly:

> The in-app baseline forecast on the demonstration account produced MAE RM882, RMSE RM1390 and a MAPE of
> 21.36%, which the interface reports against the 15% target as not met (Figure 4.5). The offline Prophet
> comparison on `olist_total` likewise produced a MAPE near 30%. **Objective 2's accuracy target was
> therefore not met on the series evaluated**, and this is reported as measured.

---

## 11. Section 4.3.2 — sentiment-enhanced versus sales-only

**FILLABLE for the measurement. The Fu and Fisher (2023) link is yours to write.**

> The sentiment-enhanced Prophet variant achieved a MAPE of 29.75% against 30.04% for the sales-only
> variant, an absolute improvement of 0.29 percentage points, while MAE and RMSE were marginally worse
> (6703.01 against 6701.60, and 8090.79 against 8061.42). A Diebold–Mariano test on sixty paired forecast
> errors returned a test statistic of −0.1749 with a p-value of 0.8618, so **the difference is not
> statistically significant at the 0.05 level and no claim can be made that either variant outperforms the
> other.** A cross-correlation analysis between daily sentiment and revenue at lags of zero to twenty-one
> days found no meaningful relationship, with the strongest absolute correlation reaching only 0.158.
> On this evidence, the central hypothesis that adding review sentiment improves sales forecasting is **not
> supported** for this series.

**On Fu and Fisher (2023):** I cannot verify what that paper claims without the source, so I have not written
a comparison sentence. Add one yourself along the lines of *"This contrasts with / is consistent with Fu and
Fisher (2023), who reported …"*, once you have checked what they actually found. Do not let me guess it.

---

## 12. Section 4.4 — do objective and subjective evidence agree?

**CANNOT FILL — needs the UAT (#7).**

Once you have both, use whichever matches:

- **Both strong:** > The objective results (task completion of [x]%, 461 automated tests passing) and the subjective results (overall mean [m]) agree, which suggests the system is both correct and accepted.
- **Tasks fail, ratings high:** > Ratings were higher than task success would suggest, so some participants may have rated politely, and the tasks [list] need clearer design.
- **Ratings low, tasks succeed:** > Participants completed the tasks but rated [dimension] low, so the problem is presentation rather than computation.

---

## 13. Summary evidence table

**PARTIALLY FILLABLE — and two things in your current draft need correcting.**

| Evidence | Status |
|---|---|
| 84.1% overall accuracy (XLM-R, n = 10,769); per-language 78.3% English, 86.9% Bahasa Melayu, 94.4% Mandarin; code-mixed not evaluated | Overall target met; per-language target met for all three evaluated languages |
| Rolling-origin methodology implemented. MAPE 30.04% (sales-only) and 29.75% (sentiment-enhanced) on `olist_total`; Diebold–Mariano p = 0.8618 | **Target not met** (MAPE ≥ 15%); sentiment enhancement **not supported** |
| **461** automated tests pass (56 files); ESLint clean; production build succeeds; 16 database migrations applied | Technical goals met; response time and UAT **not yet measured** |

**Two corrections to your draft:**

1. **"415 tests pass" is out of date — it is now 461 across 56 files.** (`npx vitest run`, 2026-11-12.)
2. **"XGBoost most often best" is not supported by any saved evidence.** No per-model, per-series results
   exist in the repository. **Delete that claim** unless you re-run the notebook and can cite the output.
   This is exactly the kind of sentence a panel asks to see the file for.

---

## 14. Section 4.6 — share of micro and small firms selling online / keeping digital records

**CANNOT FILL — and I will not supply a figure I cannot verify.**

I have no verifiable official statistic for this exact measure, and inventing or half-remembering one for a
cited claim is the worst possible failure mode in a dissertation. The Completion Guide reached the same
conclusion independently: DOSM publishes digital-tool adoption by establishment in its ICTEC release, but
that is **not** the same measure as "sells online".

**Recommended replacement:** use your own survey for the specific claim and cite DOSM only for the general
backdrop:

> Among surveyed businesses, **[x]%** reported keeping digital sales records and **[y]%** reported selling
> online (survey items A6 and A9). This is consistent with national statistics showing [general level of
> digital-tool adoption among establishments] (DOSM, 2025).

Verify the DOSM figure yourself on the release before citing it — do not take a number from me for this.

---

## 15. Section 4.6 — cost per firm, fixed costs, break-even firms

**CANNOT FILL — the inputs do not exist yet.**

- **Cost per firm per month:** not computable. I searched the Edge Functions for token accounting
  (`grep -rn "usage\|total_tokens\|prompt_tokens" supabase/functions/`) and found **none** — the provider's
  `usage` block is never read or stored, so there is no record of tokens per recommendation or per assistant
  question to average.
- **Published per-token price:** held in a Supabase secret whose value is returned as a SHA-256 digest, so
  the live model and endpoint cannot be read back from the project. Confirm in the Supabase dashboard and
  read the price from the provider's current pricing page. **Do not quote a price from memory.**
- **Fixed monthly costs:** only you have the hosting and AI bills.
- **Break-even number of firms:** follows arithmetically once the two figures above are real.

**To make this measurable:** add about five lines to `supabase/functions/_shared/aiClient.ts` to persist
`{prompt_tokens, completion_tokens, model}` per call. After a week of demo use you would have a real average
instead of an assumption. Say the word and I will implement it.

---

## What to do next

| Priority | Item | Owner |
|---|---|---|
| 1 | Remove or evidence the **"XGBoost most often best"** claim in **all four places** (see top section) | You — highest integrity risk |
| 2 | Correct **MAPE target not met** (#10) and **O2 not supported** (#11) | You — these change the claims |
| 3 | Update **415 → 461 tests** in all four places (#13) | Paste from above |
| 4 | Paste #2, #3, #4, #8, #9 | Ready now |
| 5 | Fix the six broken cross-references and the section/table numbering (see top section) | You |
| 6 | Collect **real** survey + UAT responses (#1, #6, #7, #12) | You |
| 7 | Decide: re-run notebook 04, or adopt Option B for Table 4.4 (#10) | You |
| 8 | Verify the DOSM figure yourself (#14); gather bills (#15) | You |

---

## What the dissertation's own screenshots already confirm

Reading the PDF let me verify three things I could not check from the code alone:

- **Figure 4.8** shows the Local Shop dashboard live with **Kedai Makmur, 28 registered products, RM2,500
  monthly fixed costs, 35.06% average contribution margin, RM7,131 monthly break-even sales, 69% readiness**,
  with the Illustrative badge and the locked capabilities visible. That matches the engine's computed values,
  so §4.3's Local Shop figures are sound.
- **Figure 4.9** shows the agent investigation working end to end — the seven-step trace, the
  `calculate_break_even` tool chip, the "Assumption: equal sales mix" disclosure, and Accept/Reject. Your
  description of a "controlled three-tool agent" in Table D.1 and §4.5 is accurate.
- **Figure 4.5** gives the MAPE evidence noted in #10 above.

One tiny inconsistency, not worth fixing unless you want to: Figure 4.8 shows break-even **RM7,131** while
Figure 4.9's answer says **RM7,133.70**. Both come from the same formula at different display rounding. If a
panel notices, the honest answer is exactly that.
