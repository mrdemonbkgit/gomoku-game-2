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
import { determineWinningSequence as engineDetermineWinningSequence, checkDraw as engineCheckDraw } from './src/engine/game.js';

// Game state variables
let board = []; // 2D array representing the game board
let currentPlayer = BLACK; // Current player (starts with Black)
let gameOver = false; // Flag to indicate if the game has ended
let moveHistory = [];
let lastMove = null;
let winningSequence = [];
let humanPlayerColor = BLACK;
let aiPlayerColor = WHITE;
let systemThemeMediaQuery = null;
let storageAvailable = true;
let gameMode = 'human'; // 'human' or 'ai'
let aiPlayer = null;
let aiDifficulty = 'easy';

let isReviewMode = false;
let reviewIndex = 0;
let reviewTimer = null;

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
const playerColorOptionsDiv = document.getElementById('player-color-options');
const playerColorSelect = document.getElementById('player-color');

const darkModeToggle = document.getElementById('dark-mode-toggle');
const gridToggle = document.getElementById('grid-toggle');
const moveHistoryPanel = document.getElementById('move-history-panel');
const moveHistoryList = document.getElementById('move-history-list');
const historyStepBackButton = document.getElementById('history-step-back');
const historyPlayPauseButton = document.getElementById('history-play-pause');
const historyStepForwardButton = document.getElementById('history-step-forward');
const historyExitButton = document.getElementById('history-exit');

const THEME_STORAGE_KEY = 'gomoku-theme';
const GRID_STORAGE_KEY = 'gomoku-grid-visible';
const columnLabels = buildColumnLabels(BOARD_SIZE);

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
    if (!moveHistoryPanel) missingElements.push('move-history-panel');
    if (!moveHistoryList) missingElements.push('move-history-list');
    if (!historyStepBackButton) missingElements.push('history-step-back');
    if (!historyPlayPauseButton) missingElements.push('history-play-pause');
    if (!historyStepForwardButton) missingElements.push('history-step-forward');
    if (!historyExitButton) missingElements.push('history-exit');

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
    if (gameOver || isReviewMode || (gameMode === 'ai' && currentPlayer !== humanPlayerColor)) return;

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
    if (!aiPlayer || gameOver || isReviewMode || currentPlayer !== aiPlayerColor) {
        return;
    }

    log(LOG_AI, 'AI is making a move', { difficulty: aiPlayer.difficulty, aiColor: aiPlayerColor === BLACK ? 'black' : 'white' });
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

    if (!isReviewMode) {
        reviewIndex = moveHistory.length;
    }
    renderMoveHistory();
    updateReviewControlsState();

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
    const result = engineDetermineWinningSequence(board, row, col);
    if (result) {
        winningSequence = result.sequence.map(position => ({ row: position.row, col: position.col }));
        log(LOG_GAME, 'Win condition met', { row, col, direction: result.direction, sequence: winningSequence });
        return true;
    }

    winningSequence = [];
    return false;
}

/**
 * Check for a draw condition
 * @returns {boolean} True if the game is a draw, false otherwise
 */
