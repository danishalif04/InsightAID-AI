# Replacement text for the 19 highlighted placeholders

Source for every figure: `docs/DISSERTATION_FACTS_REPORT.md` (repo HEAD `e65cdcc`, measured 2026-11-12).
Everything inside a blockquote is paste-ready. Where something cannot be filled, it says so and why —
nothing here is invented.

**Status: 8 ready to paste · 3 partial · 8 need your survey, your bills, or a re-run.**

| # | Placeholder | Status |
|---|---|---|
| 1 | Abstract — user acceptance sentence | Needs UAT |
| 2 | 3-D / decorative chart effects | **Ready** |
| 3 | Measured contrast ratios | **Ready** |
| 4 | Text size, animation, reduced motion | **Ready** |
| 5 | Tool and library versions | **Ready** (frontend); Python = floors only |
| 6 | Preliminary survey results | Needs real responses |
| 7 | UAT table | Needs real participants |
| 8 | Per-language sentiment table + kappa | **Ready** |
| 9 | Benchmark SQL confirmation | **Ready** — confirmed yes |
| 10 | Table 4.4 forecasting comparison | Partial — Option B ready |
| 11 | Sentiment-enhanced vs sales-only | **Ready** (minus the Fu & Fisher link) |
| 12 | Objective vs subjective agreement | Needs UAT |
| 13 | Summary evidence table | Partial |
| 14 | Share of firms selling online (DOSM) | You must verify |
| 15 | Cost per firm, fixed costs, break-even firms | Not measurable yet |
| 16 | Willingness-to-pay / pilot data | Needs survey item |
| 17 | MAPE + sentiment-enhanced finding, one sentence | **Ready** |
| 18 | UAT mean + whether 4.0 was met | Needs UAT |
| 19 | Objective vs subjective agreement, one sentence | Needs UAT |

---

## ⚠ READ FIRST — four unsupported sentences already in the dissertation

These are not placeholders. They are **assertions already written as fact**, and the repository contains
**no saved evidence for them.**

**Claim: "XGBoost most often achieved the lowest error / lowest MAPE."** It appears in four places:

| Where | Current wording |
|---|---|
| **Abstract** (p.4) | "…on public retail benchmarks, where XGBoost most often achieved the lowest error." |
| **§4.3.2** (p.45) | "The main finding is that XGBoost most often achieved the lowest MAPE among the five candidates…" |
| **§4.2 Discussions** (p.47) | "XGBoost most often gave the lowest MAPE, but not always, and the winner changed from series to series." |
| **§5.1 Conclusion** (p.56) | "…in which XGBoost most often had the lowest error but no model dominated." |

`ml/forecasting/results/` contains only an empty template and the Phase 4 Prophet file. There are **no
per-model, per-series results on disk**, so this claim cannot be evidenced if a panel asks to see the output.
It also sits directly above Table 4.4, whose every cell is still `[value]`, which makes the gap visible.

**Either** (a) re-run `ml/notebooks/04_train_forecasting_models.ipynb` and save the outputs, in which case the
sentence is fine; **or** (b) delete the claim from all four places. Replacement for (b):

> A rolling-origin comparison framework was implemented for six model families on identical windows.
> Complete saved results are available for the Prophet comparison reported in Table 4.4; results for the
> remaining families were not retained from the training run and are therefore not reported.

**Claim: "415 automated tests."** Appears in the **Abstract** (p.4), **§3.1** (p.29), **Table 4.9** (p.48)
and **§5.1** (p.56). The current count is **461 across 56 files** (`npx vitest run`, 2026-11-12). Update all four.

**Broken cross-references, worth fixing while you are in there:**

- §3.2.5 (p.39) points to "Section 4.3.6" — **that section does not exist.**
- §4.2 (p.47) points to "the honesty-by-design contract in Section 3.2.9" — **§3.2 ends at 3.2.5.**
- §4.3.3 (p.46) points to "the scenario runs in Section 4.3.5" — **does not exist.**
- §3.3 (p.40) says "Table 3.3 lists them" but the tools table is **Table 3.4**.
- Heading "4.1 4.3.1 Sentiment Model Performance" (p.44) has a **duplicated number**; §4.2 Discussions,
  §4.3 System Interface, §4.4 Commercialization and §4.5 Research Contribution should be **4.4–4.7**.
