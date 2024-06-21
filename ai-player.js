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
        if (!Array.isArray(board) || board.length !== BOARD_SIZE || board[0].length !== BOARD_SIZE) {
            throw new Error('Invalid board state');
        }
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
        log(LOG_AI, 'Making medium difficulty move');

        // 1. Check for an immediate win
        const winningMove = this.findWinningMove(board, this.playerColor);
        if (winningMove) {
            log(LOG_AI, 'Winning move found', { move: winningMove });
            return winningMove;
        }

        // 2. Block immediate threats
        const opponentColor = this.playerColor === BLACK ? WHITE : BLACK;
        const blockingMove = this.findWinningMove(board, opponentColor);
        if (blockingMove) {
            log(LOG_AI, 'Blocking opponent\'s winning move', { move: blockingMove });
            return blockingMove;
        }

        // 3. Create or extend advantageous positions
        const advantageousMove = this.findAdvantageous(board, this.playerColor);
        if (advantageousMove) {
            log(LOG_AI, 'Creating advantageous position', { move: advantageousMove });
            return advantageousMove;
        }

        // 4. Block opponent's development
        const blockDevelopmentMove = this.findAdvantageous(board, opponentColor);
        if (blockDevelopmentMove) {
            log(LOG_AI, 'Blocking opponent\'s development', { move: blockDevelopmentMove });
            return blockDevelopmentMove;
        }

        // 5. Center and strategic point control
        const strategicMove = this.findStrategicMove(board);
        if (strategicMove) {
            log(LOG_AI, 'Making strategic move', { move: strategicMove });
            return strategicMove;
        }

        // 6. Random move (fallback)
        const randomMove = this.makeRandomMove(board);
        log(LOG_AI, 'Making random move', { move: randomMove });
        return randomMove;
    }

    countLine(board, row, col, dx, dy, player) {
        return 1 + this.countStonesInDirection(board, row + dx, col + dy, dx, dy, player)
                 + this.countStonesInDirection(board, row - dx, col - dy, -dx, -dy, player);
    }

    findAdvantageous(board, player) {
        const moves = [];
        const potentialMoves = this.findPotentialMoves(board);
        for (const { row, col } of potentialMoves) {
            const score = this.evaluatePosition(board, row, col, player);
            if (score > 0) {
                moves.push({ row, col, score });
            }
        }
        moves.sort((a, b) => b.score - a.score);
        return moves.length > 0 ? moves[0] : null;
    }

    findPotentialMoves(board) {
        const potentialMoves = new Set();
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] !== EMPTY) {
                    for (const [dx, dy] of directions) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        if (this.isEmptyCell(board, newRow, newCol)) {
                            potentialMoves.add(`${newRow},${newCol}`);
                        }
                    }
                }
            }
        }
        return Array.from(potentialMoves).map(coord => {
            const [row, col] = coord.split(',').map(Number);
            return { row, col };
        });
    }

    evaluatePosition(board, row, col, player) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            const lineLength = this.countLine(board, row, col, dx, dy, player);
            if (lineLength >= 3) {
                score += lineLength * 10;
                if (this.isOpenEnded(board, row, col, dx, dy)) {
                    score += 20;
                }
            }
        }
        return score;
    }

    isOpenEnded(board, row, col, dx, dy) {
        return this.isEmptyCell(board, row - dx, col - dy) && this.isEmptyCell(board, row + dx, col + dy);
    }

    findStrategicMove(board) {
        const center = Math.floor(BOARD_SIZE / 2);
        const strategicPoints = [
            { row: center, col: center },
            { row: center - 1, col: center - 1 },
            { row: center - 1, col: center + 1 },
            { row: center + 1, col: center - 1 },
            { row: center + 1, col: center + 1 }
        ];
        for (const point of strategicPoints) {
            if (board[point.row][point.col] === EMPTY) {
                return point;
            }
        }
        return null;
    }

    /**
     * Find winning move for a player
     * @param {Array<Array<number>>} board - The current game board
     * @param {number} player - The player to find winning move for
     * @returns {Object|null} The winning move as {row, col}, or null if no winning move
     */
    findWinningMove(board, player) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === EMPTY) {
                    if (this.checkWinningMove(board, row, col, player)) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if a move is a winning move
     * @param {Array<Array<number>>} board - The current game board
     * @param {number} row - The row of the move
     * @param {number} col - The column of the move
     * @param {number} player - The player making the move
     * @returns {boolean} True if the move is a winning move, false otherwise
     */
    checkWinningMove(board, row, col, player) {
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            count += this.countStonesInDirection(board, row, col, dx, dy, player);
            count += this.countStonesInDirection(board, row, col, -dx, -dy, player);
            if (count >= 5) return true;
        }
        return false;
    }

    /**
     * Count consecutive stones in a direction
     * @param {Array<Array<number>>} board - The current game board
     * @param {number} row - Starting row
     * @param {number} col - Starting column
     * @param {number} dx - X direction
     * @param {number} dy - Y direction
     * @param {number} player - The player's stone to count
     * @returns {number} The count of consecutive stones
     */
    countStonesInDirection(board, row, col, dx, dy, player) {
        let count = 0;
        let x = row + dx;
        let y = col + dy;
        while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[x][y] === player) {
            count++;
            x += dx;
            y += dy;
        }
        return count;
    }

    
    /**
     * Check if a cell is empty and within the board
     * @param {Array<Array<number>>} board - The current game board
     * @param {number} row - The row to check
     * @param {number} col - The column to check
     * @returns {boolean} True if the cell is empty and within the board, false otherwise
     */
    isEmptyCell(board, row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === EMPTY;
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
}

export default AIPlayer;