function checkDraw() {
    const isDraw = engineCheckDraw(board);
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
    if (isReviewMode) {
        renderReviewStatus();
        return;
    }

    let message;
    let indicatorState;

    if (gameMode === 'human') {
        const playerName = currentPlayer === BLACK ? 'Black' : 'White';
        message = `Current player: ${playerName}`;
        indicatorState = currentPlayer === BLACK ? 'black' : 'white';
    } else if (currentPlayer === humanPlayerColor) {
        const playerName = humanPlayerColor === BLACK ? 'Black' : 'White';
        message = `Your turn (${playerName})`;
        indicatorState = humanPlayerColor === BLACK ? 'black' : 'white';
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

    stopReplay();
    isReviewMode = false;
    reviewIndex = 0;

    if (playerColorSelect) {
        humanPlayerColor = playerColorSelect.value === 'white' ? WHITE : BLACK;
    }
    aiPlayerColor = humanPlayerColor === BLACK ? WHITE : BLACK;

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
        aiPlayer = new AIPlayer(aiDifficulty, aiPlayerColor);
        if (currentPlayer === aiPlayerColor) {
            setTimeout(() => {
                if (!gameOver && currentPlayer === aiPlayerColor) {
                    makeAIMove();
                }
            }, 300);
        }
    } else {
        aiPlayer = null;
    }

    // Update the game status display
    updateStatus();

    renderMoveHistory();
    updateReviewControlsState();

    log(LOG_GAME, 'Game reset', {
        gameMode,
        aiDifficulty,
        humanColor: humanPlayerColor === BLACK ? 'black' : 'white'
    });
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
    if (moveHistory.length === 0) {
        return;
    }

    if (isReviewMode) {
        exitReviewMode();
    } else {
        stopReplay({ updateButton: false });
    }

    clearWinningHighlight();

    const removedMoves = [];

    const undoSingleMove = () => {
        const entry = moveHistory.pop();
        board[entry.row][entry.col] = EMPTY;
        const cell = document.querySelector(`.cell[data-row="${entry.row}"][data-col="${entry.col}"]`);
        if (cell) {
            cell.classList.remove('black', 'white', 'last-move', 'winning', 'placed');
        }
        removedMoves.push(entry);
    };

    undoSingleMove();

    if (gameMode === 'ai' && moveHistory.length > 0) {
        const colors = new Set(removedMoves.map(move => move.player));
        while (colors.size < 2 && moveHistory.length > 0) {
            undoSingleMove();
            colors.add(removedMoves[removedMoves.length - 1].player);
        }
    }

    lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

    if (lastMove) {
        highlightLastMove(lastMove.row, lastMove.col);
        currentPlayer = lastMove.player === BLACK ? WHITE : BLACK;
    } else {
        currentPlayer = BLACK;
    }

    gameOver = false;
    winningSequence = [];
    updateBoard();
    updateStatus();
    updateUndoButton();
    reviewIndex = moveHistory.length;
    renderMoveHistory();
    updateReviewControlsState();

    log(LOG_MOVE, 'Move(s) undone', { undoneMovesCount: removedMoves.length });

    if (!gameOver && gameMode === 'ai' && currentPlayer === aiPlayerColor) {
        setTimeout(() => {
            if (!gameOver && currentPlayer === aiPlayerColor) {
                makeAIMove();
            }
        }, 300);
    }
}


/**
 * Update the visual board based on the current game state
 */
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    document.querySelectorAll('.cell.last-move').forEach(cell => cell.classList.remove('last-move'));
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

function handlePlayerColorChange() {
    if (!playerColorSelect) {
        return;
    }
    humanPlayerColor = playerColorSelect.value === 'white' ? WHITE : BLACK;
    aiPlayerColor = humanPlayerColor === BLACK ? WHITE : BLACK;
    log(LOG_GAME, 'Human player color changed', {
        selected: humanPlayerColor === BLACK ? 'black' : 'white'
    });
    if (gameMode === 'ai') {
        resetGame();
    }
}

function initializeGame() {
    validateDomReferences();
    if (playerColorSelect) {
        playerColorSelect.value = 'black';
    }
    humanPlayerColor = BLACK;
    aiPlayerColor = WHITE;
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
    if (playerColorSelect) {
        playerColorSelect.addEventListener('change', handlePlayerColorChange);
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', handleThemeToggle);
    }
    if (gridToggle) {
        gridToggle.addEventListener('change', handleGridToggle);
    }
    if (historyStepBackButton) {
        historyStepBackButton.addEventListener('click', () => step(-1));
    }
    if (historyStepForwardButton) {
        historyStepForwardButton.addEventListener('click', () => step(1));
    }
    if (historyPlayPauseButton) {
        historyPlayPauseButton.addEventListener('click', toggleReplay);
    }
    if (historyExitButton) {
        historyExitButton.addEventListener('click', () => exitReviewMode());
    }
    if (moveHistoryPanel) {
        moveHistoryPanel.addEventListener('toggle', () => updateReviewControlsState());
    }
    log(LOG_GAME, 'Event listeners set up');
}

