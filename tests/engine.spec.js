import { describe, expect, it, beforeEach } from 'vitest';
import { GomokuEngine, checkDraw, determineWinningSequence, createEmptyBoard } from '../src/engine/game.js';
import { BLACK, WHITE, EMPTY, BOARD_SIZE } from '../config.js';

describe('GomokuEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new GomokuEngine();
    });

    it('applies moves and alternates current player', () => {
        const first = engine.applyMove(7, 7);
        expect(first.status).toBe('continue');
        expect(first.player).toBe(BLACK);
        expect(engine.getBoard()[7][7]).toBe(BLACK);
        expect(engine.getCurrentPlayer()).toBe(WHITE);

        const second = engine.applyMove(7, 8);
        expect(second.status).toBe('continue');
        expect(second.player).toBe(WHITE);
        expect(engine.getBoard()[7][8]).toBe(WHITE);
        expect(engine.getMoveHistory()).toHaveLength(2);
    });

    it('undoLastMove reverts board state and history', () => {
        engine.applyMove(7, 7);
        engine.applyMove(7, 8);

        const undone = engine.undoLastMove(2);
        expect(undone).toHaveLength(2);
        expect(engine.getMoveHistory()).toHaveLength(0);
        expect(engine.getBoard()[7][7]).toBe(EMPTY);
        expect(engine.getBoard()[7][8]).toBe(EMPTY);
        expect(engine.getCurrentPlayer()).toBe(BLACK);
    });

    it('detects winning move via applyMove', () => {
        const board = engine.getBoard();
        for (let col = 3; col < 7; col += 1) {
            board[7][col] = BLACK;
        }
        engine.moveHistory = [3, 4, 5, 6].map(col => ({ row: 7, col, player: BLACK }));
        engine.lastMove = engine.moveHistory[engine.moveHistory.length - 1];
        engine.currentPlayer = BLACK;
        engine.gameOver = false;

        const outcome = engine.applyMove(7, 7);
        expect(outcome.status).toBe('win');
        expect(engine.isGameOver()).toBe(true);
        const sequence = determineWinningSequence(engine.getBoard(), 7, 7);
        expect(sequence).not.toBeNull();
        expect(sequence.sequence).toHaveLength(5);
    });

    it('checkDraw identifies a filled board', () => {
        const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
            Array.from({ length: BOARD_SIZE }, (_, col) => ((row + col) % 2 === 0 ? BLACK : WHITE))
        );
        expect(checkDraw(board)).toBe(true);
    });

    it('rejects moves outside the board bounds', () => {
        const negative = engine.applyMove(-1, 0);
        expect(negative.status).toBe('invalid');
        expect(negative.reason).toBe('out-of-bounds');

        const beyond = engine.applyMove(BOARD_SIZE, BOARD_SIZE);
        expect(beyond.status).toBe('invalid');
        expect(beyond.reason).toBe('out-of-bounds');
    });

    it('prevents placing stones on occupied cells', () => {
        engine.applyMove(7, 7);
        const outcome = engine.applyMove(7, 7);
        expect(outcome.status).toBe('invalid');
        expect(outcome.reason).toBe('occupied');
    });

    it('blocks additional moves after the game is over', () => {
        const board = engine.getBoard();
        for (let col = 3; col < 7; col += 1) {
            board[7][col] = BLACK;
        }
        engine.moveHistory = [3, 4, 5, 6].map(col => ({ row: 7, col, player: BLACK }));
        engine.lastMove = engine.moveHistory[engine.moveHistory.length - 1];
        engine.currentPlayer = BLACK;

        const winning = engine.applyMove(7, 7);
        expect(winning.status).toBe('win');

        const followUp = engine.applyMove(0, 0);
        expect(followUp.status).toBe('invalid');
        expect(followUp.reason).toBe('game-over');
        expect(engine.getBoard()[0][0]).toBe(EMPTY);
    });

    it('returns only the centre move on an empty board when vicinity filtering is enabled', () => {
        const moves = engine.getAvailableMoves();
        expect(moves).toHaveLength(1);
        const [move] = moves;
        const centre = Math.floor(BOARD_SIZE / 2);
        expect(move).toEqual({ row: centre, col: centre });
    });

    it('limits vicinity moves to neighbours of existing stones', () => {
        const board = engine.getBoard();
        board[7][7] = BLACK;

        const moves = engine.getAvailableMoves();
        expect(moves).toContainEqual({ row: 6, col: 6 });
        expect(moves.some(move => move.row === 0 && move.col === 0)).toBe(false);
    });

    it('creates independent clones of game state', () => {
        engine.applyMove(7, 7);
        const clone = engine.clone();
        const cloneResult = clone.applyMove(7, 8);
        expect(cloneResult.status).toBe('continue');
        expect(engine.getBoard()[7][8]).toBe(EMPTY);
        expect(clone.getBoard()[7][8]).toBe(WHITE);
        expect(engine.getCurrentPlayer()).toBe(WHITE);
        expect(clone.getCurrentPlayer()).toBe(BLACK);
    });

    it('validates board and history consistency when loading state', () => {
        const board = createEmptyBoard();
        board[0][0] = BLACK;
        const state = {
            board,
            currentPlayer: WHITE,
            moveHistory: [{ row: 0, col: 0, player: WHITE }],
            startingPlayer: BLACK
        };
        expect(() => engine.loadState(state)).toThrow(/does not match board state/);
    });

    it('infers finished games from loaded state and exposes the winning sequence', () => {
        const board = createEmptyBoard();
        const moves = [];
        for (let col = 0; col < 5; col += 1) {
            board[4][col] = BLACK;
            moves.push({ row: 4, col, player: BLACK });
        }
        engine.loadState({
            board,
            currentPlayer: WHITE,
            moveHistory: moves,
            startingPlayer: BLACK
        });
        expect(engine.isGameOver()).toBe(true);
        const winningSequence = engine.getWinningSequence();
        expect(winningSequence).toHaveLength(5);
        expect(winningSequence[0]).toEqual({ row: 4, col: 0 });
    });


});
