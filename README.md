# Gomoku Game

A browser-based implementation of Gomoku (Five in a Row) built with plain HTML, CSS, and modern JavaScript modules. The project supports human vs human games as well as an AI opponent with multiple difficulty levels.

## Overview
- 15x15 grid rendered dynamically from `script.js`
- Turn-based play with win and draw detection after every move
- Move history with undo support and last-move highlighting
- Configurable game mode and AI difficulty directly from the UI
- Rich visual polish including animated stone placement and win highlighting
- Built-in dark mode and board grid toggles with preference persistence
- Structured logging for gameplay, AI activity, and error diagnostics

## Quick Start
1. Serve the project from the repository root so the ES modules load correctly (for example `npx http-server .` or `python -m http.server`).
2. Open the served `index.html` in a modern desktop browser (Chrome, Edge, Firefox, or Safari).
3. Choose a game mode, optionally select an AI difficulty, and start placing stones on the board.

## Gameplay at a Glance
- The board is populated with clickable cells that map to a 2D `board[row][col]` array.
- Black always plays first; the status banner shows whose turn it is and reflects the current context (human vs AI).
- Winning lines (five in a row horizontally, vertically, or diagonally) end the game immediately and update the status area.
- Draws are declared when the board is full with no winner.
- The Undo button rolls back the latest move, and in AI mode it removes the most recent human and AI moves.

## Game Modes and AI
### Human vs Human
Both players share the same device and alternate placing stones. Undo removes only the last move.

### Human vs AI
- Humans can choose to play as black or white when facing the AI. Selecting white lets the AI open the game as black.
- AI turns are scheduled with a short delay so the UI has time to update.
- Switching modes resets the game to keep state consistent.

#### Difficulty Levels
- `Easy`: blocks instant wins and chooses from the strongest nearby options to stay competitive.
- `Medium`: layers the easy heuristics with board scoring and checks likely opponent replies before committing to a move.
- `Hard`: runs a minimax search with alpha-beta pruning over top candidates for a tournament-grade challenge.

## Move History and Undo Flow
- Moves are stored in `moveHistory` up to `MAX_HISTORY` entries (see `config.js`).
- Each move records the row, column, and player to simplify undo and status recalculations.
- Undo updates the internal board, DOM classes, highlight state, and status banner while clearing any game-over flag.

## Status and Visual Feedback
- `setStatus` centralises messaging and uses `data-state` attributes to drive styling in `styles.css`.
- The current player or AI thinking state is reflected through both text and a colored indicator.
- Stones animate into position and keep a soft glow on the last move so players can track momentum.
- Winning sequences receive a pulsing ring highlight, and the previous glow is cleared for clarity.

## Display Preferences
- Dark mode can be toggled at any time; the setting persists via `localStorage` and respects system preferences until a manual override.
- Grid lines can be hidden for a minimalist board; the toggle state persists between sessions.
- Preference changes log under `LOG_GAME` to aid debugging UI report issues.

## Logging and Diagnostics
- `config.js` exports a `log(category, message, data?)` helper used throughout the codebase.
- Categories: `LOG_GAME`, `LOG_MOVE`, `LOG_AI`, and `LOG_ERROR`.
- Log entries include an ISO timestamp, category, and optional JSON-formatted data to aid troubleshooting.

```text
[2025-09-16T22:41:51.027Z] [GAME] Game initialized
[2025-09-16T22:42:05.114Z] [MOVE] Stone placed
{
  "player": 1,
  "row": 7,
  "col": 8
}
```

Refer to `logging-system.md` for detailed usage guidelines.

## Project Structure
```
project-root/
|- index.html       # Page shell and controls
|- styles.css       # Board, layout, and status styling
|- script.js        # Game state management, DOM wiring, and event flow
|- ai-player.js     # AI opponent with difficulty-specific strategies
|- config.js        # Shared constants and logging helper
|- logging-system.md# Extended documentation for the logging helpers
```

## Development Notes
- `validateDomReferences` guards against missing UI elements and surfaces issues via `LOG_ERROR`.
- `updateBoard` and `updateCellAppearance` keep the DOM in sync with the in-memory board and ease future refactors.
- The codebase is organised into small, reusable functions with JSDoc comments to simplify maintenance.
- Refer to ``ai-opponent.md`` for a deep dive into the AI difficulty pipeline and heuristics.
- No build tooling is required; linting or testing can be added using your preferred workflow.

## Benchmarking
- `npm run build` runs the default self-play suite and automatically executes `npm test` afterwards.
- `npm test` runs the Vitest unit suite.
- `npm run bench:run` executes the default benchmark config (`benchmarks/config/default.json`) and writes summaries to `benchmarks/results/<timestamp>/summary.json`.
- `npm run bench:ci` runs the smoke suite used by `.github/workflows/benchmarks.yml`.
- The runner relies on the headless `GomokuEngine` (`src/engine/game.js`) for deterministic AI matches; see `benchmarking-system.md` for architecture details.

## Enhancement Ideas
The following themes capture the primary expansion opportunities:
- **AI depth**: implement the planned hard difficulty, add minimax or heuristic search, and expose tuning controls.
- **Game flow options**: support Swap2 openings, timed matches, and configurable board sizes.
- **UI/UX polish**: richer animations, victory highlighting, dark mode, optional grid toggles, and responsive layout refinements.
- **Player experience**: move history sidebar, tutorials, sound effects, avatars, and social sharing hooks.
- **Multiplayer**: local score tracking, online play through WebSockets, spectator mode, and leaderboards.
- **Analysis and tools**: replay viewer, heatmaps, debug dashboards, and test coverage for critical logic.

Contributions should follow the logging conventions and keep the undo/history model in sync with any new gameplay features.

## Current Gaps & Next Steps
- **Undo depth**: `MAX_HISTORY` caps undos at 50 moves while a 15x15 game can span 225 turns; consider persisting a full move log or capped-by-memory buffer so competitive matches remain reviewable.
- **AI search strength**: Hard mode stops at depth 3 without caching; folding in proof-number/dependency search and transposition-aware iterative deepening would close the gap with state-of-the-art approaches documenting forced wins on standard boards.[1][2]
- **Threat modelling**: Add explicit threat-space and double-threat scanners so medium/hard difficulties defend four-four and overline races without relying solely on scalar evaluations.
- **Opening rules**: Only freestyle play is supported today; implementing Swap2 and other professional openings keeps parity with modern human and engine tournaments.[1]
- **Benchmarking**: No automated way exists to compare builds; scripting self-play suites and submitting snapshots to events like Gomocup creates an external yardstick.[3] See `benchmarking-system.md` for the proposed benchmarking framework.
- **Quality gates**: There is no unit or integration test coverage; instrument critical modules (win detection, undo, AI selectors) before future refactors land.

### References
[1] "Computers and gomoku", Wikipedia, accessed 17 Sep 2025.
[2] "Proof-number search", Wikipedia, accessed 17 Sep 2025.
[3] Gomocup - The Gomoku AI Tournament, official site, accessed 17 Sep 2025.