function syncAIOptionsVisibility() {
    if (!aiOptionsDiv) return;
    const shouldHide = gameMode !== 'ai';
    aiOptionsDiv.hidden = shouldHide;
    aiOptionsDiv.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    if (playerColorOptionsDiv) {
        playerColorOptionsDiv.hidden = shouldHide;
        playerColorOptionsDiv.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    }
}


function buildColumnLabels(size) {
    const labels = [];
    for (let i = 0; i < size; i++) {
        labels.push(String.fromCharCode(65 + i));
    }
    return labels;
}

function coordsToLabel(row, col) {
    const column = columnLabels[col] || String.fromCharCode(65 + col);
    return column + (row + 1);
}

function buildSnapshotFromHistory(limit) {
    const snapshotBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    let lastPlaced = null;
    let winningSequenceLocal = [];
    let winningMoveIndex = -1;

    for (let i = 0; i < limit && i < moveHistory.length; i++) {
        const move = moveHistory[i];
        snapshotBoard[move.row][move.col] = move.player;
        lastPlaced = { row: move.row, col: move.col, player: move.player };

        if (winningMoveIndex === -1) {
            const result = engineDetermineWinningSequence(snapshotBoard, move.row, move.col);
            if (result) {
                winningSequenceLocal = result.sequence.map(position => ({ row: position.row, col: position.col }));
                winningMoveIndex = i;
            }
        }
    }

    const isWinningPosition = winningMoveIndex !== -1 && limit === winningMoveIndex + 1;
    const isDrawPosition = limit === moveHistory.length && engineCheckDraw(snapshotBoard);
    const winningPlayer = isWinningPosition && lastPlaced ? lastPlaced.player : null;

    let nextPlayer = BLACK;
    if (lastPlaced) {
        if (isWinningPosition || isDrawPosition) {
            nextPlayer = lastPlaced.player;
        } else {
            nextPlayer = lastPlaced.player === BLACK ? WHITE : BLACK;
        }
    }

    return {
        board: snapshotBoard,
        lastMove: lastPlaced,
        winningSequence: isWinningPosition ? winningSequenceLocal : [],
        winningMoveIndex,
        isWinningPosition,
        winningPlayer,
        isDraw: isDrawPosition,
        nextPlayer
    };
}

function renderMoveHistory() {
    if (!moveHistoryList) {
        return;
    }

    moveHistoryList.innerHTML = '';
    const totalMoves = moveHistory.length;
    reviewIndex = Math.max(0, Math.min(reviewIndex, totalMoves));

    if (totalMoves === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'move-history__empty';
        emptyState.textContent = 'No moves yet. Play to build history.';
        moveHistoryList.appendChild(emptyState);
        updateReviewControlsState();
        return;
    }

    moveHistory.forEach((move, index) => {
        const listItem = document.createElement('li');

        const entryButton = document.createElement('button');
        entryButton.type = 'button';
        entryButton.className = 'move-history__entry';
        entryButton.dataset.index = String(index + 1);

        const number = document.createElement('span');
        number.className = 'move-history__number';
        number.textContent = String(index + 1) + '.';

        const stone = document.createElement('span');
        stone.className = 'move-history__stone ' + (move.player === BLACK ? 'move-history__stone--black' : 'move-history__stone--white');

        const details = document.createElement('span');
        details.className = 'move-history__details';

        const label = document.createElement('span');
        label.className = 'move-history__label';
        label.textContent = move.player === BLACK ? 'Black' : 'White';

        const coords = document.createElement('span');
        coords.className = 'move-history__coords';
        coords.textContent = coordsToLabel(move.row, move.col);

        details.appendChild(label);
        details.appendChild(coords);

        entryButton.appendChild(number);
        entryButton.appendChild(stone);
        entryButton.appendChild(details);

        entryButton.addEventListener('click', () => enterReviewMode(index + 1));

        listItem.appendChild(entryButton);
        moveHistoryList.appendChild(listItem);
    });

    updateActiveHistoryEntry();
    updateReviewControlsState();
}

