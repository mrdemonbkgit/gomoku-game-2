import assert from 'node:assert/strict';
import { GomokuEngine, checkDraw, findWinningSequence } from '../src/engine/game.js';
import { BOARD_SIZE, EMPTY, BLACK, WHITE } from '../config.js';

function assertBoardCell(board, row, col, expected, message) {
    assert.equal(board[row][col], expected, message);
}

const engine = new GomokuEngine();
assert.equal(engine.getCurrentPlayer(), BLACK, 'Engine should start with black');
assert.equal(engine.isGameOver(), false, 'New engine should not be game over');

let outcome = engine.applyMove(7, 7);
assert.equal(outcome.status, 'continue', 'First move should continue');
assert.equal(outcome.player, BLACK, 'First move should be black');
assertBoardCell(engine.getBoard(), 7, 7, BLACK, 'Board should record black stone');
assert.equal(engine.getCurrentPlayer(), WHITE, 'Turn should switch to white');

outcome = engine.applyMove(7, 8);
assert.equal(outcome.player, WHITE, 'Second move should be white');
assert.equal(outcome.status, 'continue', 'Second move should continue');
assert.equal(engine.getMoveHistory().length, 2, 'History should record two moves');

const undone = engine.undoLastMove(2);
assert.equal(undone.length, 2, 'Undo should return two moves');
assert.equal(engine.getMoveHistory().length, 0, 'History should be cleared after undo');
assert.equal(engine.getBoard()[7][7], EMPTY, 'Undo should clear first cell');
assert.equal(engine.getBoard()[7][8], EMPTY, 'Undo should clear second cell');
assert.equal(engine.getCurrentPlayer(), BLACK, 'Turn should reset to black');

const winningState = createWinningBoard();
engine.loadState({
    board: winningState.board,
    currentPlayer: BLACK,
    moveHistory: winningState.moves
});
const winSequence = findWinningSequence(engine.getBoard());
assert(winSequence, 'Winning sequence should be detected');
assert.equal(engine.isGameOver(), true, 'Engine should report game over after loading win');
assert.equal(engine.getWinningSequence().length, 5, 'Winning sequence should contain five stones');

const serialized = engine.toJSON();
const roundTrip = GomokuEngine.fromState(serialized, { maxHistory: 10 });
assert.equal(roundTrip.isGameOver(), true, 'Round trip engine should preserve game over');
assert.equal(roundTrip.getWinningSequence().length, 5, 'Round trip should preserve winning sequence');

const availableMoves = roundTrip.getAvailableMoves();
assert(Array.isArray(availableMoves) && availableMoves.length > 0, 'Available moves should be returned');
const centeredEngine = new GomokuEngine();
const centerMoves = centeredEngine.getAvailableMoves();
assert.equal(centerMoves.length, 1, 'Empty board should yield one center move');
assert.equal(centerMoves[0].row, Math.floor(BOARD_SIZE / 2), 'Center move row should be midpoint');
assert.equal(centerMoves[0].col, Math.floor(BOARD_SIZE / 2), 'Center move col should be midpoint');

const drawState = buildDrawState();
const drawEngine = GomokuEngine.fromState(drawState);
assert.equal(drawEngine.isGameOver(), true, 'Draw state should set game over');
assert.equal(checkDraw(drawEngine.getBoard()), true, 'Helper should detect draw');

console.log('Engine smoke tests passed');

function createWinningBoard() {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    const moves = [];
    for (let i = 0; i < 5; i += 1) {
        const col = i + 3;
        board[7][col] = BLACK;
        moves.push({ row: 7, col, player: BLACK });
    }
    return { board, moves };
}

function buildDrawState() {
    const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => (row + col) % 2 === 0 ? BLACK : WHITE)
    );
    return {
        board,
        currentPlayer: BLACK,
        moveHistory: []
    };
}
