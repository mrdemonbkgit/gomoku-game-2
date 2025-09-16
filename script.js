/**
 * Gomoku Game Logic
 * This script implements a basic Gomoku (Five in a Row) game.
 */

import AIPlayer from './ai-player.js';
import {
    BOARD_SIZE,
    EMPTY,
    BLACK,
    WHITE,
    MAX_HISTORY,
    LOG_GAME,
    LOG_MOVE,
    LOG_AI,
    LOG_ERROR,
    log
} from './config.js';

// Game state variables
let board = []; // 2D array representing the game board
let currentPlayer = BLACK; // Current player (starts with Black)
let gameOver = false; // Flag to indicate if the game has ended
let moveHistory = [];
let lastMove = null;
let winningSequence = [];
let systemThemeMediaQuery = null;
let storageAvailable = true;
let gameMode = 'human'; // 'human' or 'ai'
let aiPlayer = null;
let aiDifficulty = 'easy';

// DOM elements
const boardElement = document.getElementById('board');
const statusContainer = document.getElementById('status');
const statusMessageElement = document.getElementById('status-message');
const statusIndicatorElement = document.getElementById('status-indicator');
const newGameButton = document.getElementById('new-game');
const undoButton = document.getElementById('undo');
const gameModeSelect = document.getElementById('game-mode');
const aiOptionsDiv = document.getElementById('ai-options');
const aiDifficultySelect = document.getElementById('ai-difficulty');

const darkModeToggle = document.getElementById('dark-mode-toggle');
const gridToggle = document.getElementById('grid-toggle');

const THEME_STORAGE_KEY = 'gomoku-theme';
const GRID_STORAGE_KEY = 'gomoku-grid-visible';

function validateDomReferences() {
    const missingElements = [];

    if (!boardElement) missingElements.push('board');
    if (!statusContainer) missingElements.push('status');
    if (!statusMessageElement) missingElements.push('status-message');
    if (!statusIndicatorElement) missingElements.push('status-indicator');
    if (!newGameButton) missingElements.push('new-game');
    if (!undoButton) missingElements.push('undo');
    if (!gameModeSelect) missingElements.push('game-mode');
    if (!aiOptionsDiv) missingElements.push('ai-options');
    if (!aiDifficultySelect) missingElements.push('ai-difficulty');
    if (!darkModeToggle) missingElements.push('dark-mode-toggle');
    if (!gridToggle) missingElements.push('grid-toggle');

    if (missingElements.length > 0) {
        log(LOG_ERROR, 'Missing required DOM elements', { missingElements });
        throw new Error(`Required DOM elements are missing: ${missingElements.join(', ')}`);
    }
}

/**
 * Initialize the game board
 * Creates the visual board and sets up the data structure
 */
function initializeBoard() {
    boardElement.innerHTML = '';
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
    log(LOG_GAME, 'Board initialized', { boardSize: BOARD_SIZE });
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

    log(LOG_MOVE, 'Cell clicked', { row, col, currentPlayer });

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
    log(LOG_AI, 'AI is making a move', { difficulty: aiPlayer.difficulty });
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

    log(LOG_MOVE, 'Move made', { player: currentPlayer, row, col });

    const hasWon = checkWin(row, col);
    if (hasWon) {
        gameOver = true;
        highlightWinningSequence(winningSequence);
        const winningPlayer = currentPlayer === BLACK ? 'Black' : 'White';
        setStatus(`Player ${winningPlayer} wins!`, currentPlayer === BLACK ? 'black' : 'white');
        log(LOG_GAME, 'Game ended', { winner: winningPlayer });
    } else if (checkDraw()) {
        gameOver = true;
        setStatus('It\'s a draw!', 'neutral');
        log(LOG_GAME, 'Game ended in a draw');
    } else {
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        updateStatus();
    }
}

/**
 * Check for a win condition
 * @param {number} row - The row of the last placed stone
 * @param {number} col - The column of the last placed stone
 * @returns {boolean} True if the move creates a five-stone line, false otherwise
 */