- Table numbering jumps 4.5 → 4.9 → 4.11; **4.6, 4.7, 4.8 and 4.10 do not exist.**

---

## 1. Abstract — user acceptance sentence

**CANNOT FILL — needs real UAT data.** Once you have it:

> In user acceptance testing with **[n]** participants, the system achieved an overall mean score of
> **[m]** out of 5.0 and a task completion rate of **[x]%**.

Use the exact Section 4.2 numbers. Do not write this sentence until the UAT is real. See also #18.

---

## 2. Table 3.3 — 3-D / decorative chart effects

**READY.** "No decorative effects" is not quite true, so here is the accurate version:

> Confirmed: no three-dimensional chart effects, perspective transforms or rotation are used anywhere in the
> interface. No pie or donut charts are used; a four-slice donut on the dashboard was removed during the
> chart review as a Cleveland–McGill ranking violation and replaced with a ranked bar chart. One radial
> chart remains (`RiskGauge`), used to display a single risk value rather than to compare categories.
> Linear gradient fills are used beneath two area charts (Dashboard and Forecasting) as vertical alpha
> fades; drop shadows and glow are applied to card containers, not to plot areas.

**Why worded this way:** gradients *do* exist inside chart areas (`src/pages/Dashboard.jsx:285-297`,
`src/pages/Forecasting.jsx:181`). Claiming "no decorative effects" outright is refutable in thirty seconds.
Declaring them costs nothing and is defensible.

---

## 3. Table 3.3 — measured contrast ratios

**READY.** Measured with the project's own tested `src/utils/contrastRatio.js` against the real design tokens.

> Contrast was measured programmatically against W3C (2023) level AA. All body text passes the 4.5:1
> threshold for normal text in both themes: dark-theme body text 16.60:1, muted 7.03:1, subtle 5.94:1;
> light-theme body text 16.59:1, muted 5.96:1, subtle 5.04:1. The brand accent reaches 8.00:1 on the dark
> surface. Chart gridlines (1.20:1 light, 1.38:1 dark) sit below the threshold but carry no information and
> are decorative. One genuine shortfall was identified: the light-theme chart green (`#22c55e` on white)
> measures 2.28:1, below the 3:1 required for meaningful non-text elements, and is recorded as a limitation
> rather than claimed as compliant.

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

**READY** (the "not yet tested with these users" clause stays true — keep it).

> Chart label text is set at 11–12 px and body text ranges from 10 px to 14 px, with 10–11 px reserved for
> provenance badges, axis ticks and footnotes. Animation uses Framer Motion 12.42.2 across eleven component
> files. A reduced-motion setting is implemented through two dedicated hooks (`useReducedMotion`,
> `useMotionAllowed`), which disable animation when either the operating system's `prefers-reduced-motion`
> setting is active or the in-app Low-Sensory accessibility mode is selected. These are design and
> implementation measures; they have not yet been tested with the target users.

**Flag:** 10 px is below the ~12 px minimum usually recommended. Reporting the true range is safer than
rounding it up, and the limitation defends easily as a deliberate hierarchy choice.

---

## 5. Section 3.3 — tool and library versions

**READY for the frontend. Python training versions are NOT available.**

> The frontend is built with React 19.2.7, Vite 8.1.3, React Router 7.18.1 and Tailwind CSS 4.3.2.
> Visualisation uses Recharts 3.9.2, animation uses Framer Motion 12.42.2 and icons use Lucide React 1.23.0.
> The backend client is Supabase JS 2.110.5. Testing uses Vitest 5.0.2 and Playwright 1.63.0, and report
> export uses jsPDF 4.2.1. The machine-learning packages declare minimum versions of pandas 2.0, NumPy 1.26,
> scikit-learn 1.4, SciPy 1.11, statsmodels 0.14, Prophet 1.1, XGBoost 2.0, PyTorch 2.2 and
> Transformers 4.40.

