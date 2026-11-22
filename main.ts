// The Night Ledger — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop
// browser plays offline, no build step and no network. This program is
// what the grader runs. It copies game/ and screenshots/ into the output
// directory, refuses the hand-in early if a file breaks one of the gate's
// size rules, and writes dossier.json with the vendored make.fun library
// (vendor/makefun-game.ts), exactly the bytes the scorer rebuilds and
// compares against.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GATE = {
  textMaxBytes: 163840,
  screenshotMax: 4,
  screenshotMaxBytes: 262144,
  gameMaxFiles: 993,
  gameMaxBytes: 50331648,
  gamePathMaxBytes: 1000,
  dossierMaxBytes: 1572864,
};

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Every file under a directory, as paths relative to it. */
function listFiles(dir, base = dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listFiles(full, base));
    else found.push(full.slice(base.length + 1));
  }
  return found;
}

/** Fail loudly, before the grader has to, when a size rule is broken. */
function preflight(gameDir, shotsDir) {
  const gameFiles = listFiles(gameDir);
  let gameBytes = 0;
  for (const rel of gameFiles) {
    if (Buffer.byteLength(rel, 'utf8') > GATE.gamePathMaxBytes) {
      throw new Error(`game path over ${GATE.gamePathMaxBytes} bytes: ${rel}`);
    }
    gameBytes += statSync(join(gameDir, rel)).size;
  }
  if (gameFiles.length > GATE.gameMaxFiles) {
    throw new Error(`game/ holds ${gameFiles.length} files, over the ${GATE.gameMaxFiles} cap`);
  }
  if (gameBytes > GATE.gameMaxBytes) {
    throw new Error(`game/ is ${gameBytes} bytes, over the ${GATE.gameMaxBytes} cap`);
  }
  const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
  if (shots.length < 3 || shots.length > GATE.screenshotMax) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > GATE.screenshotMaxBytes) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the ${GATE.screenshotMaxBytes} cap`);
    }
  }
  return { gameFiles: gameFiles.length, gameBytes, shots: shots.length };
}

const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
const summary = preflight(gameDir, shotsDir);

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: GATE.textMaxBytes,
  screenshots: { max: GATE.screenshotMax, max_bytes: GATE.screenshotMaxBytes },
  game_max_files: GATE.gameMaxFiles,
  game_max_bytes: GATE.gameMaxBytes,
  game_path_max_bytes: GATE.gamePathMaxBytes,
});
if (Buffer.byteLength(dossier, 'utf8') > GATE.dossierMaxBytes) {
  throw new Error('dossier.json would exceed the 1.5 MiB cap');
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(
  `The Night Ledger handed in: ${summary.gameFiles} game files (${summary.gameBytes} bytes), ` +
  `${summary.shots} screenshots, dossier ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${outDir}`,
);