function checkWin(row, col) {
    const result = determineWinningSequence(row, col);
    if (result) {
        winningSequence = result.sequence.map(position => ({ row: position.row, col: position.col }));
        log(LOG_GAME, 'Win condition met', { row, col, direction: result.direction, sequence: winningSequence });
        return true;
    }

    winningSequence = [];
    return false;
}

/**
 * Determine the winning sequence (if any) originating from the last move.
 * @param {number} row - The row of the last placed stone
 * @param {number} col - The column of the last placed stone
 * @returns {{sequence: Array<{row: number, col: number}>, direction: [number, number]}|null}
 */
function determineWinningSequence(row, col) {
    const player = board[row][col];
    if (player === EMPTY) {
        return null;
    }

    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
        const forward = collectLineCells(row, col, dx, dy, player);
        const backward = collectLineCells(row, col, -dx, -dy, player);
        const line = [{ row, col }, ...forward, ...backward];

        if (line.length >= 5) {
            return { sequence: line, direction: [dx, dy] };
        }
    }

    return null;
}


/**
 * Collect consecutive stones for a player in a given direction.
 * @param {number} row - Starting row
 * @param {number} col - Starting column
 * @param {number} dx - X direction (-1, 0, or 1)
 * @param {number} dy - Y direction (-1, 0, or 1)
 * @param {number} player - The player identifier
 * @returns {Array<{row: number, col: number}>} Collected cells in the specified direction
 */
function collectLineCells(row, col, dx, dy, player) {
    const cells = [];
    let x = row + dx;
    let y = col + dy;

    while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[x][y] === player) {
        cells.push({ row: x, col: y });
        x += dx;
        y += dy;
    }

    return cells;
}

/**
 * Check for a draw condition
 * @returns {boolean} True if the game is a draw, false otherwise
 */
function checkDraw() {
    const isDraw = board.every(row => row.every(cell => cell !== EMPTY));
    if (isDraw) {
        log(LOG_GAME, 'Draw condition met');
    }
    return isDraw;
}

function setStatus(message, indicatorState = 'neutral') {
    if (statusMessageElement) {
        statusMessageElement.textContent = message;
    }
    if (statusIndicatorElement) {
        statusIndicatorElement.dataset.state = indicatorState || 'neutral';
    }
    if (statusContainer) {
        statusContainer.dataset.state = indicatorState || 'neutral';
    }
}

/**
 * Update the status display
 */
function updateStatus() {
    let message;
    let indicatorState;

    if (gameMode === 'human') {
        const playerName = currentPlayer === BLACK ? 'Black' : 'White';
        message = `Current player: ${playerName}`;
        indicatorState = currentPlayer === BLACK ? 'black' : 'white';
    } else if (currentPlayer === BLACK) {
        message = 'Your turn (Black)';
        indicatorState = 'black';
    } else {
        message = 'AI is thinking...';
        indicatorState = 'ai';
    }

    setStatus(message, indicatorState);
    log(LOG_GAME, 'Status updated', {
        message,
        currentPlayer: currentPlayer === BLACK ? 'Black' : 'White',
        gameMode
    });
}

/**
 * Reset the game to its initial state
 * This function is called when the "New Game" button is clicked
 */
function resetGame() {
    syncAIOptionsVisibility();

    clearWinningHighlight();

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
    
    // Remove stone classes and highlights from all cells
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('black', 'white', 'last-move', 'winning', 'placed');
    });

    // Update the state of the Undo button
    updateUndoButton();

    if (gameMode === 'ai') {
        aiPlayer = new AIPlayer(aiDifficulty, WHITE);
    } else {
        aiPlayer = null;
    }

    // Update the game status display
    updateStatus();

    log(LOG_GAME, 'Game reset', { gameMode, aiDifficulty });
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
    log(LOG_MOVE, 'Move saved to history', { row, col, player: currentPlayer });
}

/**
 * Undo the last move
 */
