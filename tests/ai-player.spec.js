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

    it('emits telemetry metrics on easy difficulty', () => {
        const board = createEmptyBoard();
        const events = [];
        const ai = new AIPlayer('easy', WHITE, {
            random: () => 0,
            telemetry: entry => events.push(entry)
        });
        const move = ai.makeMove(board);
        expect(move).toBeTruthy();
        expect(events.length).toBe(1);
        const [event] = events;
        expect(event.event).toBe('move');
        expect(event.player).toBe('white');
        expect(event.strategy).toBe('easy');
        expect(event.candidateCount).toBeGreaterThan(0);
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('reports telemetry from hard difficulty search', () => {
        const board = createEmptyBoard();
        board[7][7] = BLACK;
        board[7][8] = WHITE;
        board[6][7] = BLACK;
        board[8][8] = WHITE;

        const events = [];
        const ai = new AIPlayer('hard', WHITE, {
            random: () => 0.5,
            telemetry: entry => events.push(entry)
        });
        const move = ai.makeMove(board);
        expect(move).toBeTruthy();
        expect(events.length).toBe(1);
        const event = events[0];
        expect(event.strategy).toBe('hard');
        expect(event.profile ?? null).toBeNull();
        expect(event.candidateCount).toBeGreaterThan(0);
        expect(event.nodesEvaluated).toBeGreaterThan(0);
        expect(event.searchDepth).toBe(3);
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('keeps hard candidate limit when no critical threats', () => {
        const board = createEmptyBoard();
        board[7][7] = WHITE;
        const ai = new AIPlayer('hard', WHITE, { random: () => 0 });
        const baseLimit = 8;
        const limit = ai.getAdaptiveCandidateLimit(board, WHITE, baseLimit);
        expect(limit).toBe(baseLimit);
    });

    it('expands hard candidate limit when opponent threatens', () => {
        const board = createEmptyBoard();
        board[5][5] = BLACK;
        board[5][6] = BLACK;
        board[5][7] = BLACK;
        board[5][8] = BLACK;
        const ai = new AIPlayer('hard', WHITE, { random: () => 0 });
        const expanded = ai.getAdaptiveCandidateLimit(board, WHITE, 8);
        expect(expanded).toBeGreaterThan(8);
    });

    it('throws when provided a malformed board state', () => {
        const ai = new AIPlayer('easy', BLACK);
        expect(() => ai.makeMove([[BLACK]])).toThrow('Invalid board state');
    });

    it('hard difficulty seizes immediate winning move', () => {
        const board = createEmptyBoard();
        board[5][4] = WHITE;
        board[5][5] = BLACK;
        board[5][6] = BLACK;
        board[5][7] = BLACK;
        board[5][8] = BLACK;
        const ai = new AIPlayer('hard', BLACK, { random: () => 0 });
        const move = ai.makeMove(board);
        expect(move).toEqual({ row: 5, col: 9 });
    });

    it('hard difficulty blocks the opponent when a win is threatened', () => {
        const board = createEmptyBoard();
        board[8][2] = BLACK;
        board[8][3] = WHITE;
        board[8][4] = WHITE;
        board[8][5] = WHITE;
        board[8][6] = WHITE;
        const ai = new AIPlayer('hard', BLACK, { random: () => 0 });
        const move = ai.makeMove(board);
        expect(move).toEqual({ row: 8, col: 7 });
    });

    it('continues evaluating even if telemetry callbacks throw', () => {
        const board = createEmptyBoard();
        board[7][7] = BLACK;
        const ai = new AIPlayer('medium', BLACK, {
            random: () => 0.3,
            telemetry: () => {
                throw new Error('telemetry failed');
            }
        });
        const snapshot = JSON.stringify(board);
        const move = ai.makeMove(board);
        expect(move).toBeTruthy();
        expect(JSON.stringify(board)).toBe(snapshot);
    });

    it('honors behavior overrides for hard search depth and telemetry profile', () => {
        const board = createEmptyBoard();
        board[7][7] = BLACK;
        board[6][7] = WHITE;
        board[8][8] = WHITE;

        const events = [];
        const ai = new AIPlayer('hard', WHITE, {
            random: () => 0.4,
            telemetry: entry => events.push(entry),
            behavior: {
                name: 'depth-4',
                hardSearchDepth: 4,
                hardCandidateLimit: 10
            }
        });
        const move = ai.makeMove(board);
        expect(move).toBeTruthy();
        expect(events.length).toBe(1);
        const event = events[0];
        expect(event.profile).toBe('depth-4');
        expect(event.searchDepth).toBe(4);
        expect(event.strategy).toBe('hard');
    });

});
