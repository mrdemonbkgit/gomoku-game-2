/**
 * Gomoku Game Logic
 * This script implements a basic Gomoku (Five in a Row) game.
 */

// Constants
const BOARD_SIZE = 15; // Size of the game board (15x15)
const EMPTY = 0; // Represents an empty cell
const BLACK = 1; // Represents a black stone
const WHITE = 2; // Represents a white stone

// Game state variables
let board = []; // 2D array representing the game board
let currentPlayer = BLACK; // Current player (starts with Black)
let gameOver = false; // Flag to indicate if the game has ended

// DOM elements
const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const newGameButton = document.getElementById('new-game');

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
 * Handle cell click event
 * @param {Event} event - The click event object
 */
function handleCellClick(event) {
    if (gameOver) return; // Ignore clicks if the game is over

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (board[row][col] === EMPTY) {
        // Place the stone on the board
        board[row][col] = currentPlayer;
        event.target.classList.add(currentPlayer === BLACK ? 'black' : 'white');
        log(`Player ${currentPlayer} placed a stone at (${row}, ${col})`);

        // Check for win or draw
        if (checkWin(row, col)) {
            gameOver = true;
            statusElement.textContent = `Player ${currentPlayer === BLACK ? 'Black' : 'White'} wins!`;
            log(`Player ${currentPlayer} wins`);
        } else if (checkDraw()) {
            gameOver = true;
            statusElement.textContent = 'It\'s a draw!';
            log('Game ended in a draw');
        } else {
            // Switch to the other player
            currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
            updateStatus();
        }
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
    statusElement.textContent = `Current player: ${currentPlayer === BLACK ? 'Black' : 'White'}`;
}

/**
 * Reset the game to its initial state
 */
function resetGame() {
    // Clear the board data structure
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
    currentPlayer = BLACK;
    gameOver = false;
    updateStatus();

    // Clear the visual board
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('black', 'white');
    });

    log('Game reset');
}

// Event listener for the New Game button
newGameButton.addEventListener('click', resetGame);

// Initialize the game
initializeBoard();
updateStatus();
log('Game started');