# Benchmarking System Design

## Objectives
- Provide reproducible self-play benchmarks that highlight regressions or improvements in the Gomoku AI across difficulties.
- Capture strength metrics (win rate, mean moves, threat coverage) and performance telemetry (decision latency, search breadth).
- Allow periodic comparison with external engines (e.g., Gomocup entrants) without blocking daily development.

## Current Assets
- `src/engine/game.js` supplies a headless `GomokuEngine` with deterministic apply/undo logic, state load/clone helpers, and move generation utilities for deterministic self-play.
- `benchmarks/runners/run-benchmarks.mjs` executes seeded AI-vs-AI matches using JSON configs under `benchmarks/config/`, writing summaries to timestamped folders in `benchmarks/results/`.
- `npm run build` runs the default benchmark suite and then automatically calls `npm test` via the `postbuild` hook.
- `npm test` (Vitest) covers engine and AI behaviour via `tests/engine.spec.js` and `tests/ai-player.spec.js`.

## Scope
- Browser UI is out of scope; benchmarking runs headless using the core rules engine and AI modules.
- Initial focus is AI vs AI within the repository; human-vs-AI telemetry is future work.
- Baseline targets are Windows/macOS/Linux with Node.js 18+. CI integration via GitHub Actions or equivalent is assumed.

## High-Level Architecture
```
benchmark config --> Match Scheduler --> Match Runner --> Metrics Collector --> Result Store --> Reporter
                                         |                   ^                                   |
                                         v                   |                                   v
                                    Engine Adapter <------- Telemetry Hooks -------------- Baseline Comparator
```

### Components
- **Benchmark config (`benchmarks/config/*.json`)**: declares match matrix (difficulty pairs, starting colors, openings, seeds, repetitions).
- **Match Scheduler**: interprets config, fans out matches (parallel workers with core-count limits), and ensures deterministic seeding.
- **Match Runner**:
  - Loads the headless engine adapter.
  - Instantiates two `AIPlayer` instances at requested difficulties, alternating colors.
  - Steps the game loop until result, enforcing per-move timeouts and logging search depth stats.
- **Engine Adapter**: thin layer that exposes the existing game logic without DOM. Requires extracting rule utilities (`makeMove`, `checkWin`, undo) from `script.js` into a shared module.
- **Telemetry Hooks**: instrumentation inside `AIPlayer` to emit plies explored, candidate counts, elapsed ms per move (using `performance.now()` or `process.hrtime.bigint()`).
- **Metrics Collector**: aggregates per-match JSON (outcome, moves, threats answered, average latency) and computes summary stats (mean, median, percentile).
- **Result Store (`benchmarks/results/YYYYMMDD/`)**: raw match logs, summary JSON, and rendered reports (Markdown/HTML charts).
- **Reporter**: renders CLI tables and optional Markdown dashboards; highlights deltas against saved baselines.
- **Baseline Comparator**: loads prior `baseline.json` snapshots to flag regressions using configurable thresholds (e.g., win rate drop >5%).

## Match Types
1. **Intra-build self-play**: same code version, different difficulties (Easy vs Medium, Medium vs Hard, mirror swaps).
2. **Regression check**: current branch vs `baseline` (previous release) using identical seeds.
3. **Opening suite**: curated set of Swap2 and freestyle openings to stress tactical coverage.
4. **External engine sparring** (Phase 3): integrate via Gomocup protocol or Piskvork compatible interface.

## Metrics & Telemetry
| Metric | Source | Notes |
|--------|--------|-------|
| Win rate per pairing | Match outcomes | Reported with 95% confidence interval (Wilson score). |
| Average moves | Game logs | Helps detect early resignations or loops. |
| Median move latency | Telemetry hook | Per difficulty, separate offensive vs defensive moves. |
| Max/avg branching factor | Instrumented candidate counts | Derived from `prepareCandidates` length. |
| Threat response rate | Analyzer pass | Percentage of opponent threat moves answered within 1 ply. |
| Search depth distribution | Telemetry | Tracks actual minimax depth achieved vs nominal. |
| Error counts | Engine adapter | Number of invalid states, timeouts, or exceptions. |

