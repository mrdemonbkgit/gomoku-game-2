# Gomoku AI Opponent Guide

This guide documents how the Gomoku project implements its computer-controlled opponent models and how you can extend them. The AI lives entirely in `ai-player.js`, which exports the `AIPlayer` class. Gameplay wiring in `script.js` instantiates the class when Human vs AI mode is selected.

## Lifecycle Recap
1. `AIPlayer` is constructed with a difficulty name (`easy`, `medium`, or `hard`) and the stone colour it controls (currently always white).
2. After each human turn, `script.js` calls `aiPlayer.makeMove(board)` with the current 15x15 matrix.
3. The AI inspects the board, chooses `{ row, col }`, and the controller applies the move, runs win detection, and updates the UI.
4. The AI never mutates shared state directly and relies heavily on the logging helper from `config.js` for observability.

## Difficulty Strategies
### Easy - "Thoughtful Beginner"
- Checks for an immediate winning move and takes it when available.
- Blocks any opponent move that would result in five in a row on the next turn.
- Ranks nearby candidate cells (within one step of existing stones) using a lightweight board evaluation, then plays one of the top few at random to stay unpredictable.
- Falls back to a random empty cell only when the board is completely empty or no heuristic candidates exist.

### Medium - "Tactical Challenger"
- Builds on the easy heuristics.
- Scores each candidate move and simulates the strongest handful of opponent replies, favouring positions that remain advantageous even after a counter.
- Limits analysis to the highest ranked twelve moves and up to six opponent responses to balance strength with responsiveness.
- Resorts to the easy-level fallback only when no strategic candidates are available.

### Hard - "Tournament Pro"
- Executes a minimax search with alpha-beta pruning to depth three (AI -> opponent -> AI) across the best-ranked moves.
- Uses the same evaluation function as other levels to score leaf nodes, heavily rewarding open-ended lines while penalising blocked formations.
- Always intercepts immediate wins or losses before launching the deeper search so the branching factor stays contained.

## Heuristic Building Blocks
- **Potential move generation:** `findPotentialMoves` gathers empty cells adjacent to any stone. Empty boards default to the centre point.
- **Evaluation function (`evaluateBoard`):** Scores the position from a player's perspective by summing directional sequences (rows, columns, and both diagonals). Pattern weights live in `PATTERN_SCORES` and cover open/closed twos, threes, fours, and completed fives.
- **Ranking helpers:** `prepareCandidates` and `rankCandidates` temporarily play a stone, call `evaluateBoard`, and sort moves so higher-level strategies can consume the best options quickly.
- **Minimax core:** `minimax` performs recursive evaluation with alpha-beta pruning and uses `checkWinningMove` to terminate early when forced wins or losses are found.

## Logging
All difficulty branches log their key decisions through `LOG_AI`:
```text
[2025-09-16T23:06:45.421Z] [AI] Medium difficulty evaluating multi-step options
[2025-09-16T23:06:45.433Z] [AI] Medium difficulty selecting strategic move
{
  "move": { "row": 9, "col": 7 },
  "score": 5800
}
```
Use the browser console filter `[AI]` for quick debugging or to analyse decision trails.

## Tuning & Extensibility
- **Adjusting difficulty:** Modify `PATTERN_SCORES`, candidate limits, or search depth constants at the top of `ai-player.js` to rebalance behaviour without touching core logic.
- **Experimenting with patterns:** Extend `scorePattern` to incorporate more nuanced heuristics (for example double-threat detection or ladder patterns).
- **Scaling hard mode:** Increase `HARD_SEARCH_DEPTH` or widen `HARD_CANDIDATE_LIMIT` to make the opponent even tougher. Consider pushing heavy computation into a Web Worker if latency becomes noticeable.
- **Adding new tiers:** Follow the structure of `makeEasyMove`, `makeMediumMove`, and `makeHardMove`, then expose the new label in `index.html` and `script.js`.
- **Testing:** Craft unit tests around `findWinningMove`, `evaluateBoard`, and `minimax` to ensure future tweaks do not create regressions. During manual playtesting, leave the console open to validate that the logged reasoning matches expectations.

Understanding these components will make it easier to diagnose AI behaviour changes or to build richer competitive features.
