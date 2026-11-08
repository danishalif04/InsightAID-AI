# Scenario configs (FYP II Part E, S1-S7)

Placeholder directory, created in Phase 1 for Phase 2 onward to use. Each
scenario (S1 E-commerce full dataset, S2 Local Malaysian shop sparse data,
S3 cold-start, S4 injected crisis, S5 Malaysian festive seasonality, S6
language ablation, S7 noise robustness — see the master prompt's Part E)
will be one YAML file here, runnable via `python -m ml.run_scenario <name>`.

**Not built yet** — no YAML configs or run-scenario entry point exist as
of Phase 1. This directory exists so Phase 1's mode config
(`src/config/modesConfig.js`) and the synthetic local-shop data generator
(Phase 2, `synthetic_shop.py`) have a documented home to write into,
without inventing scenario content ahead of the phase that actually
specifies it.
