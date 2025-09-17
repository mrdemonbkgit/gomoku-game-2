import { describe, expect, it, beforeEach } from 'vitest';
import { GomokuEngine, checkDraw, determineWinningSequence } from '../src/engine/game.js';
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
});
