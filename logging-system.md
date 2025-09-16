# Gomoku Logging Guide

The Gomoku project ships with a simple but structured logging helper to make debugging gameplay and AI behaviour easier. This document explains how to use it effectively.

## Logging API
```javascript
log(category, message, data = null)
```
- `category`: One of the exported category constants from `config.js` (`LOG_GAME`, `LOG_MOVE`, `LOG_AI`, `LOG_ERROR`).
- `message`: A concise description of what happened.
- `data`: Optional object with extra context. When provided it is stringified with indentation on the next line.

Each log entry is emitted via `console.log` with an ISO timestamp and category prefix. Example output:

```text
[2025-09-16T22:45:10.318Z] [MOVE] Cell clicked
{
  "row": 7,
  "col": 6,
  "currentPlayer": 1
}
```

## Categories
- `LOG_GAME`: High-level lifecycle events (initialisation, resets, status updates, undo availability).
- `LOG_MOVE`: Board interactions such as clicks, stone placement, and move history changes.
- `LOG_AI`: AI construction, decision making, chosen moves, and difficulty changes.
- `LOG_ERROR`: Unexpected conditions, missing DOM nodes, or invalid state transitions.

## Usage Guidelines
- Prefer the shared `log` helper over raw `console.log` so the format stays consistent.
- Include enough contextual data to reproduce issues (row, col, player, difficulty, etc.).
- Log both the action and the outcome where possible (for example: when a win condition is detected, log the direction that triggered it).
- Emit `LOG_ERROR` entries before throwing exceptions to preserve details in browser consoles.
- When adding new gameplay flows, keep related logs grouped under a single category to simplify filtering.

## Working with the Console
- Browsers allow filtering by text; searching for `[MOVE]` or `[AI]` quickly narrows to the relevant events.
- Timestamps make it easy to correlate logs with user interactions. Capture screenshots or HAR files alongside logs when reporting issues.
- If verbose logging becomes noisy in production builds, introduce a feature flag around the `log` helper or wrap logs in environment checks.

Sticking to these conventions keeps debugging predictable as the project grows.
