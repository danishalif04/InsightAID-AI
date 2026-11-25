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

# SPARK 2026 poster (v2, official ISPARK template)

A1 portrait, one page, built on the organiser's **ISPARK 2026 A1 template** (`ISPARK_2026_Poster_Template_A1_Editable.pptx`): organiser logo strip, event lines, navy title band, Sub-theme / Category / Project ID / Institution lines, then the template's ten sections in its order (Abstract, Value Added, product visual, Usefulness, Objectives, Impact, supporting visual, Recognition, Authors and Affiliations, Acknowledgement) and the navy footer. Built by the same script with an event switch; the AIMIX poster above is unchanged.

```bash
QRTOOL=<path> node poster/build/build.mjs spark
```

| Output | What it is |
|---|---|
| `insightaid_spark2026_poster.pdf` | Print-ready, one page |
| `insightaid_spark2026_poster_preview.png` | 2480 × 3508 preview |
| `spark2026.html` | Generated page; edit `build/template.spark.html` instead |

**Owner-filled values** live in `spark_meta.json` (Project ID, sub-theme, category, institution) and `links.json` (`spark_video`). An empty Project ID or video link prints an amber PENDING box, never a guess.

**Template deviations, on purpose:** event line corrected to the official poster's "22 to 23 December 2026 · UMK City Campus · Hybrid" (the template still says 27 to 28 October, Kota Bharu); the organiser logos are cropped from the official event poster because the template's copy is about 50 dpi at A1. Sponsor logos on the event poster are not used.

## SPARK fact-check list

| Claim on poster | Source | Status |
|---|---|---|
| Waste RM 951.75 vs RM 499.10, 47.6% less; units short 455 vs 648; 28 days; 10% buffer | `metrics/spark2026.json` → `waste` (read by build; build refuses if not marked synthetic) | Simulation on synthetic data, labelled so |
| 84.12%; EN 78.28 / BM 86.88 / ZH 94.37 | `ml/sentiment/results/O1_SCORECARD.md` | Read by build |
| 5 of 5 pages under 3 s | `metrics/spark2026.json` → `o3.responseTime` (`results/spark_2026-11-25_item7/`) | Read by build; first visit after a data change still waits for the AI |
| MAPE met 1 of 3; no significant sentiment gain | `protocol_summary_a8b3bb637d28.json` | Read by build |
| 10,769 held-out comments | `model_versions_v20261020-171546.json` (`test_samples`) | Verified |
| AIMIX: IID 2026 Silver Award, Category B, 21 Nov 2026 | Certificate (owner confirmed 25 Nov 2026) | Verified by owner |
| Pricing Free / RM 49 / multi-outlet | `src/pages/Welcome.jsx` `PRICING_TIERS` | Labelled proposed; no billing exists |
| Planner screenshot with the Karipap freshness flag | Production build, usertest1, "Sample: Koperasi Siswa Maju", 25 Nov 2026 | Genuine app screen, synthetic data |
| UAT 4.07 | Not on the v2 poster | Left out until n = 15 is confirmed |
| Industry statistics | Not on the v2 poster | Left out (still unverified) |
| Project ID | `spark_meta.json` | **PENDING** until registration |
| SPARK video QR | `links.json` → `spark_video` | **PENDING** until upload |
| Demo QR | `links.json` → `app` + `/welcome` | Works once anonymous sign-in succeeds (needs migration 0020) |