**Correction to my earlier report:** I had flagged "React 18" as needing fixing. Having read the actual
dissertation, **Table 3.4 already states React 19.2.7 correctly**, as well as Vite 8.1.3, Recharts 3.9.2,
Framer Motion 12.42.2 and the Groq provider. Every frontend version in Table 3.4 is **verified correct**
against the installed packages. The abstract says only "React, Vite and Supabase" with no version, which is
fine. **Nothing to change there.**

**On the Python versions:** `requirements.txt` declares *floors* (`>=`), not pins, and the models were trained
in Google Colab, whose exact versions were never recorded. State the floors as above, or re-open the Colab
notebook and run `pip freeze`. **Do not state this machine's local versions as the training versions** — they
differ (pandas 3.0.3 here).

---

## 6. Section 4.1 and Table 4.2 — preliminary survey

**CANNOT FILL — and something needs raising first.**

No Excel or survey PDF has arrived. And the Completion Guide states plainly that the workbook uploaded
earlier was byte-for-byte the synthetic practice file, generated by a random-number script and labelled
synthetic on every sheet. **If that is the same file, I will not write survey results from it** — reporting
those numbers as findings would be fabricated data, and it would collapse the moment a panel asks for the
Google Forms export.

- **If you now have real Google Forms responses** — send the export, or screenshots of the Forms summary
  (I can read counts and percentages off those). I will fill Table 4.2 and write the interpretation.
- **If the workbook still holds the synthetic rows** — it cannot be used.
- **If time is short** — a smaller real sample reported honestly is completely acceptable: *"n = 12,
  reported as a pilot; findings are indicative and not generalisable."* That is a defensible limitation.
  An invented n = 60 is not.

---

## 7. Section 4.2 and Table 4.3 — UAT

**CANNOT FILL — same position as #6.** The dimension means, SDs, target-met flags, task completion rate and
representative quotes can only come from real participants. A small real sample (8–12 testers) reported as a
pilot is defensible.

This also blocks **#1**, **#12**, **#18** and **#19**, which all read from these numbers.

---

## 8. Section 4.3.1 — per-language sentiment table and kappa

**READY IN FULL.** Source: `ml/sentiment/results/model_versions_v20261020-171546.json` and `O1_SCORECARD.md`.
Dataset `v20261012-ba90cb55d8f7`: 85,639 train / 10,763 validation / **10,769 test**.

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
- It is a **Wilson score interval**, not a bootstrap. A bootstrap needs per-example predictions, which were
  never exported from Colab. If asked, call it a Wilson interval.
- **Kappa: "not conducted."** The tool (`compute_kappa.py`) exists and is tested; only the human labelling is missing.

---

## 9. Section 4.3.1 — confirm the benchmark SQL was run

**READY — confirmed YES.** Query: `select * from public.model_versions` on project `jtyjfblzxvmryjmvuzds`.

**Six rows are live**, matching the saved JSON exactly (tfidf_lr / xlmr / mbert × original_language /
translate_to_english). The Model Performance page will render real values, not "Not yet evaluated". Safe to
screenshot.

---

## 10. Table 4.4 — rolling-origin forecasting comparison

**CANNOT FILL AS DRAWN.** Only one forecasting result was ever saved. There are **no saved MAE/RMSE/MAPE
values for moving average, ARIMA, XGBoost or LSTM**, and no per-series "best model" counts.

**Option A — re-run and fill the table.** Run `ml/notebooks/04_train_forecasting_models.ipynb` and save the
outputs. The comparison code exists; only the saved run is missing.

**Option B — replace Table 4.4 with what is actually measured.** Defensible right now:

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
> value is ~30%. The target was not met, and the dissertation must say so.** A missed target reported
> honestly is a normal, defensible research outcome. A target reported as met without evidence is not.

**Second, independent evidence for the same conclusion — from your own Figure 4.5.** The Sales Forecasting
screenshot already displays **MAE RM882, RMSE RM1390, MAPE 21.36%**, with the interface itself labelling it
**"target not met"**. The missed target is therefore *already visible* to any reader; writing the text as
though it were met would contradict your own screenshot on the facing page. Cite it directly:

> The in-app baseline forecast on the demonstration account produced MAE RM882, RMSE RM1390 and a MAPE of
> 21.36%, which the interface reports against the 15% target as not met (Figure 4.5). The offline Prophet
> comparison on `olist_total` likewise produced a MAPE near 30%. **Objective 2's accuracy target was
> therefore not met on the series evaluated**, and this is reported as measured.