## Data Formats
- **Raw match log (`.json`)**: includes metadata (build hash, config id, seed), move list, per-move telemetry.
- **Summary (`summary.json`)**: aggregated metrics per matchup.
- **Baseline (`baseline.json`)**: curated snapshot committed to repo for regression checks.
- **Report (`report.md`)**: human-readable summary with tables and charts (links to raw data).

## Workflow
1. `npm run bench:prepare` — builds headless bundle, copies to `benchmarks/dist/`.
2. `npm run bench:run -- --config benchmarks/config/default.json` — runs scheduler/runner, produces raw logs.
3. `npm run bench:report` — generates summary and Markdown dashboard, updates `benchmarks/latest/` symlink.
4. `npm run bench:compare -- --baseline benchmarks/baselines/2024-09-01/summary.json` — prints deltas and regression warnings.

CI integration: `benchmarks/config/ci.json` runs a reduced suite (e.g., 50 games per pairing) within <10 minutes, saving artifacts for inspection.

## External Benchmarking (Gomocup)
- **Adapter**: implement Gomocup `pipe` protocol wrapper around the engine adapter to allow headless play vs external bots.
- **Sandbox**: run periodic (e.g., monthly) matches against archived Gomocup AIs using scripted environment (Wine on Linux for Windows-only bots).
- **Reporting**: store Elo updates and upload summary to `benchmarks/external/`.
- **Submission workflow**: script packaging of AI binaries (headless JS with Node runtime) and documentation to speed entry into annual Gomocup.

## Implementation Phases
1. **Engine extraction**: refactor core board rules into `src/engine/game.js`, add minimal CLI harness for single match.
2. **Telemetry instrumentation**: extend `AIPlayer` to emit metrics via callback interface; ensure hooks are no-ops in production UI.
3. **Scheduler & runner**: implement Node CLI with worker threads or child processes; support deterministic seeding.
4. **Reporting & baselines**: build aggregation logic, persistence layout, Markdown reporting templates.
5. **CI pipeline**: wire `npm run bench:ci` into GitHub Actions; publish artifacts.
6. **External integrations**: add Gomocup protocol support and archived opponent regression tests.

## Risks & Mitigations
- **DOM entanglement**: `script.js` tightly couples UI and logic. Mitigation: extract shared engine modules before automation.
- **Performance variance**: Node vs browser timing differences; capture CPU info and normalise by averaging multiple runs.
- **Randomness**: AI uses `Math.random()` for tie-breaking. Introduce seeded PRNG (e.g., `seedrandom`) injected via benchmarking harness.
- **Resource contention**: Parallel matches can spike CPU. Scheduler should cap concurrency (default `os.cpus().length - 1`).
- **Result drift**: Baselines become stale; enforce scheduled re-generation (e.g., monthly) with changelog notes.

## Tooling Recommendations
- Node.js 18+ with ESM modules enabled.
- `seedrandom` for deterministic RNG.
- `commander` or `yargs` for CLI parsing.
- `piscina` or `worker_threads` for parallelism.
- `json2md` or `marked` for report generation.
- Optional: `chart.js` rendered via `node-canvas` for visual summaries.

## Directory Layout
```
benchmarks/
  config/
    default.json
    ci.json
  runners/
    run-benchmarks.mjs
    gomocup-adapter.mjs
  results/
    2025-09-17/
      logs/
      summary.json
      report.md
  baselines/
    2025-09-01/
      summary.json
  latest/ -> results/2025-09-17/
```

## Next Actions
1. Extract core rules into a headless `engine` module and expose deterministic move APIs.
2. Add optional telemetry callbacks to `AIPlayer` (behind feature flag) to record search metadata.
3. Scaffold `benchmarks/` folder with sample config, runner skeleton, and documentation.
4. Set up CI job invoking the slim benchmarking suite and storing artifacts for regression analysis.
5. Plan external bot compatibility by prototyping the Gomocup protocol adapter.