function undo() {
    if (moveHistory.length > 0) {
        clearWinningHighlight();
        // Undo the last move (AI's move in AI mode)
        const lastMoveEntry = moveHistory.pop();
        board[lastMoveEntry.row][lastMoveEntry.col] = EMPTY;

        // Remove the stone and highlight from the undone move
        const cell = document.querySelector(`.cell[data-row="${lastMoveEntry.row}"][data-col="${lastMoveEntry.col}"]`);
        if (cell) {
            cell.classList.remove('black', 'white', 'last-move', 'winning', 'placed');
        }

        let undoneMovesCount = 1;

        // If in AI mode and there's another move, undo the human's move too
        if (gameMode === 'ai' && moveHistory.length > 0) {
            const humanMove = moveHistory.pop();
            board[humanMove.row][humanMove.col] = EMPTY;

            // Remove the stone and highlight from the human's move
            const humanCell = document.querySelector(`.cell[data-row="${humanMove.row}"][data-col="${humanMove.col}"]`);
            if (humanCell) {
                humanCell.classList.remove('black', 'white', 'last-move', 'winning', 'placed');
            }

            undoneMovesCount = 2;
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

        log(LOG_MOVE, 'Move(s) undone', { undoneMovesCount });
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
        cell.classList.remove('black', 'white', 'winning', 'placed');
        if (board && board[row] && board[row][col] === BLACK) {
            cell.classList.add('black');
        } else if (board && board[row] && board[row][col] === WHITE) {
            cell.classList.add('white');
        }
    });

    if (winningSequence.length > 0) {
        winningSequence.forEach(position => {
            const cell = document.querySelector(`.cell[data-row="${position.row}"][data-col="${position.col}"]`);
            if (cell) {
                cell.classList.add('winning');
            }
        });
    }

    if (lastMove) {
        highlightLastMove(lastMove.row, lastMove.col);
    }

    log(LOG_GAME, 'Board visually updated');
}

/**
 * Update the state of Undo button
 */
function updateUndoButton() {
    undoButton.disabled = moveHistory.length === 0;
    log(LOG_GAME, 'Undo button state updated', { enabled: moveHistory.length > 0 });
}

/**
 * Place a stone on the board and update the game state
 * @param {number} row - The row where the stone is placed
 * @param {number} col - The column where the stone is placed
 */
function placeStone(row, col) {
    board[row][col] = currentPlayer;
    const cell = updateCellAppearance(row, col);
    if (cell) {
        cell.classList.add('placed');
        setTimeout(() => {
            cell.classList.remove('placed');
        }, 320);
    }
    highlightLastMove(row, col);
    log(LOG_MOVE, 'Stone placed', { player: currentPlayer, row, col });
}

/**
 * Update the appearance of a cell on the board
 * @param {number} row - The row of the cell to update
 * @param {number} col - The column of the cell to update
 */
function updateCellAppearance(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) {
        log(LOG_ERROR, 'Attempted to update a missing cell', { row, col });
        return null;
    }
    cell.classList.add(currentPlayer === BLACK ? 'black' : 'white');
    log(LOG_GAME, 'Cell appearance updated', { row, col, player: currentPlayer });
    return cell;
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
        if (prevCell) {
            prevCell.classList.remove('last-move');
        }
    }

    // Add highlight to the new last move
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) {
        log(LOG_ERROR, 'Attempted to highlight a missing cell', { row, col });
        lastMove = null;
        return;
    }
    cell.classList.add('last-move');

    // Update the lastMove reference
    lastMove = { row, col };
    log(LOG_GAME, 'Last move highlighted', { row, col });
}

function highlightWinningSequence(sequence) {
    if (!Array.isArray(sequence) || sequence.length === 0) {
        return;
    }
    clearWinningHighlight();
    sequence.forEach(position => {
        const cell = document.querySelector(`.cell[data-row="${position.row}"][data-col="${position.col}"]`);
        if (cell) {
            cell.classList.remove('last-move', 'placed');
            cell.classList.add('winning');
        }
    });
    winningSequence = sequence.map(position => ({ row: position.row, col: position.col }));
    lastMove = null;
    log(LOG_GAME, 'Winning sequence highlighted', { length: sequence.length });
}

function clearWinningHighlight() {
    if (!Array.isArray(winningSequence) || winningSequence.length === 0) {
        return;
    }
    winningSequence.forEach(position => {
        const cell = document.querySelector(`.cell[data-row="${position.row}"][data-col="${position.col}"]`);
        if (cell) {
            cell.classList.remove('winning', 'placed');
        }
    });
    winningSequence = [];
}