function updateActiveHistoryEntry() {
    if (!moveHistoryList) {
        return;
    }

    const pointer = isReviewMode ? reviewIndex : moveHistory.length;
    const buttons = moveHistoryList.querySelectorAll('.move-history__entry');

    buttons.forEach(button => {
        const entryIndex = Number(button.dataset.index || '0');
        const isActive = pointer > 0 && entryIndex === pointer;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
        if (isActive) {
            button.scrollIntoView({ block: 'nearest' });
        }
    });
}

function updateReviewControlsState() {
    const totalMoves = moveHistory.length;
    const pointer = isReviewMode ? reviewIndex : totalMoves;

    if (historyStepBackButton) {
        historyStepBackButton.disabled = totalMoves === 0 || (isReviewMode && pointer === 0);
    }
    if (historyStepForwardButton) {
        historyStepForwardButton.disabled = totalMoves === 0 || pointer === totalMoves;
    }
    if (historyPlayPauseButton) {
        historyPlayPauseButton.disabled = totalMoves === 0;
        historyPlayPauseButton.textContent = reviewTimer ? 'Pause' : 'Play';
    }
    if (historyExitButton) {
        historyExitButton.disabled = !isReviewMode;
    }
}

function renderReviewStatus(snapshot, pointer, isDrawPosition) {
    if (typeof snapshot === 'undefined') {
        snapshot = buildSnapshotFromHistory(reviewIndex);
        pointer = reviewIndex;
        isDrawPosition = snapshot.isDraw && reviewIndex === moveHistory.length;
    }

    const totalMoves = moveHistory.length;
    let message;
    let indicator = 'neutral';

    if (totalMoves === 0 || pointer === 0) {
        const nextPlayerName = snapshot.nextPlayer === BLACK ? 'Black' : 'White';
        message = 'Reviewing game start - Next: ' + nextPlayerName;
    } else {
        const move = moveHistory[pointer - 1];
        const playerName = move.player === BLACK ? 'Black' : 'White';
        const coords = coordsToLabel(move.row, move.col);
        message = 'Reviewing ' + pointer + '/' + totalMoves + ': ' + playerName + ' ' + coords;

        if (snapshot.isWinningPosition) {
            message += ' - ' + playerName + ' wins';
            indicator = move.player === BLACK ? 'black' : 'white';
        } else if (isDrawPosition) {
            message += ' - Draw';
            indicator = 'neutral';
        } else {
            const nextPlayerName = snapshot.nextPlayer === BLACK ? 'Black' : 'White';
            message += ' - Next: ' + nextPlayerName;
            indicator = move.player === BLACK ? 'black' : 'white';
        }
    }

    setStatus(message, indicator);
}

function jumpToMove(index, options) {
    const settings = options || {};
    const reason = settings.reason || (isReviewMode ? 'review' : 'live');
    const silent = Boolean(settings.silent);
    const clamped = Math.max(0, Math.min(index, moveHistory.length));
    reviewIndex = clamped;

    const snapshot = buildSnapshotFromHistory(clamped);

    board = snapshot.board.map(row => row.slice());
    winningSequence = snapshot.winningSequence.map(position => ({ row: position.row, col: position.col }));
    const lastMoveForHighlight = snapshot.lastMove ? { row: snapshot.lastMove.row, col: snapshot.lastMove.col } : null;
    const isDrawPosition = snapshot.isDraw && clamped === moveHistory.length;

    currentPlayer = snapshot.nextPlayer;
    gameOver = snapshot.isWinningPosition || isDrawPosition;

    document.querySelectorAll('.cell.last-move').forEach(cell => cell.classList.remove('last-move'));
    updateBoard();
    lastMove = null;

    if (lastMoveForHighlight) {
        highlightLastMove(lastMoveForHighlight.row, lastMoveForHighlight.col);
    }

    if (reason === 'review') {
        renderReviewStatus(snapshot, clamped, isDrawPosition);
    } else if (!silent) {
        if (snapshot.isWinningPosition && snapshot.winningPlayer !== null) {
            const indicator = snapshot.winningPlayer === BLACK ? 'black' : 'white';
            const winnerName = snapshot.winningPlayer === BLACK ? 'Black' : 'White';
            setStatus('Player ' + winnerName + ' wins!', indicator);
        } else if (isDrawPosition) {
            setStatus('It\'s a draw!', 'neutral');
        } else {
            updateStatus();
        }
    }

    updateActiveHistoryEntry();
    updateReviewControlsState();

    log(LOG_GAME, 'Jumped to board snapshot', { index: clamped, reason: reason });

    return snapshot;
}

