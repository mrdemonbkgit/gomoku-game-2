import { BOARD_SIZE, EMPTY, BLACK, WHITE } from '../../config.js';

export function createEmptyBoard(boardSize = BOARD_SIZE) {
    return Array.from({ length: boardSize }, () => Array(boardSize).fill(EMPTY));
}

function isInside(boardSize, row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function collectLine(board, row, col, dx, dy, player) {
    const cells = [];
    let x = row + dx;
    let y = col + dy;
    while (isInside(board.length, x, y) && board[x][y] === player) {
        cells.push({ row: x, col: y });
        x += dx;
        y += dy;
    }
    return cells;
}

export function determineWinningSequence(board, row, col) {
    const player = board[row][col];
    if (player === EMPTY) {
        return null;
    }

    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    for (const [dx, dy] of directions) {
        const forward = collectLine(board, row, col, dx, dy, player);
        const backward = collectLine(board, row, col, -dx, -dy, player);
        const line = [{ row, col }, ...forward, ...backward];
        if (line.length >= 5) {
            return { sequence: line, direction: [dx, dy] };
        }
    }
    return null;
}

export function checkWin(board, row, col) {
    return determineWinningSequence(board, row, col) !== null;
}

export function checkDraw(board) {
    return board.every(row => row.every(cell => cell !== EMPTY));
}

function cloneSequence(sequence) {
    return sequence.map(cell => ({ row: cell.row, col: cell.col }));
}

function deepCloneBoard(board) {
    return board.map(row => row.slice());
}

function validateBoardState(board, boardSize) {
    if (!Array.isArray(board) || board.length !== boardSize) {
        throw new Error('Invalid board state length');
    }
    return board.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== boardSize) {
            throw new Error(`Invalid board row length at index ${rowIndex}`);
        }
        return row.map((cell, colIndex) => {
            if (cell !== EMPTY && cell !== BLACK && cell !== WHITE) {
                throw new Error(`Invalid cell value at [${rowIndex}, ${colIndex}]`);
            }
            return cell;
        });
    });
}

function hasNeighboringStone(board, row, col) {
    for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
            if (dx === 0 && dy === 0) continue;
            const x = row + dx;
            const y = col + dy;
            if (isInside(board.length, x, y) && board[x][y] !== EMPTY) {
                return true;
            }
        }
    }
    return false;
}