function applyTheme(theme, options = {}) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    if (normalized === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    if (darkModeToggle) {
        darkModeToggle.checked = normalized === 'dark';
    }
    if (!options.silent) {
        log(LOG_GAME, 'Theme applied', { theme: normalized });
    }
}

function handleThemeToggle(event) {
    const theme = event.target.checked ? 'dark' : 'light';
    applyTheme(theme);
    persistSetting(THEME_STORAGE_KEY, theme);
}

function applyGridVisibility(showGrid, options = {}) {
    const shouldShow = Boolean(showGrid);
    if (boardElement) {
        boardElement.classList.toggle('grid-hidden', !shouldShow);
    }
    if (gridToggle) {
        gridToggle.checked = shouldShow;
    }
    if (!options.silent) {
        log(LOG_GAME, 'Grid visibility updated', { visible: shouldShow });
    }
}

function handleGridToggle(event) {
    const showGrid = event.target.checked;
    applyGridVisibility(showGrid);
    persistSetting(GRID_STORAGE_KEY, showGrid ? 'on' : 'off');
}

function persistSetting(key, value) {
    if (!storageAvailable) {
        return;
    }
    try {
        window.localStorage.setItem(key, value);
    } catch (error) {
        storageAvailable = false;
        log(LOG_ERROR, 'Failed to persist setting', { key, error: error.message });
    }
}

function readSetting(key) {
    if (!storageAvailable) {
        return null;
    }
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        storageAvailable = false;
        log(LOG_ERROR, 'Failed to read setting', { key, error: error.message });
        return null;
    }
}

function initializePreferences() {
    const storedTheme = readSetting(THEME_STORAGE_KEY);
    if (storedTheme) {
        applyTheme(storedTheme, { silent: true });
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light', { silent: true });
        setupSystemThemeListener();
    }

    const storedGrid = readSetting(GRID_STORAGE_KEY);
    if (storedGrid) {
        applyGridVisibility(storedGrid !== 'off', { silent: true });
    } else {
        applyGridVisibility(true, { silent: true });
    }
}

function setupSystemThemeListener() {
    if (!window.matchMedia) {
        return;
    }
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = event => {
        const storedPreference = readSetting(THEME_STORAGE_KEY);
        if (storedPreference) {
            return;
        }
        applyTheme(event.matches ? 'dark' : 'light');
    };
    systemThemeMediaQuery.addEventListener('change', handleChange);
}

function handleGameModeChange() {
    gameMode = gameModeSelect.value;
    syncAIOptionsVisibility();
    log(LOG_GAME, 'Game mode changed', { newMode: gameMode });
    resetGame();
}

function handleAIDifficultyChange() {
    aiDifficulty = aiDifficultySelect.value;
    if (gameMode === 'ai' && aiPlayer) {
        aiPlayer.difficulty = aiDifficulty;
    }
    log(LOG_AI, 'AI difficulty changed', { newDifficulty: aiDifficulty });
}

function initializeGame() {
    validateDomReferences();
    initializeBoard();
    initializePreferences();
    setupEventListeners();
    syncAIOptionsVisibility();
    resetGame();
    log(LOG_GAME, 'Game initialized');
}

function setupEventListeners() {
    newGameButton.addEventListener('click', resetGame);
    undoButton.addEventListener('click', undo);
    gameModeSelect.addEventListener('change', handleGameModeChange);
    aiDifficultySelect.addEventListener('change', handleAIDifficultyChange);
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', handleThemeToggle);
    }
    if (gridToggle) {
        gridToggle.addEventListener('change', handleGridToggle);
    }
    log(LOG_GAME, 'Event listeners set up');
}

function syncAIOptionsVisibility() {
    if (!aiOptionsDiv) return;
    const shouldHide = gameMode !== 'ai';
    aiOptionsDiv.hidden = shouldHide;
    aiOptionsDiv.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
}

// Initialize the game when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Export necessary functions and constants for use in other modules
export {
    BOARD_SIZE,
    EMPTY,
    BLACK,
    WHITE,
    board,
    currentPlayer,
    gameMode,
    aiDifficulty,
    makeMove,
    checkWin,
    updateStatus
};
