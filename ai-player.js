/**
 * AIPlayer class for Gomoku game
 * Provides adaptive opponents across easy, medium, and hard difficulties.
 */
import { log, LOG_AI, EMPTY, BLACK, WHITE, BOARD_SIZE } from './config.js';

const EASY_CANDIDATE_LIMIT = 12;
const EASY_TOP_CHOICES = 3;
const MEDIUM_CANDIDATE_LIMIT = 12;
const MEDIUM_RESPONSE_LIMIT = 6;
const HARD_CANDIDATE_LIMIT = 8;
const HARD_SEARCH_DEPTH = 3;
const WIN_SCORE = 1_000_000;

const PATTERN_SCORES = {
    five: WIN_SCORE,
    openFour: 60000,
    semiOpenFour: 15000,
    openThree: 7000,
    semiOpenThree: 2000,
    openTwo: 800,
    semiOpenTwo: 250
};

function getTimestampMs() {
    if (typeof globalThis !== 'undefined' && globalThis.performance && typeof globalThis.performance.now === 'function') {
        return globalThis.performance.now();
    }
    return Date.now();
}

function toPlayerLabel(color) {
    return color === BLACK ? 'black' : 'white';
}

function cloneMove(move) {
    return move ? { row: move.row, col: move.col } : null;
}

class AIPlayer {
    constructor(difficulty, playerColor, options = {}) {
        const { random, telemetry } = options;
        this.difficulty = difficulty;
        this.playerColor = playerColor;
        this.random = typeof random === 'function' ? random : Math.random;
        this.telemetry = telemetry || null;
        log(LOG_AI, 'AI player created', { difficulty, playerColor });
    }

    createMetrics() {
        return {
            event: 'move',
            difficulty: this.difficulty,
            player: toPlayerLabel(this.playerColor),
            strategy: null,
            candidateCount: 0,
            decision: 'pending'
        };
    }

    emitTelemetry(metrics) {
        if (!this.telemetry) {
            return;
        }
        const payload = { ...metrics };
        if (metrics && metrics.move) {
            payload.move = cloneMove(metrics.move);
        }
        try {
            this.telemetry(payload);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log(LOG_AI, 'Telemetry callback failed', { error: message });
        }
    }

