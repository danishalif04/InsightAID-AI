# Phase 5 Crisis Detection Ablation — Scheme A vs Scheme B

Evaluated on 30 injected crisis scenarios + 30 ordinary-volume-spike negative controls (synthetic, seeded, reproducible — `python -m ml.crisis.src.evaluate_ablation`). Scheme B's classifier trained on a SEPARATE 60-scenario set (different random seeds) so its reported improvement isn't measuring memorization.

**Methodology note**: "caught the event" and "lead time" below are measured from the first alert AT OR AFTER each scenario's own injection point — not anywhere in the series. A separate `pre_injection_false_alarm_rate` captures how often a scheme alerts purely from baseline noise BEFORE the injected event even starts (a first run of this evaluation conflated the two and produced a misleading negative lead time; kept as a documented limitation below, not hidden).

| Scheme | Precision | Recall | F1 | False-alarm rate (on spike-only) | Pre-injection false-alarm rate (either scenario kind) | Mean lead time |
| --- | --- | --- | --- | --- | --- | --- |
| A (production, 7-signal) | 50.0% | 100.0% | 0.67 | 100.0% | 90.0% | 2.9 days (n=30) |
| B raw rule (Part A3, no classifier) | 100.0% | 100.0% | 1.00 | 0.0% | 0.0% | -0.7 days (n=30) |
| B + secondary classifier | 100.0% | 100.0% | 1.00 | 0.0% | 0.0% | -0.7 days (n=30) |

## Reading this honestly

- Scheme A's false-alarm rate on the ordinary-volume-spike controls is **100.0%** — its `mention_volume_level`/`mention_volume_velocity` signals react to volume alone, regardless of sentiment direction, so a purely positive viral spike of this magnitude (~3x baseline) reliably crosses its warning/critical ratio thresholds. This is a real, structural property of Scheme A for spikes at or above the size injected here, not a tuning bug — a smaller spike may not cross the threshold at all.
- Scheme B's raw rule (negative share only) has a false-alarm rate of **0.0%** on the same controls, by construction — it never looks at volume on its own, so a volume-only spike can never trip it.
- **Pre-injection false-alarm rate** — a separate, real limitation found during this evaluation, for BOTH schemes: Scheme A alarms purely from baseline noise (no injected event at all yet) in 90.0% of scenarios, driven by its two z-score anomaly checks (`sentiment_anomaly`/`review_volume_anomaly`, 1.5 std-dev warning threshold) — under i.i.d. Gaussian noise, a single day has roughly a 13% chance of exceeding 1.5 std-dev by chance alone, and that compounds across ~20+ quiet observation days per scenario into a high cumulative false-alarm probability. This is a genuine statistical property of a per-day fixed z-score threshold (as opposed to a multi-day control-chart method like CUSUM/EWMA, which Scheme A does not use) and is worth stating as a limitation in the dissertation, not just a property of the injected scenarios.
- The secondary classifier changed Scheme B's spike-only false-alarm rate from 0.0% to 0.0%.
- **A real trade-off, not a clean win for either scheme**: Scheme B's mean lead time is -0.7 days (n=30) — negative, meaning on these injected scenarios its stricter 60%-negative-share gate crosses AFTER the sales drop has already begun, not before. Scheme A's lower 30%/50% thresholds catch the same injected events earlier (2.9 days (n=30)) at the cost of a much higher false-alarm rate on pure volume spikes. Neither scheme is simply "better" — Scheme A trades precision for earlier warning, Scheme B trades lead time for precision. This is exactly the kind of result an ablation should produce, and it is reported as-is rather than picking a winner.
- Both schemes were run on the EXACT same injected daily series, so the comparison itself is fair; neither implementation was tuned against the other's result.

This file is generated — do not hand-edit it; re-run the script and it will be overwritten with fresh numbers.