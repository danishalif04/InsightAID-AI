# INSIGHTAID AI: AIMIX: IID 2026 poster

A1 portrait (594 × 841 mm), one page.

```bash
# from the repo root; QRTOOL points at a folder with the `qrcode` npm package installed
QRTOOL=<path> node poster/build/build.mjs
```

| Output | What it is |
|---|---|
| `insightaid_poster.pdf` | Print-ready, text selectable, one page |
| `insightaid_poster_preview.png` | 2480 × 3508 preview |
| `index.html` | Generated page; edit `build/template.html` instead |

**Generated numbers:** every chart value, and the XLM-R headline figure, is read at build time from `ml/sentiment/results/O1_SCORECARD.md` and `ml/forecasting/results/protocol_summary_a8b3bb637d28.json`. Nothing is typed by hand.

**QR codes** come from `links.json`. An empty link renders a dashed "LINK PENDING" box, never a wrong QR code.

## Change log (v1 → v2, 21 Nov 2026)

- **Readability:** one type scale (title, section, sub, body, small, source), one radius and one spacing unit. v1 was only readable because it was scaled to 77%. v2 cuts content instead:
  - one screenshot per pathway,
  - the unsourced RM1,500–10,000+ price figure is removed,
  - the comment-story panel is removed,
  - the pricing strip is removed.
- **Visual noise:** glows, gradient pills and nested borders replaced by flat panels, a thin section rule and a single accent colour per element. No emoji headings.
- **01 Problem:** 4 statistics, large, each with its source, plus a strip of 4 gap icons.
- **02 Objectives:** three named contributions with one line each. Code-mixed text is kept in O1, as in the dissertation.
- **03 Pathways:** larger real screenshots and short bullets. "Market exploration" became "Product & pricing exploration", because the market/inflation page has no data loaded.
- **05 Results:**
  - evidence split into model evaluation, user acceptance and software testing, with tests labelled as code verification, not model accuracy;
  - larger charts, with MAPE bars that missed the target shaded differently and "met in 1 of 3 (weekly only)" stated;
  - a methodology box (dataset size, split, rolling-origin, metrics);
  - a findings and not-yet-evaluated box.
- **06 Comparison:** ✗ replaced by "—", with the footnote "typical capabilities by tool category; individual products vary", so it isn't a claim about specific competitors.
- **07 Tech & Responsible AI:** two labelled groups, plus the statement "AI explains the evidence. The system calculates the results."
- **08 Impact:** SDG 8, 9 and 10, each with one concrete connection. The horizontal timeline marks 2026 *done* and 2027/2028 *planned*.
- **09 Conclusion:** four takeaways, the call to action "Experience Smarter Business Decisions.", QR codes enlarged from 190 to 210 px, and the portrait in its own panel with the supervisor named.

## Fact-check list

| Claim on poster | Source | Status |
|---|---|---|
| XLM-R 84.12%; mBERT 82.48%; TF-IDF 74.34%; EN 78.28 / BM 86.88 / ZH 94.37 | `ml/sentiment/results/O1_SCORECARD.md` | Verified, read by build |
| MAPE 15.17 / 21.41 / 13.28; target met 1 of 3; 0 of 8 DM tests significant | `protocol_summary_a8b3bb637d28.json` | Verified, read by build |
| 107,171 comments; 85,639 / 10,763 / 10,769 split; no overlap | `docs/datasets/sentiment/DATASET_REPORT.md` | Verified |
| Olist, 470-day mature period | `ml/forecasting` protocol and dissertation | Verified |
| UAT 4.07 / 5, n = 15 | Dissertation and viva blueprint | Verified from project documents; **confirm n = 15** against the dissertation's UAT table |
| 565 unit tests passing | `npm test`, 21 Nov 2026 | Verified |
| ~90% Startup Genome 2025; 42% CB Insights 2025; 70% Statista 2025; 60% McKinsey 2022 | Author's proposal slide | **Needs review:** taken from the proposal as cited; full references not in the repo |
| Live dashboard uses a rating heuristic; code-mixed and crisis accuracy not evaluated | `results/post_submission_2026-11/`, viva blueprint | Verified, stated as limitations |
| Roadmap 2027/2028 | Planned, not committed | Labelled *planned* |
| All screenshots | Captured from the production build (usertest1 / usertest2 demo accounts) | Genuine |
| Video QR | `links.json` → `video`: https://youtu.be/c6Kktg031_E | Done; link checked as publicly reachable, 21 Nov 2026 |
| Live app QR | `links.json` → `app`: https://insightaid-ai.vercel.app | Done; site and deep links return 200 |

---

# SPARK 2026 poster

A1 portrait, one page. Built by the same script with an event switch; the AIMIX poster above is unchanged.

```bash
QRTOOL=<path> node poster/build/build.mjs spark
```

| Output | What it is |
|---|---|
| `insightaid_spark2026_poster.pdf` | Print-ready, one page |
| `insightaid_spark2026_poster_preview.png` | 2480 × 3508 preview |
| `spark2026.html` | Generated page; edit `build/template.spark.html` instead |

**Changes from AIMIX:** event header (SPARK 2026, Category B, 22 to 23 Dec 2026, UMK City Campus, Hybrid), solo entry, AIMIX Silver Award under Recognition, Encik Hafiz persona (labelled illustrative), Prep & Stock Planner with the waste replay, Business Model with the app's own proposed pricing, Try It QR to the no sign up demo, SDG 12 (responsible consumption) in place of SDG 10, "no" instead of dashes in the comparison table, "All rights reserved" in the footer.

## SPARK fact-check list

| Claim on poster | Source | Status |
|---|---|---|
| Waste RM 936.00 vs RM 495.95, 47.0% less; units short 458 vs 648; 28 days; 10% buffer | `metrics/spark2026.json` → `waste` (read by build; build refuses if not marked synthetic) | Simulation on synthetic data, labelled so on the poster |
| 4 of 5 pages under 3 s | `metrics/spark2026.json` → `o3.responseTime` (from `results/spark_2026-11-25/summary.txt`) | Read by build |
| XLM-R, MAPE, DM figures | Same sources as the AIMIX poster | Read by build |
| UAT 4.07 / 5, n = 15 | Dissertation (raw responses not in repo) | Typed in the template, as on the AIMIX poster. **Confirm n = 15.** Not shown in the app for this reason |
| AIMIX: IID 2026 Silver Award, Category B, 21 Nov 2026 | Certificate (owner confirmed 25 Nov 2026) | Verified by owner |
| Pricing Free / RM 49 / Contact us | `src/pages/Welcome.jsx` `PRICING_TIERS` | Labelled proposed; no billing exists |
| Planner screenshot | Production build, usertest1, "Sample: Koperasi Siswa Maju", 25 Nov 2026 | Genuine app screen |
| Encik Hafiz | Persona | Labelled illustrative |
| Industry statistics | Same as AIMIX | **Needs review**, as before |
| SPARK video QR | `links.json` → `spark_video` | **Empty, prints LINK PENDING.** Add the link after recording, then rebuild |
| Demo QR | `links.json` → `app` + `/welcome` | Works only once anonymous sign-in is enabled in Supabase |