    countOccupiedCells(board) {
        let count = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] !== EMPTY) {
                    count += 1;
                }
            }
        }
        return count;
    }

    makeMove(board) {
        if (!Array.isArray(board) || board.length !== BOARD_SIZE || board[0].length !== BOARD_SIZE) {
            throw new Error('Invalid board state');
        }

        const metrics = this.telemetry ? this.createMetrics() : null;
        let startTime = null;
        let move = null;
        if (metrics) {
            metrics.boardOccupancy = this.countOccupiedCells(board);
            startTime = getTimestampMs();
        }

        log(LOG_AI, 'AI deciding move', { difficulty: this.difficulty });
        switch (this.difficulty) {
            case 'easy':
                move = this.makeEasyMove(board, metrics);
                break;
            case 'medium':
                move = this.makeMediumMove(board, metrics);
                break;
            case 'hard':
                move = this.makeHardMove(board, metrics);
                break;
            default:
                log(LOG_AI, 'Invalid difficulty level', { difficulty: this.difficulty });
                throw new Error('Invalid difficulty level');
        }

        if (metrics) {
            const elapsed = getTimestampMs() - startTime;
            metrics.durationMs = elapsed >= 0 ? elapsed : 0;
            metrics.move = cloneMove(move);
            metrics.result = move ? 'move-selected' : 'no-move';
            this.emitTelemetry(metrics);
        }

        return move;
    }

    makeEasyMove(board, metrics = null) {
        log(LOG_AI, 'Easy difficulty evaluating options');
        if (metrics) {
            metrics.strategy = 'easy';
        }
        const winningMove = this.findWinningMove(board, this.playerColor);
        if (winningMove) {
            log(LOG_AI, 'Easy difficulty finishing game', { move: winningMove });
            if (metrics) {
                metrics.decision = 'immediate-win';
                metrics.selectedScore = WIN_SCORE;
            }
            return winningMove;
        }

        const opponent = this.getOpponentColor();
        const blockingMove = this.findWinningMove(board, opponent);
        if (blockingMove) {
            log(LOG_AI, 'Easy difficulty blocking immediate threat', { move: blockingMove });
            if (metrics) {
                metrics.decision = 'block-threat';
                metrics.selectedScore = null;
            }
            return blockingMove;
        }

        const ranked = this.prepareCandidates(board, EASY_CANDIDATE_LIMIT);
        if (metrics) {
            metrics.candidateCount = ranked.length;
        }
        if (ranked.length > 0) {
            const selection = ranked.slice(0, Math.min(EASY_TOP_CHOICES, ranked.length));
            const choice = selection[Math.floor(this.random() * selection.length)];
            const move = { row: choice.row, col: choice.col };
            log(LOG_AI, 'Easy difficulty selecting from top candidates', { move });
            if (metrics) {
                metrics.decision = 'candidate';
                metrics.selectionPool = selection.length;
                metrics.selectedScore = typeof choice.score === 'number' ? choice.score : null;
            }
            return move;
        }

        log(LOG_AI, 'Easy difficulty falling back to random move');
        if (metrics) {
            metrics.decision = 'random-fallback';
            metrics.selectedScore = null;
        }
        return this.makeRandomMove(board);
    }

    makeMediumMove(board, metrics = null) {
        log(LOG_AI, 'Medium difficulty evaluating multi-step options');
        if (metrics) {
            metrics.strategy = 'medium';
            metrics.consideredCandidates = 0;
            metrics.responsesEvaluated = 0;
        }
        const winningMove = this.findWinningMove(board, this.playerColor);
        if (winningMove) {
            log(LOG_AI, 'Medium difficulty taking winning move', { move: winningMove });
            if (metrics) {
                metrics.decision = 'immediate-win';
                metrics.selectedScore = WIN_SCORE;
            }
            return winningMove;
        }

        const opponent = this.getOpponentColor();
        const blockingMove = this.findWinningMove(board, opponent);
        if (blockingMove) {
            log(LOG_AI, 'Medium difficulty blocking winning threat', { move: blockingMove });
            if (metrics) {
                metrics.decision = 'block-threat';
                metrics.selectedScore = null;
            }
            return blockingMove;
        }

        const candidates = this.prepareCandidates(board, MEDIUM_CANDIDATE_LIMIT);
        if (metrics) {
            metrics.candidateCount = candidates.length;
        }
        if (candidates.length === 0) {
            if (metrics) {
                metrics.decision = 'random-fallback';
                metrics.selectedScore = null;
            }
            return this.makeRandomMove(board);
        }

        let bestScore = -Infinity;
        let bestMove = null;

        for (const candidate of candidates) {
            if (metrics) {
                metrics.consideredCandidates += 1;
            }
            const { row, col } = candidate;
            board[row][col] = this.playerColor;

            let score;
            if (this.checkWinningMove(board, row, col, this.playerColor)) {
                score = WIN_SCORE;
            } else {
                const baseScore = this.evaluateBoard(board, this.playerColor);
                const opponentReplies = this.prepareCandidatesForPlayer(board, opponent, MEDIUM_RESPONSE_LIMIT);
                if (metrics) {
                    metrics.responsesEvaluated += opponentReplies.length;
                }
                let worstReply = baseScore;
                if (opponentReplies.length > 0) {
                    worstReply = Infinity;
                    for (const reply of opponentReplies) {
                        const replyScore = this.evaluateMove(board, reply.row, reply.col, opponent, this.playerColor);
                        worstReply = Math.min(worstReply, replyScore);
                    }
                }
                score = worstReply;
            }

            board[row][col] = EMPTY;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
        }

        if (bestMove) {
            log(LOG_AI, 'Medium difficulty selecting strategic move', { move: bestMove, score: bestScore });
            if (metrics) {
                metrics.decision = 'candidate';
                metrics.selectedScore = bestScore;
            }
            return bestMove;
        }

        log(LOG_AI, 'Medium difficulty falling back to random move');
        if (metrics) {
            metrics.decision = 'random-fallback';
            metrics.selectedScore = null;
        }
        return this.makeRandomMove(board);
    }

    makeHardMove(board, metrics = null) {
        log(LOG_AI, 'Hard difficulty running minimax search');
        if (metrics) {
            metrics.strategy = 'hard';
            metrics.searchDepth = HARD_SEARCH_DEPTH;
            metrics.consideredCandidates = 0;
            metrics.nodesEvaluated = 0;
            metrics.maxDepthReached = 0;
            metrics.prunedBranches = 0;
        }
        const winningMove = this.findWinningMove(board, this.playerColor);
        if (winningMove) {
            log(LOG_AI, 'Hard difficulty finishing with immediate win', { move: winningMove });
            if (metrics) {
                metrics.decision = 'immediate-win';
                metrics.selectedScore = WIN_SCORE;
            }
            return winningMove;
        }

        const opponent = this.getOpponentColor();
        const blockingMove = this.findWinningMove(board, opponent);
        if (blockingMove) {
            log(LOG_AI, 'Hard difficulty blocking opponent win before searching', { move: blockingMove });
            if (metrics) {
                metrics.decision = 'block-threat';
                metrics.selectedScore = null;
            }
            return blockingMove;
        }

        const candidates = this.prepareCandidates(board, HARD_CANDIDATE_LIMIT);
        if (metrics) {
            metrics.candidateCount = candidates.length;
        }
        if (candidates.length === 0) {
            if (metrics) {
                metrics.decision = 'random-fallback';
                metrics.selectedScore = null;
            }
            return this.makeRandomMove(board);
        }

        let bestScore = -Infinity;
        let bestMove = null;

        for (const candidate of candidates) {
            if (metrics) {
                metrics.consideredCandidates += 1;
            }
            const { row, col } = candidate;
            board[row][col] = this.playerColor;
            let score;
            if (this.checkWinningMove(board, row, col, this.playerColor)) {
                score = WIN_SCORE;
            } else {
                score = this.minimax(board, HARD_SEARCH_DEPTH - 1, false, -Infinity, Infinity, metrics, 1);
            }
            board[row][col] = EMPTY;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
        }

        if (bestMove) {
            log(LOG_AI, 'Hard difficulty move selected', { move: bestMove, score: bestScore });
            if (metrics) {
                metrics.decision = 'search';
                metrics.selectedScore = bestScore;
            }
            return bestMove;
        }

        log(LOG_AI, 'Hard difficulty falling back to medium heuristics');
        if (metrics) {
            metrics.decision = 'medium-fallback';
            metrics.selectedScore = null;
            metrics.fallbackStrategy = 'medium';
        }
        return this.makeMediumMove(board);
    }

    minimax(board, depth, maximizingPlayer, alpha, beta, metrics = null, currentDepth = 1) {
        if (metrics) {
            metrics.nodesEvaluated = (metrics.nodesEvaluated ?? 0) + 1;
            metrics.maxDepthReached = Math.max(metrics.maxDepthReached ?? 0, currentDepth);
        }
        if (depth === 0) {
            return this.evaluateBoard(board, this.playerColor);
        }

        const current = maximizingPlayer ? this.playerColor : this.getOpponentColor();
        const candidates = this.prepareCandidatesForPlayer(board, current, HARD_CANDIDATE_LIMIT);
        if (metrics) {
            metrics.maxBranchingFactor = Math.max(metrics.maxBranchingFactor ?? 0, candidates.length);
        }
        if (candidates.length === 0) {
            return this.evaluateBoard(board, this.playerColor);
        }

        let best = maximizingPlayer ? -Infinity : Infinity;

        for (const candidate of candidates) {
            const { row, col } = candidate;
            board[row][col] = current;

            let score;
            if (this.checkWinningMove(board, row, col, current)) {
                score = maximizingPlayer ? WIN_SCORE : -WIN_SCORE;
            } else {
                score = this.minimax(board, depth - 1, !maximizingPlayer, alpha, beta, metrics, currentDepth + 1);
            }

            board[row][col] = EMPTY;

            if (maximizingPlayer) {
                best = Math.max(best, score);
                alpha = Math.max(alpha, score);
                if (alpha >= beta) {
                    if (metrics) {
                        metrics.prunedBranches = (metrics.prunedBranches ?? 0) + 1;
                    }
                    break;
                }
            } else {
                best = Math.min(best, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) {
                    if (metrics) {
                        metrics.prunedBranches = (metrics.prunedBranches ?? 0) + 1;
                    }
                    break;
                }
            }
        }

        if (best === Infinity || best === -Infinity) {
            return this.evaluateBoard(board, this.playerColor);
        }

        return best;
    }

    evaluateBoard(board, perspective) {
        const opponent = this.getOpponentColor(perspective);
        const ownScore = this.scoreLinesForPlayer(board, perspective);
        const opponentScore = this.scoreLinesForPlayer(board, opponent);
        return ownScore - opponentScore;
    }

    scoreLinesForPlayer(board, player) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] !== player) continue;
                for (const [dx, dy] of directions) {
                    const prevRow = row - dx;
                    const prevCol = col - dy;
                    if (this.isInside(prevRow, prevCol) && board[prevRow][prevCol] === player) {
                        continue;
                    }

                    let length = 0;
                    let x = row;
                    let y = col;
                    while (this.isInside(x, y) && board[x][y] === player) {
                        length++;
                        x += dx;
                        y += dy;
                    }

                    const forwardOpen = this.isEmptyCell(board, x, y);
                    const backwardOpen = this.isEmptyCell(board, row - dx, col - dy);
                    score += this.scorePattern(length, backwardOpen, forwardOpen);
                }
            }
        }

        return score;
    }

    scorePattern(length, backwardOpen, forwardOpen) {
        if (length >= 5) {
            return PATTERN_SCORES.five;
        }

        const openEnds = (backwardOpen ? 1 : 0) + (forwardOpen ? 1 : 0);
        if (openEnds === 0) {
            return 0;
        }

        switch (length) {
            case 4:
                return openEnds === 2 ? PATTERN_SCORES.openFour : PATTERN_SCORES.semiOpenFour;
            case 3:
                return openEnds === 2 ? PATTERN_SCORES.openThree : PATTERN_SCORES.semiOpenThree;
            case 2:
                return openEnds === 2 ? PATTERN_SCORES.openTwo : PATTERN_SCORES.semiOpenTwo;
            default:
                return 0;
        }
    }

    prepareCandidates(board, limit, player = this.playerColor, perspective = this.playerColor) {
        const potentialMoves = this.findPotentialMoves(board);
        let candidates = potentialMoves;
        if (candidates.length === 0) {
            const center = Math.floor(BOARD_SIZE / 2);
            candidates = [{ row: center, col: center }];
        }
        const ranked = this.rankCandidates(board, candidates, player, perspective);
        return limit && ranked.length > limit ? ranked.slice(0, limit) : ranked;
    }

    prepareCandidatesForPlayer(board, player, limit) {
        const ranked = this.prepareCandidates(board, limit, player, this.playerColor);
        return ranked.map(({ row, col }) => ({ row, col }));
    }

    rankCandidates(board, candidates, player, perspective) {
        return candidates
            .map(move => ({
                row: move.row,
                col: move.col,
                score: this.evaluateMove(board, move.row, move.col, player, perspective)
            }))
            .sort((a, b) => b.score - a.score);
    }

    evaluateMove(board, row, col, player, perspective = this.playerColor) {
        board[row][col] = player;
        const score = this.evaluateBoard(board, perspective);
        board[row][col] = EMPTY;
        return score;
    }

    findEmptyCells(board) {
        const emptyCells = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === EMPTY) {
                    emptyCells.push({ row, col });
                }
            }
        }
        log(LOG_AI, 'Empty cells scanned', { count: emptyCells.length });
        return emptyCells;
    }

    makeRandomMove(board) {
        const emptyCells = this.findEmptyCells(board);
        if (emptyCells.length === 0) {
            log(LOG_AI, 'No available moves');
            return null;
        }
        const randomIndex = Math.floor(this.random() * emptyCells.length);
        const move = emptyCells[randomIndex];
        log(LOG_AI, 'Random move selected', { move });
        return move;
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

    findWinningMove(board, player) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === EMPTY && this.checkWinningMove(board, row, col, player)) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    checkWinningMove(board, row, col, player) {
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            count += this.countStonesInDirection(board, row, col, dx, dy, player);
            count += this.countStonesInDirection(board, row, col, -dx, -dy, player);
            if (count >= 5) {
                return true;
            }
        }
        return false;
    }

    countStonesInDirection(board, row, col, dx, dy, player) {
        let count = 0;
        let x = row + dx;
        let y = col + dy;
        while (this.isInside(x, y) && board[x][y] === player) {
            count++;
            x += dx;
            y += dy;
        }
        return count;
    }

    isEmptyCell(board, row, col) {
        return this.isInside(row, col) && board[row][col] === EMPTY;
    }

    isInside(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    getOpponentColor(player = this.playerColor) {
        return player === BLACK ? WHITE : BLACK;
    }
}

export default AIPlayer;