function enterReviewMode(index) {
    if (moveHistory.length === 0) {
        return;
    }

    stopReplay();
    isReviewMode = true;

    if (typeof index !== 'number') {
        index = moveHistory.length;
    }

    if (moveHistoryPanel && !moveHistoryPanel.open) {
        moveHistoryPanel.open = true;
    }

    const clampedIndex = Math.max(0, Math.min(index, moveHistory.length));
    jumpToMove(clampedIndex, { reason: 'review' });
    log(LOG_GAME, 'Entered review mode', { index: clampedIndex });

    updateActiveHistoryEntry();
    updateReviewControlsState();
}

function exitReviewMode(options) {
    const settings = options || {};
    const restoreBoard = settings.restoreBoard !== false;
    const silent = Boolean(settings.silent);

    if (!isReviewMode && reviewTimer === null) {
        reviewIndex = moveHistory.length;
        updateReviewControlsState();
        return;
    }

    stopReplay();
    const wasInReview = isReviewMode;
    isReviewMode = false;
    reviewIndex = moveHistory.length;

    if (restoreBoard) {
        const snapshot = jumpToMove(moveHistory.length, { reason: 'live', silent: true });
        if (snapshot.isWinningPosition && snapshot.winningPlayer !== null) {
            const indicator = snapshot.winningPlayer === BLACK ? 'black' : 'white';
            const winnerName = snapshot.winningPlayer === BLACK ? 'Black' : 'White';
            setStatus('Player ' + winnerName + ' wins!', indicator);
        } else if (snapshot.isDraw) {
            setStatus('It\'s a draw!', 'neutral');
        } else {
            updateStatus();
        }
    }

    if (!gameOver && gameMode === 'ai' && currentPlayer === aiPlayerColor) {
        setTimeout(() => {
            if (!gameOver && currentPlayer === aiPlayerColor && !isReviewMode) {
                makeAIMove();
            }
        }, 300);
    }

    if (wasInReview && !silent) {
        log(LOG_GAME, 'Exited review mode');
    }

    updateActiveHistoryEntry();
    updateReviewControlsState();
}

function step(delta) {
    if (moveHistory.length === 0) {
        return;
    }

    const pointer = (isReviewMode ? reviewIndex : moveHistory.length) + delta;
    const clamped = Math.max(0, Math.min(pointer, moveHistory.length));

    if (!isReviewMode) {
        enterReviewMode(clamped);
    } else {
        jumpToMove(clamped, { reason: 'review' });
    }
}

function toggleReplay() {
    if (moveHistory.length === 0) {
        return;
    }

    if (reviewTimer !== null) {
        stopReplay();
        return;
    }

    if (!isReviewMode || reviewIndex >= moveHistory.length) {
        enterReviewMode(0);
    }

    reviewTimer = window.setInterval(() => {
        if (!isReviewMode || reviewIndex >= moveHistory.length) {
            stopReplay();
            return;
        }

        jumpToMove(reviewIndex + 1, { reason: 'review' });

        if (reviewIndex >= moveHistory.length) {
            stopReplay();
        }
    }, 900);

    updateReviewControlsState();
    log(LOG_GAME, 'Replay started', { startIndex: reviewIndex });
}

function stopReplay(options) {
    const settings = options || {};
    const updateButton = settings.updateButton !== false;

    if (reviewTimer !== null) {
        clearInterval(reviewTimer);
        reviewTimer = null;
        log(LOG_GAME, 'Replay stopped');
    }

    if (updateButton) {
        updateReviewControlsState();
    }
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