---

## 11. Section 4.3.2 — sentiment-enhanced versus sales-only

**READY for the measurement. The Fu and Fisher (2023) link is yours to write.**

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
a comparison sentence. Add one yourself — *"This contrasts with / is consistent with Fu and Fisher (2023),
who reported …"* — once you have checked what they actually found. Do not let me guess it.

---

## 12. Section 4.4 — do objective and subjective evidence agree?

**CANNOT FILL — needs the UAT (#7).** Once you have both, use whichever matches. (Short one-sentence
versions are at #19.)

- **Both strong:** > The objective results (task completion of [x]%, 461 automated tests passing) and the subjective results (overall mean [m]) agree, which suggests the system is both correct and accepted.
- **Tasks fail, ratings high:** > Ratings were higher than task success would suggest, so some participants may have rated politely, and the tasks [list] need clearer design.
- **Ratings low, tasks succeed:** > Participants completed the tasks but rated [dimension] low, so the problem is presentation rather than computation.

---

## 13. Summary evidence table

**PARTIAL — and two things in your current draft need correcting.**

| Evidence | Status |
|---|---|
| 84.1% overall accuracy (XLM-R, n = 10,769); per-language 78.3% English, 86.9% Bahasa Melayu, 94.4% Mandarin; code-mixed not evaluated | Overall target met; per-language target met for all three evaluated languages |
| Rolling-origin methodology implemented. MAPE 30.04% (sales-only) and 29.75% (sentiment-enhanced) on `olist_total`; Diebold–Mariano p = 0.8618 | **Target not met** (MAPE ≥ 15%); sentiment enhancement **not supported** |
| **461** automated tests pass (56 files); ESLint clean; production build succeeds; 16 database migrations applied | Technical goals met; response time and UAT **not yet measured** |

1. **"415 tests pass" is out of date — it is now 461 across 56 files.** (`npx vitest run`, 2026-11-12.)
2. **"XGBoost most often best" is not supported by any saved evidence.** **Delete that claim** unless you
   re-run the notebook and can cite the output.

---

## 14. Section 4.6 — share of micro and small firms selling online / keeping digital records

**CANNOT FILL — and I will not supply a figure I cannot verify.**

I have no verifiable official statistic for this exact measure, and half-remembering one for a cited claim is
the worst possible failure mode in a dissertation. The Completion Guide reached the same conclusion
independently: DOSM publishes digital-tool adoption by establishment in its ICTEC release, but that is **not**
the same measure as "sells online".

**Recommended replacement** — use your own survey for the specific claim, DOSM only for the backdrop:

> Among surveyed businesses, **[x]%** reported keeping digital sales records and **[y]%** reported selling
> online (survey items A6 and A9). This is consistent with national statistics showing [general level of
> digital-tool adoption among establishments] (DOSM, 2025).

Verify the DOSM figure yourself on the release before citing it.

---

## 15. Section 4.6 — cost per firm, fixed monthly costs, break-even number of firms

**CANNOT FILL — the inputs do not exist yet.**

- **Cost per firm per month:** not computable. I searched the Edge Functions for token accounting
  (`grep -rn "usage\|total_tokens\|prompt_tokens" supabase/functions/`) and found **none** — the provider's
  `usage` block is never read or stored, so there is no record of tokens per recommendation or per assistant
  question to average.
- **Published per-token price:** held in a Supabase secret whose value is returned as a SHA-256 digest, so
  the live model and endpoint cannot be read back from the project. Confirm it in the Supabase dashboard and
  read the price from the provider's current pricing page. **Do not quote a price from memory.**
- **Fixed monthly costs:** only you have the hosting and AI bills.
- **Break-even number of firms:** follows arithmetically once the two above are real.

**Structure to fill once you have the numbers:**

> The variable cost of serving one business is estimated at **RM[c]** per month, derived from an average of
> **[t]** tokens per AI-assisted recommendation at the provider's published rate of **[r]** per million
> tokens, with **[k]** recommendations per business per month. Fixed monthly costs — hosting, database and
> domain — total **RM[F]**. At a subscription price of **RM[p]** per business per month, the contribution
> margin per business is **RM[p − c]**, giving a break-even point of **[F / (p − c)]** paying businesses.

**Honest alternative if you never gather the bills** — state the structure without inventing values:

> A full unit-cost analysis was not conducted. The architecture was deliberately built on free-tier services
> (Supabase, Vercel and a free-tier LLM endpoint), so the fixed monthly cost during development was zero, and
> the marginal cost per business is bounded by the provider's published per-token rate. Per-call token usage
> is not currently logged, so a measured cost per business and the resulting break-even point are reported as
> future work rather than estimated.

**To make this measurable:** about five lines in `supabase/functions/_shared/aiClient.ts` to persist
`{prompt_tokens, completion_tokens, model}` per call. After a week of demo use you would have a real average.
Say the word and I will implement it.

---

## 16. Section 4.6 — willingness to pay / pilot data

**CANNOT FILL — no willingness-to-pay item exists in any survey data on disk**, and no pilot deployment has
run with real businesses. Writing a price point here would be inventing market evidence.

**If your survey does contain a price question**, send it and the sentence becomes:

> Of the **[n]** businesses surveyed, **[x]%** indicated they would pay for a tool of this kind, with
> **[y]%** selecting a price band of **RM[a]–RM[b]** per month. The modal response was **RM[m]**.

**If it does not** — this is the honest version, and it is perfectly normal for an FYP:

> Willingness-to-pay data were not collected in this study, and no pilot deployment with paying businesses
> was conducted. The commercialisation discussion is therefore presented as a costing structure and a
> proposed go-to-market route rather than as validated demand. Establishing a realistic price point through a
> paid pilot is identified as future work.

**Cheap way to get it, if there is still time:** add one question to the survey you are already running —
*"If this tool were available, what would you pay per month? (RM0 / RM1–20 / RM21–50 / RM51–100 / above
RM100)"*. Even n = 12 gives you a real, citable sentence instead of a blank.

