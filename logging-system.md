Gomoku Game Logging Rules
Logging System
The Gomoku game uses a structured logging system to facilitate debugging and track game events. This system helps developers understand the game's flow and quickly identify issues.

Logging Function
We use a custom log function with the following signature:
log(category, message, data = null)
category: A string indicating the type of log entry.
message: A descriptive message about the event.
data: (Optional) An object containing relevant data for the log entry.

Log Categories
We use the following categories for logging:

LOG_GAME: For general game events (e.g., initialization, reset).
LOG_MOVE: For player moves and board state changes.
LOG_AI: For AI-related events and decisions.
LOG_ERROR: For error conditions and unexpected states.

Logging Rules
Use appropriate categories for different types of events.
Log all significant game state changes (moves, resets, mode changes).
Log AI decisions and moves separately using the LOG_AI category.
Include relevant data with each log for context.
Use the LOG_ERROR category for any error conditions or unexpected states.
Examples
log(LOG_GAME, 'Game initialized', { boardSize: BOARD_SIZE });
log(LOG_MOVE, 'Player made a move', { player: currentPlayer, row, col });
log(LOG_AI, 'AI calculating next move', { difficulty: aiDifficulty });
log(LOG_ERROR, 'Invalid move attempt', { player: currentPlayer, row, col });

Debugging Tips
You can filter console logs by categories if needed.
Consider adding a debug mode flag to enable/disable detailed logging in production.
When investigating issues, pay attention to the sequence of logs and the data provided in each log entry.
Implementation Notes
The logging system is implemented in script.js and exported for use in other modules.
When adding new features or modifying existing ones, make sure to include appropriate log statements.
Keep logs informative but concise. Avoid logging sensitive information.
By following these logging rules, we can maintain a consistent and helpful debugging system throughout the development and maintenance of the Gomoku game.