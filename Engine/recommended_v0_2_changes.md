# ENGINE-TWIN v0.2 recommended changes

**Status: recommendations only.** No existing source, dataset, or metadata file was altered during this audit. Implement and verify corrections before producing a v0.2 dataset.

## Priority 0 — blockers for a credible synthetic classification experiment

### 1. Remove target encoding from scenario identity

- Generate fault class, severity, phase, operating profile, and fault onset independently using an explicit scenario sampling design.
- Assign scenario IDs only after scenario generation, using opaque shuffled identifiers. Do not encode class, severity, phase, engine, onset, or split in IDs.
- Preserve all identifiers as metadata and exclude them from model inputs.
- Add a test that no ID/sequence rule predicts `fault_type` or `fault_severity` above the declared baseline.

**Acceptance checks:** shuffled ID reassignment leaves all measurements and labels unchanged; an ID-only classifier scores at chance (within sampling error); an automated audit rejects deterministic ID-to-target mappings.

### 2. Restore a complete, deterministic generator

- Replace the current print-only stub with the actual generator source, not a reimplementation inferred from output.
- Document the equations and units used for each healthy channel, environmental input, thermal lag, noise process, fault injection, residual, and health target.
- Use a recorded base seed with a documented RNG strategy. Store per-scenario generation parameters and seed (or reproducible RNG substream identifier) in manifest metadata.
- Record generator version/commit, configuration hash, input specification provenance, and output SHA-256 in the dataset card.
- Add a clean-environment regeneration check that compares output row counts, schema, labels, and deterministic file hashes.

**Acceptance checks:** running the documented command from a clean checkout recreates the expected files; same seed/config gives the same data; changing the seed changes stochastic channels while preserving scenario rules.

### 3. Create split partitions for the intended generalization claim

- Decide which claim is being tested. For unseen-engine performance, create enough independent engine IDs and split by engine before scenario generation.
- Ensure an engine ID, engine parameter set, and any derived operating profile are never shared across train/validation/test for that claim.
- Do not bind one engine ID to one phase. Vary supported phases per engine; cross operating phases with fault types where physically meaningful.
- Publish per-split engine, scenario, fault, severity, and phase counts. Keep a scenario-level split only as a separately named within-engine experiment.

**Acceptance checks:** partition intersections are empty for every grouping variable relevant to the claim; all splits contain documented fault/phase coverage; baselines include phase-only and metadata-only predictors.

### 4. Resolve channel units and enforce physical consistency

- Confirm `oil_pressure_kpa`'s intended unit from the true generator/specification. Do not automatically multiply or relabel the current values; make the conversion explicit and versioned if justified.
- Reconcile `power_kw`, `torque_nm`, and `rpm` using `P = τ × 2π × RPM / 60` where they represent shaft quantities. If injected faults intentionally break this equality, document when and why; otherwise correct equations.
- Keep the ideal-gas density check and add parameterized range/unit checks for environmental and engine channels.
- Mark every value as measured, derived, simulated latent, or simulated sensor-observed. Clearly distinguish true state from a faulted sensor reading.

**Acceptance checks:** chosen unit conversions have round-trip tests; physical identities meet stated tolerances on healthy cases; injected faults violate only the relationships they are intended to affect; sensor and latent channels remain distinguishable.

## Priority 1 — improve fault/health label meaning

### 5. Make fault coverage and labeling design explicit

- Keep onset, duration, severity, sensor target, and active interval semantics in one scenario configuration and generate both manifest and samples from it.
- Give every fault a documented signal mechanism, including expected channels, sign/trend, affected interval, severity scaling, and noise.
- State whether `fault_active` means injected condition active or diagnostically observable; those are different concepts.
- Clarify `health_index_synthetic` as a physical degradation-only index or redesign it to account for sensor integrity separately. Do not assign it as a complete health score if sensor faults are deliberately excluded.
- Keep synthetic health state derived from the documented score thresholds and mark it as derived, not an independent ground-truth diagnosis.
- Preserve the empty RUL field unless there is a justified degradation-to-end-of-life model and a stated censoring/labeling procedure.

**Acceptance checks:** scenario-level property tests verify fault-specific channels, onset, active interval, severity ordering, expected missingness, and target mappings; sensor faults affect data quality/measurement health explicitly; no impossible label combinations remain.

## Priority 2 — make features and evaluation honest and reusable

### 6. Define a real raw-to-processed pipeline

- Keep raw simulator outputs immutable.
- Create a separate processing command that calculates documented observed-minus-healthy residuals, rolling/statistical features, and missingness indicators from a reproducible healthy reference.
- Store processed features in a documented schema with units, provenance, and deterministic row alignment; do not duplicate raw under a “processed” filename.
- Fit any learned normalization/reference parameters on training data only.

**Acceptance checks:** raw/processed hashes differ for expected transformations; feature values can be traced to raw rows and equations; no target, future, or held-out data leaks into fitting.

### 7. Publish a compact validation protocol and claims boundary

- Evaluate with engine-held-out and, where feasible, operating-condition-held-out tests. Keep one final test set untouched until model selection is complete.
- Report confusion matrix, per-class precision/recall/F1, macro-F1, calibration/uncertainty where useful, and class/phase counts—not accuracy alone.
- Compare against majority-class, phase-only, and any intentionally permitted metadata baselines to expose shortcuts.
- Add distribution and physics checks to CI or dataset validation; fail generation on schema, seed, split, missingness, or invariance violations.
- Keep the dataset card's non-use warnings. State that synthetic test performance does not establish accuracy on real engines.

## Suggested implementation order

1. Recover or author the actual generator from an explicitly documented specification; do not infer hidden equations from the current CSV.
2. Add tests for deterministic regeneration and physical/unit identities.
3. Redesign scenario sampling and IDs to break target/phase/engine shortcuts.
4. Regenerate splits by independent engines and record full provenance.
5. Rebuild the processed feature pipeline and synthetic health semantics.
6. Re-run audit, baseline experiments, and documentation before releasing v0.2.

The current v0.1.0 CSVs should remain immutable as an archived audit target. Any corrected data should be written as a new versioned dataset, with a new card, manifest, split files, statistics, and hashes.