---

## 17. Conclusion — MAPE result and the sentiment-enhanced versus sales-only finding, in one sentence

**READY.** Pick one — all three say the same measured thing at different lengths.

**Shortest:**

> Forecasting accuracy did not meet its target: MAPE was 30.04% for the sales-only model and 29.75% with
> sentiment regressors, against a target of below 15%, and a Diebold–Mariano test (p = 0.8618) found the
> difference between them statistically insignificant.

**Fuller, for a conclusion section:**

> The second objective was only partially achieved: a rolling-origin evaluation framework and a sentiment
> regressor pipeline were successfully implemented, but on the `olist_total` series the sales-only model
> recorded a MAPE of 30.04% and the sentiment-enhanced model 29.75%, both well above the 15% acceptance
> target, and a Diebold–Mariano test on sixty paired forecast errors returned p = 0.8618, meaning the
> hypothesis that review sentiment improves sales forecasting was **not supported** on the data evaluated.

**If you also want Figure 4.5 in the same sentence:**

> Forecasting fell short of its accuracy target on both the in-app baseline (MAPE 21.36%, reported by the
> interface itself as not met) and the offline Prophet comparison (MAPE 30.04% sales-only against 29.75%
> sentiment-enhanced), and with a Diebold–Mariano p-value of 0.8618 the sentiment enhancement could not be
> shown to help.

**Do not soften this into "showed a slight improvement".** The improvement is 0.29 percentage points with
p = 0.86 — that is noise, and MAE and RMSE actually got marginally *worse*. A supervisor who reads the
p-value will spot the softening immediately, and an honestly reported negative result is a legitimate
contribution: it is exactly what the falsifiability rule in your own methodology commits you to.

---

## 18. Conclusion — user acceptance result: overall mean and whether the 4.0 target was met

