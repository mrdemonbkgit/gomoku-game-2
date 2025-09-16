/**
 * Shared configuration values and logging helpers for the Gomoku game.
 */
export const BOARD_SIZE = 15; // Size of the game board (15x15)
export const EMPTY = 0; // Represents an empty cell
export const BLACK = 1; // Represents a black stone
export const WHITE = 2; // Represents a white stone
export const MAX_HISTORY = 50; // Maximum number of moves to store in history

// Logging categories
export const LOG_GAME = 'GAME';
export const LOG_MOVE = 'MOVE';
export const LOG_AI = 'AI';
export const LOG_ERROR = 'ERROR';

/**
 * Enhanced logging function for debugging and diagnostics.
 *
 * @param {string} category - The category of the log (e.g., 'MOVE', 'AI', 'GAME').
 * @param {string} message - The message to be logged.
 * @param {Object} [data] - Optional data to be logged.
 */
export function log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${category}] ${message}`;

    if (data) {
        logMessage += '\n' + JSON.stringify(data, null, 2);
    }

    console.log(logMessage);
}
