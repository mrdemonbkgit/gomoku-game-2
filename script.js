/**
 * Gomoku Game Logic
 * This script implements a basic Gomoku (Five in a Row) game.
 */

import AIPlayer from './ai-player.js';

// Constants
const BOARD_SIZE = 15; // Size of the game board (15x15)
const EMPTY = 0; // Represents an empty cell
const BLACK = 1; // Represents a black stone
const WHITE = 2; // Represents a white stone
const MAX_HISTORY = 50; // Maximum number of moves to store in history

// Game state variables
let board = []; // 2D array representing the game board
let currentPlayer = BLACK; // Current player (starts with Black)
let gameOver = false; // Flag to indicate if the game has ended
let moveHistory = [];
let lastMove = null;
let gameMode = 'human'; // 'human' or 'ai'
let aiPlayer = null;
let aiDifficulty = 'easy';

// DOM elements
const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const newGameButton = document.getElementById('new-game');
const undoButton = document.getElementById('undo');
const gameModeSelect = document.getElementById('game-mode');
const aiOptionsDiv = document.getElementById('ai-options');
const aiDifficultySelect = document.getElementById('ai-difficulty');

/**
 * Logging function for debugging
 * @param {string} message - The message to be logged
 */
function log(message) {
    console.log(`[Gomoku] ${message}`);
}

/**
 * Initialize the game board
 * Creates the visual board and sets up the data structure
 */
function initializeBoard() {
    // Create a 2D array filled with EMPTY cells
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));

    // Create the visual board using DOM elements
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
    log('Board initialized');
}

/**
 * Handle a cell click event on the game board
 * This function is called every time a player clicks on a cell
 * 
 * @param {Event} event - The click event object
 */
function handleCellClick(event) {
    if (gameOver || (gameMode === 'ai' && currentPlayer !== BLACK)) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (board[row][col] === EMPTY) {
        makeMove(row, col);

        if (!gameOver && gameMode === 'ai') {
            // AI's turn
            setTimeout(makeAIMove, 500); // Add a small delay for better UX
        }
    }
}

/**
 * Makes a move for the AI player.
 */
function makeAIMove() {
    const move = aiPlayer.makeMove(board);
    if (move) {
        makeMove(move.row, move.col);
    }
}

/**
 * Makes a move in the game by placing a stone at the specified row and column.
 * Updates the game status and checks for a win or draw.
 *
 * @param {number} row - The row index of the move.
 * @param {number} col - The column index of the move.
 * @returns {void}
 */
function makeMove(row, col) {
    placeStone(row, col);
    saveMove(row, col);

    if (checkWin(row, col)) {
        gameOver = true;
        statusElement.textContent = `Player ${currentPlayer === BLACK ? 'Black' : 'White'} wins!`;
        log(`Player ${currentPlayer} wins`);
    } else if (checkDraw()) {
        gameOver = true;
        statusElement.textContent = 'It\'s a draw!';
        log('Game ended in a draw');
    } else {
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        updateStatus();
    }
}

/**
 * Check for a win condition
 * @param {number} row - The row of the last placed stone
 * @param {number} col - The column of the last placed stone
 * @returns {boolean} True if the current player has won, false otherwise
 */
function checkWin(row, col) {
    // Directions to check: horizontal, vertical, diagonal, anti-diagonal
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
        let count = 1; // Start with 1 for the current stone
        // Check in both directions along the current line
        count += countStones(row, col, dx, dy);
        count += countStones(row, col, -dx, -dy);

        if (count >= 5) return true; // Win condition met
    }

    return false;
}

/**
 * Count consecutive stones in a direction
 * @param {number} row - Starting row
 * @param {number} col - Starting column
 * @param {number} dx - X direction (-1, 0, or 1)
 * @param {number} dy - Y direction (-1, 0, or 1)
 * @returns {number} The count of consecutive stones of the current player
 */
function countStones(row, col, dx, dy) {
    let count = 0;
    let x = row + dx;
    let y = col + dy;

    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[x][y] === currentPlayer) {
        count++;
        x += dx;
        y += dy;
    }

    return count;
}

/**
 * Check for a draw condition
 * @returns {boolean} True if the game is a draw, false otherwise
 */
function checkDraw() {
    return board.every(row => row.every(cell => cell !== EMPTY));
}

/**
 * Update the status display
 */
function updateStatus() {
    if (gameMode === 'human' || (gameMode === 'ai' && currentPlayer === BLACK)) {
        statusElement.textContent = `Current player: ${currentPlayer === BLACK ? 'Black' : 'White'}`;
    } else {
        statusElement.textContent = "AI is thinking...";
    }
}

/**
 * Reset the game to its initial state
 * This function is called when the "New Game" button is clicked
 */