**CANNOT FILL — needs the UAT (#7).** No UAT responses exist on disk. Once you have them, use the branch that
matches what you actually measure:

**If the target is met:**

> User acceptance testing with **[n]** participants produced an overall mean satisfaction score of **[m]** out
> of 5.0 (SD **[s]**), meeting the acceptance target of 4.0 set for the third objective.

**If the target is missed:**

> User acceptance testing with **[n]** participants produced an overall mean satisfaction score of **[m]** out
> of 5.0 (SD **[s]**), below the 4.0 target set for the third objective. The lowest-rated dimension was
> **[dimension]** at **[x]**, which is reported as a limitation and directs the next iteration of the
> interface.

**If you can only run a very small sample:**

> A pilot acceptance test with **[n]** participants produced an overall mean of **[m]** out of 5.0. Given the
> sample size, this is reported as indicative rather than as a statistically generalisable result, and the
> 4.0 target is therefore treated as not yet formally evaluated.

**Do not report a mean without n and SD**, and do not write the number before the sessions happen.

---

## 19. Conclusion — whether objective and subjective evidence agreed, in one sentence

**CANNOT FILL — needs #17's objective results alongside #18's UAT.** The objective half is already settled
(sentiment target met, forecasting target not met, 461 tests passing); only the subjective half is missing.

Once you have the UAT, pick the branch that is true:

**They agree, both positive:**

> Objective and subjective evidence agreed: the components that measured well — multilingual sentiment at
> 84.12% accuracy and a fully tested, honesty-constrained interface — were also the ones participants rated
> highest, with an overall mean of **[m]** out of 5.0.

**They agree, both mixed:**

> Objective and subjective evidence agreed in both directions: participants rated the sentiment and dashboard
> features highly (**[m]** out of 5.0) while rating the forecasting feature lowest, mirroring the measured
> result that forecasting was the one objective whose accuracy target was not met.

**They disagree — ratings higher than the measurements warrant:**

> Objective and subjective evidence did not fully agree: participants rated the system **[m]** out of 5.0
> despite forecasting accuracy falling short of its target, suggesting that the system's transparency about
> its own limitations was valued independently of predictive accuracy.

**They disagree — ratings lower than the measurements warrant:**

> Objective and subjective evidence diverged: measured component performance met most targets, but
> participants rated **[dimension]** at **[x]**, indicating that the shortfall lies in presentation and
> interaction rather than in the underlying computation.

**The second and third branches are the likely ones** given that forecasting missed its target. The third is
genuinely interesting and worth leaning into if it is what you observe — "users valued honest uncertainty
over accuracy" is a real finding that fits your honesty-by-design contribution.

---

## What to do next

| Priority | Item | Owner |
|---|---|---|
| 1 | Remove or evidence the **"XGBoost most often best"** claim in **all four places** (see top) | You — highest integrity risk |
| 2 | Correct **MAPE target not met** (#10, #17) and **O2 not supported** (#11) | You — these change the claims |
| 3 | Update **415 → 461 tests** in all four places (#13) | Paste from above |
| 4 | Paste #2, #3, #4, #5, #8, #9, #11, #17 | Ready now |
| 5 | Fix the six broken cross-references and the section/table numbering | You |
| 6 | Collect **real** survey + UAT responses (#1, #6, #7, #12, #18, #19) | You |
| 7 | Add one willingness-to-pay question to the survey (#16) | You — cheap, high value |
| 8 | Decide: re-run notebook 04, or adopt Option B for Table 4.4 (#10) | You |
| 9 | Verify the DOSM figure yourself (#14); gather bills (#15) | You |

---

## What the dissertation's own screenshots already confirm

- **Figure 4.8** shows the Local Shop dashboard live with **Kedai Makmur, 28 registered products, RM2,500
  monthly fixed costs, 35.06% average contribution margin, RM7,131 monthly break-even sales, 69% readiness**,
  with the Illustrative badge and the locked capabilities visible. That matches the engine's computed values,
  so §4.3's Local Shop figures are sound.
- **Figure 4.9** shows the agent investigation working end to end — the seven-step trace, the
  `calculate_break_even` tool chip, the "Assumption: equal sales mix" disclosure, and Accept/Reject. Your
  description of a "controlled three-tool agent" in Table D.1 and §4.5 is accurate.
- **Figure 4.5** gives the MAPE evidence used in #10 and #17.

One tiny inconsistency, not worth fixing unless you want to: Figure 4.8 shows break-even **RM7,131** while
Figure 4.9's answer says **RM7,133.70**. Both come from the same formula at different display rounding. If a
panel notices, the honest answer is exactly that.