export function findWinningSequence(board) {
    for (let row = 0; row < board.length; row += 1) {
        for (let col = 0; col < board[row].length; col += 1) {
            if (board[row][col] === EMPTY) continue;
            const result = determineWinningSequence(board, row, col);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

export class GomokuEngine {
    constructor(options = {}) {
        const {
            boardSize = BOARD_SIZE,
            startingPlayer = BLACK,
            maxHistory = null
        } = options;

        this.boardSize = boardSize;
        this.startingPlayer = startingPlayer === WHITE ? WHITE : BLACK;
        this.maxHistory = Number.isInteger(maxHistory) && maxHistory > 0 ? maxHistory : null;

        this.reset();
    }

    reset() {
        this.board = createEmptyBoard(this.boardSize);
        this.currentPlayer = this.startingPlayer;
        this.gameOver = false;
        this.moveHistory = [];
        this.lastMove = null;
        this.winningSequence = [];
        return this;
    }

    getBoard() {
        return this.board;
    }

    getBoardSnapshot() {
        return deepCloneBoard(this.board);
    }

    getCurrentPlayer() {
        return this.currentPlayer;
    }

    isGameOver() {
        return this.gameOver;
    }

    getMoveHistory() {
        return this.moveHistory.map(move => ({ ...move }));
    }

    getLastMove() {
        return this.lastMove ? { ...this.lastMove } : null;
    }

    getWinningSequence() {
        return cloneSequence(this.winningSequence);
    }

    applyMove(row, col) {
        if (this.gameOver) {
            return { status: 'invalid', reason: 'game-over' };
        }
        if (!isInside(this.boardSize, row, col)) {
            return { status: 'invalid', reason: 'out-of-bounds' };
        }
        if (this.board[row][col] !== EMPTY) {
            return { status: 'invalid', reason: 'occupied' };
        }

        const player = this.currentPlayer;
        this.board[row][col] = player;
        const move = { row, col, player };
        this.moveHistory.push(move);
        if (this.maxHistory && this.moveHistory.length > this.maxHistory) {
            this.moveHistory.shift();
        }
        this.lastMove = move;

        const winData = determineWinningSequence(this.board, row, col);
        if (winData) {
            this.gameOver = true;
            this.winningSequence = winData.sequence;
            return {
                status: 'win',
                player,
                move: { row, col },
                winningSequence: cloneSequence(this.winningSequence)
            };
        }

        if (checkDraw(this.board)) {
            this.gameOver = true;
            this.winningSequence = [];
            return { status: 'draw', player, move: { row, col } };
        }

        this.currentPlayer = this.getOpponent(player);
        this.winningSequence = [];
        return { status: 'continue', player, move: { row, col } };
    }

    undoLastMove(steps = 1) {
        let remaining = Math.max(0, Math.floor(steps));
        if (remaining === 0) {
            return [];
        }

        const undone = [];
        while (remaining > 0 && this.moveHistory.length > 0) {
            const move = this.moveHistory.pop();
            this.board[move.row][move.col] = EMPTY;
            undone.push(move);
            remaining -= 1;
        }

        if (undone.length > 0) {
            const mostRecent = this.moveHistory[this.moveHistory.length - 1] || null;
            this.lastMove = mostRecent;
            this.currentPlayer = mostRecent ? this.getOpponent(mostRecent.player) : this.startingPlayer;
        }

        this.gameOver = false;
        this.winningSequence = [];
        return undone.map(move => ({ ...move }));
    }

    loadState(state = {}) {
        const {
            board,
            currentPlayer = this.startingPlayer,
            moveHistory = [],
            startingPlayer = this.startingPlayer
        } = state;

        if (!board) {
            throw new Error('Board state is required');
        }

        this.board = validateBoardState(board, this.boardSize);
        this.startingPlayer = startingPlayer === WHITE ? WHITE : BLACK;
        this.currentPlayer = currentPlayer === WHITE ? WHITE : BLACK;
        this.moveHistory = moveHistory.map(entry => {
            const normalized = {
                row: Number(entry.row),
                col: Number(entry.col),
                player: entry.player === WHITE ? WHITE : BLACK
            };
            if (!isInside(this.boardSize, normalized.row, normalized.col)) {
                throw new Error(`Move history entry out of bounds at [${entry.row}, ${entry.col}]`);
            }
            if (this.board[normalized.row][normalized.col] !== normalized.player) {
                throw new Error(`Move history entry does not match board state at [${entry.row}, ${entry.col}]`);
            }
            return normalized;
        });
        if (this.maxHistory && this.moveHistory.length > this.maxHistory) {
            this.moveHistory = this.moveHistory.slice(-this.maxHistory);
        }
        this.lastMove = this.moveHistory.length > 0 ? { ...this.moveHistory[this.moveHistory.length - 1] } : null;

        const winData = findWinningSequence(this.board);
        if (winData) {
            this.gameOver = true;
            this.winningSequence = winData.sequence;
        } else if (checkDraw(this.board)) {
            this.gameOver = true;
            this.winningSequence = [];
        } else {
            this.gameOver = false;
            this.winningSequence = [];
        }

        return this;
    }

    toJSON() {
        return {
            board: this.getBoardSnapshot(),
            currentPlayer: this.currentPlayer,
            moveHistory: this.getMoveHistory(),
            startingPlayer: this.startingPlayer,
            gameOver: this.gameOver,
            winningSequence: cloneSequence(this.winningSequence)
        };
    }

    clone(options = {}) {
        const clone = new GomokuEngine({
            boardSize: options.boardSize ?? this.boardSize,
            startingPlayer: options.startingPlayer ?? this.startingPlayer,
            maxHistory: options.maxHistory ?? this.maxHistory
        });
        clone.loadState({
            board: this.board,
            currentPlayer: this.currentPlayer,
            moveHistory: this.moveHistory,
            startingPlayer: this.startingPlayer
        });
        clone.gameOver = this.gameOver;
        clone.winningSequence = cloneSequence(this.winningSequence);
        return clone;
    }

    getAvailableMoves(options = {}) {
        const { vicinityOnly = true } = options;
        const moves = [];
        let hasStone = false;

        for (let row = 0; row < this.boardSize; row += 1) {
            for (let col = 0; col < this.boardSize; col += 1) {
                const cell = this.board[row][col];
                if (cell === EMPTY) {
                    if (!vicinityOnly || hasNeighboringStone(this.board, row, col)) {
                        moves.push({ row, col });
                    }
                } else {
                    hasStone = true;
                }
            }
        }

        if (!hasStone) {
            const center = Math.floor(this.boardSize / 2);
            return [{ row: center, col: center }];
        }

        if (vicinityOnly && moves.length === 0) {
            return this.getAvailableMoves({ vicinityOnly: false });
        }

        return moves;
    }

    static fromState(state, options = {}) {
        const boardSize = options.boardSize ?? (Array.isArray(state.board) ? state.board.length : BOARD_SIZE);
        const engine = new GomokuEngine({
            boardSize,
            startingPlayer: options.startingPlayer ?? state.startingPlayer ?? BLACK,
            maxHistory: options.maxHistory ?? null
        });
        engine.loadState(state);
        return engine;
    }

    getOpponent(player = this.currentPlayer) {
        return player === BLACK ? WHITE : BLACK;
    }
}
