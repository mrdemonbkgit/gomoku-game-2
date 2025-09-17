import { describe, expect, it } from 'vitest';
import AIPlayer from '../ai-player.js';
import { createEmptyBoard } from '../src/engine/game.js';
import { BLACK, WHITE, EMPTY } from '../config.js';

describe('AIPlayer', () => {
    it('takes immediate winning move on easy difficulty', () => {
        const board = createEmptyBoard();
        board[5][5] = WHITE;
        board[5][6] = WHITE;
        board[5][7] = WHITE;
        board[5][8] = WHITE;
        board[5][4] = BLACK; // block the left extension so only (5,9) wins

        const ai = new AIPlayer('easy', WHITE, { random: () => 0 });
        const move = ai.makeMove(board);
        expect(move).toEqual({ row: 5, col: 9 });
    });

    it('blocks opponent winning threat on easy difficulty', () => {
        const board = createEmptyBoard();
        board[10][2] = BLACK;
        board[10][3] = BLACK;
        board[10][4] = BLACK;
        const ai = new AIPlayer('easy', WHITE, { random: () => 0 });
        const move = ai.makeMove(board);
        const blockingTargets = [
            { row: 10, col: 1 },
            { row: 10, col: 6 }
        ];
        expect(blockingTargets).toContainEqual(move);
    });
    it('does not mutate the board when evaluating moves', () => {
        const board = createEmptyBoard();
        board[7][7] = BLACK;
        const snapshot = JSON.stringify(board);

        const ai = new AIPlayer('medium', WHITE, { random: () => 0.5 });
        ai.makeMove(board);
        expect(JSON.stringify(board)).toBe(snapshot);
    });

    it('returns a valid move on hard difficulty', () => {
        const board = createEmptyBoard();
        board[7][7] = BLACK;
        board[7][8] = WHITE;
        board[6][7] = BLACK;

        const ai = new AIPlayer('hard', WHITE, { random: () => 0.25 });
        const move = ai.makeMove(board);
        expect(move).toHaveProperty('row');
        expect(move).toHaveProperty('col');
        expect(board[move.row][move.col]).toBe(EMPTY);
    });
});

