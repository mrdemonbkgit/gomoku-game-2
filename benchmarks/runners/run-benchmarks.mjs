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

    const telemetryBuffer = [];
    const recordTelemetry = player => entry => {
        telemetryBuffer.push({ ...entry, player });
    };

    const blackAI = new AIPlayer(blackDifficulty, BLACK, { random: blackRng, telemetry: recordTelemetry('black') });
    const whiteAI = new AIPlayer(whiteDifficulty, WHITE, { random: whiteRng, telemetry: recordTelemetry('white') });

    const maxMoves = boardSize * boardSize;
    let moves = 0;

    const finalize = (result, moveCount) => {
        const telemetry = telemetryBuffer.map((entry, index) => ({
            ...entry,
            moveIndex: entry.moveIndex ?? index
        }));
        return { result, moves: moveCount, telemetry };
    };

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
            return finalize(currentPlayer === BLACK ? 'black' : 'white', moves);
        }
        if (outcome.status === 'draw') {
            return finalize('draw', moves);
        }
    }

    return finalize('draw', maxMoves);
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

    const telemetryTotals = {
        moveCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        totalCandidateCount: 0,
        maxCandidateCount: 0,
        totalNodesEvaluated: 0,
        maxNodesEvaluated: 0
    };

    const gamesLog = [];

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

        const telemetryEntries = Array.isArray(outcome.telemetry) ? outcome.telemetry : [];
        const enrichedTelemetry = telemetryEntries.map((entry, index) => ({
            ...entry,
            moveIndex: entry.moveIndex ?? index,
            seed,
            gameIndex
        }));
        gamesLog.push({
            index: gameIndex,
            seed,
            result: outcome.result,
            moves: outcome.moves,
            telemetry: enrichedTelemetry
        });

        for (const entry of enrichedTelemetry) {
            telemetryTotals.moveCount += 1;
            if (typeof entry.durationMs === 'number') {
                telemetryTotals.totalDurationMs += entry.durationMs;
                if (entry.durationMs > telemetryTotals.maxDurationMs) {
                    telemetryTotals.maxDurationMs = entry.durationMs;
                }
            }
            if (typeof entry.candidateCount === 'number') {
                telemetryTotals.totalCandidateCount += entry.candidateCount;
                if (entry.candidateCount > telemetryTotals.maxCandidateCount) {
                    telemetryTotals.maxCandidateCount = entry.candidateCount;
                }
            }
            if (typeof entry.nodesEvaluated === 'number') {
                telemetryTotals.totalNodesEvaluated += entry.nodesEvaluated;
                if (entry.nodesEvaluated > telemetryTotals.maxNodesEvaluated) {
                    telemetryTotals.maxNodesEvaluated = entry.nodesEvaluated;
                }
            }
        }
    }

    stats.averageMoves = stats.games > 0 ? Number((stats.totalMoves / stats.games).toFixed(2)) : 0;

    const moveCount = telemetryTotals.moveCount || 0;
    const metrics = {
        moveCount,
        averageDurationMs: moveCount > 0 ? Number((telemetryTotals.totalDurationMs / moveCount).toFixed(3)) : 0,
        maxDurationMs: Number(telemetryTotals.maxDurationMs.toFixed(3)),
        averageCandidateCount: moveCount > 0 ? Number((telemetryTotals.totalCandidateCount / moveCount).toFixed(2)) : 0,
        maxCandidateCount: telemetryTotals.maxCandidateCount,
        averageNodesEvaluated: moveCount > 0 ? Number((telemetryTotals.totalNodesEvaluated / moveCount).toFixed(2)) : 0,
        maxNodesEvaluated: telemetryTotals.maxNodesEvaluated
    };

    return {
        ...stats,
        metrics,
        games: gamesLog
    };
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

    const summaryData = summaries.map(({ games, ...rest }) => rest);

    await fs.writeFile(summaryPath, JSON.stringify({ metadata, pairings: summaryData }, null, 2));

    await Promise.all(summaries.map(async summary => {
        const gameLogPath = path.join(resultsDir, `${summary.id}-games.json`);
        await fs.writeFile(gameLogPath, JSON.stringify(summary.games, null, 2));
    }));

    const reportLines = summaryData.map(stat => {
        const winRate = stat.games > 0 ? ((stat.blackWins + stat.whiteWins) / stat.games * 100).toFixed(1) : '0.0';
        const latency = stat.metrics ? `${stat.metrics.averageDurationMs.toFixed(2)}ms` : 'n/a';
        return `${stat.id}: games=${stat.games} black=${stat.blackWins} white=${stat.whiteWins} draws=${stat.draws} avgMoves=${stat.averageMoves} avgLatency=${latency}`;
    });

    console.log(`Benchmark summary written to ${summaryPath}`);
    reportLines.forEach(line => console.log(line));
    console.log('Per-game telemetry written to individual pairing logs.');
}

main().catch(error => {
    console.error('Benchmark runner failed');
    console.error(error);
    process.exitCode = 1;
});
