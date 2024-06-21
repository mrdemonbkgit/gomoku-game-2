/**
 * AIPlayer class for Gomoku game
 * This class encapsulates the logic for an AI opponent in the game
 */
import { log, LOG_AI, EMPTY, BLACK, WHITE, BOARD_SIZE } from './script.js';

class AIPlayer {
    /**
     * Create an AI player
     * @param {string} difficulty - The difficulty level of the AI ('easy', 'medium', or 'hard')
     * @param {number} playerColor - The color of the AI player's stones (BLACK or WHITE)
     */
    constructor(difficulty, playerColor) {
        this.difficulty = difficulty;
        this.playerColor = playerColor;
        log(LOG_AI, 'AI player created', { difficulty, playerColor });
    }

    /**
     * Make a move based on the current difficulty level
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Object} The chosen move as {row, col}
     */
    makeMove(board) {
        log(LOG_AI, 'AI is deciding move', { difficulty: this.difficulty });
        let move;
        switch (this.difficulty) {
            case 'easy':
                move = this.makeRandomMove(board);
                break;
            case 'medium':
                move = this.makeMediumMove(board);
                break;
            case 'hard':
                move = this.makeHardMove(board);
                break;
            default:
                log(LOG_AI, 'Invalid difficulty level', { difficulty: this.difficulty });
                throw new Error('Invalid difficulty level');
        }
        log(LOG_AI, 'AI move decided', { move });
        return move;
    }

    /**
     * Make a random move (for easy difficulty)
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Object} The chosen move as {row, col}
     */
    makeRandomMove(board) {
        const emptyCells = this.findEmptyCells(board);
        if (emptyCells.length === 0) {
            log(LOG_AI, 'No available moves');
            return null; // No moves available
        }
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const move = emptyCells[randomIndex];
        log(LOG_AI, 'Random move selected', { move });
        return move;
    }

    /**
     * Find all empty cells on the board
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Array<Object>} Array of empty cells as {row, col}
     */
    findEmptyCells(board) {
        const emptyCells = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === EMPTY) {
                    emptyCells.push({ row, col });
                }
            }
        }
        log(LOG_AI, 'Empty cells found', { count: emptyCells.length });
        return emptyCells;
    }

    /**
     * Make a move using basic strategies (for medium difficulty)
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Object} The chosen move as {row, col}
     */
    makeMediumMove(board) {
        log(LOG_AI, 'Medium difficulty move not yet implemented');
        // TODO: Implement medium difficulty strategy
        return this.makeRandomMove(board);
    }

    /**
     * Make a move using advanced strategies (for hard difficulty)
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Object} The chosen move as {row, col}
     */
    makeHardMove(board) {
        log(LOG_AI, 'Hard difficulty move not yet implemented');
        // TODO: Implement hard difficulty strategy
        return this.makeRandomMove(board);
    }

    /**
     * Evaluate the current board state
     * @param {Array<Array<number>>} board - The current game board
     * @returns {number} The score of the current board state
     */
    evaluateBoard(board) {
        log(LOG_AI, 'Board evaluation not yet implemented');
        // TODO: Implement board evaluation
        return 0;
    }

    /**
     * Find winning move for a player
     * @param {Array<Array<number>>} board - The current game board
     * @param {number} player - The player to find winning move for
     * @returns {Object|null} The winning move as {row, col}, or null if no winning move
     */
    findWinningMove(board, player) {
        // TODO: Implement finding winning move
        log(LOG_AI, 'Finding winning move not yet implemented');
        return null;
    }

    /**
     * Block opponent's winning move
     * @param {Array<Array<number>>} board - The current game board
     * @returns {Object|null} The blocking move as {row, col}, or null if no blocking move needed
     */
    blockOpponentWin(board) {
        const opponentColor = this.playerColor === BLACK ? WHITE : BLACK;
        const blockingMove = this.findWinningMove(board, opponentColor);
        if (blockingMove) {
            log(LOG_AI, 'Blocking move found', { move: blockingMove });
        }
        return blockingMove;
    }
}

export default AIPlayer;