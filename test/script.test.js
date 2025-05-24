import { test } from 'node:test';
import assert from 'node:assert/strict';
import { board, currentPlayer, BLACK, WHITE, EMPTY, makeMove, checkWin, undo, resetGame } from '../script.js';

test('checkWin detects horizontal win', () => {
  resetGame();
  for (let i = 0; i < 5; i++) {
    board[0][i] = BLACK;
  }
  assert.equal(checkWin(0, 4), true);
});

test('checkWin detects vertical win', () => {
  resetGame();
  for (let i = 0; i < 5; i++) {
    board[i][0] = BLACK;
  }
  assert.equal(checkWin(4, 0), true);
});

test('checkWin detects diagonal win', () => {
  resetGame();
  for (let i = 0; i < 5; i++) {
    board[i][i] = BLACK;
  }
  assert.equal(checkWin(4, 4), true);
});

test('undo reverts board and current player', () => {
  resetGame();
  makeMove(0, 0); // Black
  makeMove(0, 1); // White
  undo();
  assert.equal(board[0][1], EMPTY);
  assert.equal(currentPlayer, WHITE);
});
