#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import AIPlayer from '../../ai-player.js';
import { GomokuEngine } from '../../src/engine/game.js';
import { BLACK, WHITE, BOARD_SIZE } from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if ((arg === '--config' || arg === '-c') && argv[i + 1]) {
            args.config = argv[i + 1];
            i += 1;
        } else if (arg === '--seed' && argv[i + 1]) {
            args.seed = Number(argv[i + 1]);
            i += 1;
        }
    }
    return args;
}

function createSeededRandom(seedValue) {
    let state = Math.floor(seedValue) % 2147483647;
    if (state <= 0) {
        state += 2147483646;
    }
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

async function loadConfig(configPath) {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
}

function deriveSeed(baseSeed, pairingIndex, gameIndex) {
    const offset = pairingIndex * 1000 + gameIndex;
    return baseSeed + offset;
}

function playGame({ boardSize, blackDifficulty, whiteDifficulty, seed }) {
    const engine = new GomokuEngine({ boardSize });
    const blackRng = createSeededRandom(seed * 2 + 1);
    const whiteRng = createSeededRandom(seed * 2 + 2);
    const blackAI = new AIPlayer(blackDifficulty, BLACK, { random: blackRng });
    const whiteAI = new AIPlayer(whiteDifficulty, WHITE, { random: whiteRng });

    const maxMoves = boardSize * boardSize;
    let moves = 0;

    while (!engine.isGameOver() && moves < maxMoves) {
        const currentPlayer = engine.getCurrentPlayer();
        const agent = currentPlayer === BLACK ? blackAI : whiteAI;
        const move = agent.makeMove(engine.getBoard());
        if (!move) {
            throw new Error('AI returned no move');
        }
        const outcome = engine.applyMove(move.row, move.col);
        if (outcome.status === 'invalid') {
            throw new Error(`Invalid move produced by ${currentPlayer === BLACK ? 'black' : 'white'} AI (${outcome.reason})`);
        }
        moves += 1;
        if (outcome.status === 'win') {
            return { result: currentPlayer === BLACK ? 'black' : 'white', moves };
        }
        if (outcome.status === 'draw') {
            return { result: 'draw', moves };
        }
    }

    return { result: 'draw', moves: maxMoves };
}

async function ensureResultDir() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(projectRoot, 'benchmarks', 'results', stamp);
    await fs.mkdir(resultsDir, { recursive: true });
    return resultsDir;
}

function summarisePairing(pairing, baseSeed, boardSize, pairingIndex) {
    const { id, black, white, games } = pairing;
    const rounds = Math.max(1, Number(games) || 1);
    const stats = {
        id,
        black,
        white,
        games: 0,
        blackWins: 0,
        whiteWins: 0,
        draws: 0,
        totalMoves: 0,
        seeds: []
    };

    for (let gameIndex = 0; gameIndex < rounds; gameIndex += 1) {
        const seed = deriveSeed(baseSeed, pairingIndex, gameIndex);
        const outcome = playGame({
            boardSize,
            blackDifficulty: black,
            whiteDifficulty: white,
            seed
        });
        stats.games += 1;
        stats.totalMoves += outcome.moves;
        stats.seeds.push(seed);
        if (outcome.result === 'black') {
            stats.blackWins += 1;
        } else if (outcome.result === 'white') {
            stats.whiteWins += 1;
        } else {
            stats.draws += 1;
        }
    }

    stats.averageMoves = stats.games > 0 ? Number((stats.totalMoves / stats.games).toFixed(2)) : 0;
    return stats;
}

async function main() {
    const args = parseArgs(process.argv);
    const defaultConfigPath = path.join(projectRoot, 'benchmarks', 'config', 'default.json');
    const configPath = args.config ? path.resolve(process.cwd(), args.config) : defaultConfigPath;
    const config = await loadConfig(configPath);
    const boardSize = config.boardSize || BOARD_SIZE;
    const baseSeed = Number.isFinite(args.seed) ? args.seed : (config.baseSeed || Date.now());

    const pairings = Array.isArray(config.pairings) && config.pairings.length > 0
        ? config.pairings
        : [{ id: 'default', black: 'medium', white: 'medium', games: 2 }];

    const summaries = pairings.map((pairing, index) => {
        return summarisePairing({ ...pairing, id: pairing.id || `pairing-${index}` }, baseSeed, boardSize, index);
    });

    const resultsDir = await ensureResultDir();
    const summaryPath = path.join(resultsDir, 'summary.json');
    const metadata = {
        generatedAt: new Date().toISOString(),
        configPath,
        baseSeed,
        boardSize,
        description: config.description || 'Benchmark run'
    };

    await fs.writeFile(summaryPath, JSON.stringify({ metadata, pairings: summaries }, null, 2));

    const reportLines = summaries.map(stat => {
        const winRate = stat.games > 0 ? ((stat.blackWins + stat.whiteWins) / stat.games * 100).toFixed(1) : '0.0';
        return `${stat.id}: games=${stat.games} black=${stat.blackWins} white=${stat.whiteWins} draws=${stat.draws} avgMoves=${stat.averageMoves} winOrLossRate=${winRate}%`;
    });

    console.log(`Benchmark summary written to ${summaryPath}`);
    reportLines.forEach(line => console.log(line));
}

main().catch(error => {
    console.error('Benchmark runner failed');
    console.error(error);
    process.exitCode = 1;
});

