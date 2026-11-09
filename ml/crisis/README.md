# InsightAid AI — Crisis Detection Ablation (FYP II Phase 5)

Compares the production crisis detector ("Scheme A") against the FYP II master prompt's originally-specified design ("Scheme B") on identical injected scenarios, per the user's explicit decision to build and compare both rather than pick one and discard the other (see `docs/AUDIT.md` Section 3).

## What's here

```
ml/crisis/
  src/
    scheme_a_port.py     a pure-Python PORT of src/utils/crisisDetection.js, for
                          evaluation only — the live app keeps using the JS version
    scheme_b.py           Part A3's design: negative-share > 60% + rising, then a
                           secondary scikit-learn classifier to suppress false alarms
    injector.py            builds synthetic crisis scenarios with a KNOWN injection
                            point, including the master prompt's own named multilingual-
                            cascade scenario (Malay TikTok -> Mandarin Shopee -> English X),
                            and "ordinary volume spike" negative controls
    evaluate_ablation.py   runs both schemes on identical injected cases, writes
                            results/ABLATION_RESULTS.md
  tests/                   pytest — 20/20 passing
  results/                 generated output (ABLATION_RESULTS.md, ablation_raw.json)
```

## Running it

```bash
cd insightaid-ai   # repo root
python -m pytest ml/crisis/tests -v
python -m ml.crisis.src.evaluate_ablation
```

## Headline finding

Neither scheme is simply "better" — see `results/ABLATION_RESULTS.md` for the full numbers. Scheme A (lower, 30%/50% thresholds) catches an injected crisis earlier but false-alarms on pure volume spikes 100% of the time in this evaluation (its volume-based signals don't check sentiment direction at all). Scheme B's raw rule (60% negative-share gate) never false-alarms on volume alone by construction, but its stricter threshold means it can cross AFTER the correlated sales drop has already begun — a real trade-off between precision and lead time, not a clean win for either design.

A separate, real limitation found while building this: both schemes' per-day z-score/anomaly-style checks have a non-trivial false-positive rate from pure baseline noise alone (no injected event at all) — Scheme A's two z-score checks (1.5 std-dev warning threshold) spuriously alert in 90% of scenarios at some point during an otherwise-quiet period. This is a genuine statistical property of a per-day fixed threshold check (as opposed to a multi-day control-chart method like CUSUM/EWMA), not an artifact of the injected scenarios — worth stating as a limitation in the dissertation.

## What this does NOT do

- Does not replace or modify the production JS crisis detector (`src/utils/crisisDetection.js`) — Scheme A here is a faithful port for evaluation only.
- Does not retrain or deploy Scheme B anywhere in the live app — it exists only in this evaluation package, per the master prompt's "build both, compare" decision; adopting Scheme B in production is a separate decision the results here can inform, not one this phase made.