function resetGame() {
    // Reset the game board to all empty cells
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
    
    // Set Black as the starting player
    currentPlayer = BLACK;
    
    // Reset the game over flag
    gameOver = false;
    
    // Clear the move history
    moveHistory = [];

    // Reset the lastMove reference
    lastMove = null;
    
    // Update the game status display
    updateStatus();

    // Remove stone classes and last-move highlight from all cells
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('black', 'white', 'last-move');
    });

    // Update the state of the Undo button
    updateUndoButton();

    if (gameMode === 'ai') {
        aiPlayer = new AIPlayer(aiDifficulty, WHITE);
        statusElement.textContent = "Your turn (Black)";
    } else {
        aiPlayer = null;
        statusElement.textContent = "Current player: Black";
    }

    // Log the game reset for debugging purposes
    log('Game reset');
}

/**
 * Toggles the game mode between 'human' and 'ai'.
 * If the current game mode is 'human', it changes it to 'ai',
 * and if the current game mode is 'ai', it changes it to 'human'.
 * It also resets the game.
 */
function toggleGameMode() {
    gameMode = gameMode === 'human' ? 'ai' : 'human';
    resetGame();
}

/**
 * Save the current move to history
 * @param {number} row - The row of the placed stone
 * @param {number} col - The column of the placed stone
 */
function saveMove(row, col) {
    moveHistory.push({ row, col, player: currentPlayer });

    // Limit the history size
    if (moveHistory.length > MAX_HISTORY) {
        moveHistory.shift();
    }

    updateUndoButton();
}

/**
 * Undo the last move
 */
function undo() {
    if (moveHistory.length > 0) {
        // Undo the last move (AI's move in AI mode)
        lastMove = moveHistory.pop();
        board[lastMove.row][lastMove.col] = EMPTY;
        
        // Remove the stone and highlight from the undone move
        const cell = document.querySelector(`.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
        cell.classList.remove('black', 'white', 'last-move');

        // If in AI mode and there's another move, undo the human's move too
        if (gameMode === 'ai' && moveHistory.length > 0) {
            const humanMove = moveHistory.pop();
            board[humanMove.row][humanMove.col] = EMPTY;
            
            // Remove the stone and highlight from the human's move
            const humanCell = document.querySelector(`.cell[data-row="${humanMove.row}"][data-col="${humanMove.col}"]`);
            humanCell.classList.remove('black', 'white', 'last-move');
        }

        // Update the lastMove reference
        lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

        // If there's a previous move, highlight it
        if (lastMove) {
            highlightLastMove(lastMove.row, lastMove.col);
            // Set the current player to the opposite of the last move's player
            currentPlayer = lastMove.player === BLACK ? WHITE : BLACK;
        } else {
            // If no moves left, set currentPlayer back to BLACK (starting player)
            currentPlayer = BLACK;
        }

        // Update the UI
        updateStatus();
        updateUndoButton();

        // Reset game over state if necessary
        if (gameOver) {
            gameOver = false;
        }

        log('Move(s) undone');
    }
}
/**
 * Update the visual board based on the current game state
 */
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / BOARD_SIZE);
        const col = index % BOARD_SIZE;
        cell.classList.remove('black', 'white');
        if (board && board[row] && board[row][col] === BLACK) {
            cell.classList.add('black');
        } else if (board && board[row] && board[row][col] === WHITE) {
            cell.classList.add('white');
        }
    });
}

/**
 * Update the state of Undo button
 */
function updateUndoButton() {
    undoButton.disabled = moveHistory.length === 0;
}

/**
 * Place a stone on the board and update the game state
 * @param {number} row - The row where the stone is placed
 * @param {number} col - The column where the stone is placed
 */
function placeStone(row, col) {
    board[row][col] = currentPlayer;
    updateCellAppearance(row, col);
    highlightLastMove(row, col);
    log(`Player ${currentPlayer} placed a stone at (${row}, ${col})`);
}

/**
 * Update the appearance of a cell on the board
 * @param {number} row - The row of the cell to update
 * @param {number} col - The column of the cell to update
 */
function updateCellAppearance(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add(currentPlayer === BLACK ? 'black' : 'white');
}

/**
 * Highlight the last moved stone and remove highlight from the previous one
 * @param {number} row - The row of the last move
 * @param {number} col - The column of the last move
 */
function highlightLastMove(row, col) {
    // Remove highlight from the previous last move
    if (lastMove) {
        const prevCell = document.querySelector(`.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`);
        prevCell.classList.remove('last-move');
    }

    // Add highlight to the new last move
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('last-move');

    // Update the lastMove reference
    lastMove = { row, col };
}

function handleGameModeChange() {
    gameMode = gameModeSelect.value;
    aiOptionsDiv.style.display = gameMode === 'ai' ? 'block' : 'none';
    resetGame();
}

function handleAIDifficultyChange() {
    aiDifficulty = aiDifficultySelect.value;
    if (gameMode === 'ai' && aiPlayer) {
        aiPlayer.difficulty = aiDifficulty;
    }
}


function initializeGame() {
    initializeBoard();
    setupEventListeners();
    resetGame();
}

function setupEventListeners() {
    newGameButton.addEventListener('click', resetGame);
    undoButton.addEventListener('click', undo);
    gameModeSelect.addEventListener('change', handleGameModeChange);
    aiDifficultySelect.addEventListener('change', handleAIDifficultyChange);
}

initializeGame();