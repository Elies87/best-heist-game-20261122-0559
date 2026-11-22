// Boot and the game loop: screens (title, play, caught, floor clear,
// victory), fixed-step simulation, and the wiring between input, the
// update modules and the renderer. Everything else lives in its own file;
// this one only conducts.

import { STEP, HUD_HEIGHT, ALARM } from './config.js';
import {
  createGame, loadLevel, solidRects,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_FLOOR_CLEAR, SCREEN_VICTORY,
} from './world.js';
import { attachInput, isDown, wasPressed, getMouse, endFrameInput } from './input.js';
import { updatePlayer } from './player.js';
import { updateGuards } from './guards.js';
import { updateSecurity } from './security.js';
import { updateAlarm } from './alarm.js';
import { updateFloaters } from './world.js';
import { render } from './render.js';
import { applyShot } from './shots.js';
import { initAudio, toggleMute, playUiClick, playCaughtSting, playWinJingle } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const game = createGame();
game.paused = false;
loadLevel(game, 0);
if (shotName) {
  game.shotMode = shotName;
  game.screen = applyShot(game, shotName);
}

attachInput(canvas);
window.addEventListener('keydown', initAudio, { once: false });
window.addEventListener('pointerdown', initAudio, { once: false });

function startCampaign() {
  game.campaignLoot = 0;
  game.campaignTime = 0;
  game.campaignSpots = 0;
  game.campaignPeak = 0;
  game.floorsCleared = 0;
  loadLevel(game, 0);
  game.screen = SCREEN_PLAY;
  playUiClick();
}

function restartFloor() {
  loadLevel(game, game.levelIndex);
  game.screen = SCREEN_PLAY;
  game.paused = false;
}

function clearFloor() {
  const level = game.level;
  level.banked = true;
  game.campaignLoot += level.lootValue;
  game.campaignTime += level.time;
  game.campaignSpots += level.spots;
  game.campaignPeak = Math.max(game.campaignPeak || 0, level.alarmPeak);
  game.floorsCleared += 1;
  game.screen = SCREEN_FLOOR_CLEAR;
  playWinJingle();
}

function stepSimulation(dt) {
  const level = game.level;
  level.time += dt;
  level.blockers = solidRects(level);
  level.seenByGuard = false;
  level.camSeen = false;
  level.camExposure = 0;
  level.empTimer = Math.max(0, level.empTimer - dt);
  level.panelTimer = Math.max(0, level.panelTimer - dt);
  if (level.noise) {
    level.noise.timer -= dt;
    if (level.noise.timer <= 0) level.noise = null;
  }
  const mouse = getMouse();
  const aim = { x: mouse.x, y: mouse.y - HUD_HEIGHT, clicked: mouse.clicked };
  updatePlayer(level, dt, aim);
  updateGuards(level, dt);
  updateSecurity(level, dt);
  updateAlarm(level, dt);
  updateFloaters(level, dt);

  if (level.caughtReason) {
    game.screen = SCREEN_CAUGHT;
    playCaughtSting();
    return;
  }
  const exit = level.exit;
  const player = level.player;
  if (
    level.mainTaken &&
    player.x > exit.x && player.x < exit.x + exit.w &&
    player.y > exit.y && player.y < exit.y + exit.h
  ) {
    clearFloor();
  }
}

function handleScreenKeys() {
  if (wasPressed('KeyM')) {
    game.muted = toggleMute();
  }
  if (game.shotMode) return;
  switch (game.screen) {
    case SCREEN_TITLE:
      if (wasPressed('Enter') || getMouse().clicked) startCampaign();
      break;
    case SCREEN_PLAY:
      if (wasPressed('KeyP', 'Escape')) game.paused = !game.paused;
      if (wasPressed('KeyR')) restartFloor();
      break;
    case SCREEN_CAUGHT:
      if (wasPressed('KeyR', 'Enter')) restartFloor();
      break;
    case SCREEN_FLOOR_CLEAR:
      if (wasPressed('Enter')) {
        if (game.levelIndex >= 2) {
          game.screen = SCREEN_VICTORY;
        } else {
          loadLevel(game, game.levelIndex + 1);
          game.screen = SCREEN_PLAY;
        }
        playUiClick();
      }
      break;
    case SCREEN_VICTORY:
      if (wasPressed('Enter')) {
        loadLevel(game, 0);
        game.screen = SCREEN_TITLE;
        playUiClick();
      }
      break;
    default:
      break;
  }
}

let last = performance.now();
let accumulator = 0;
let statusTimer = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game.screen === SCREEN_PLAY && !game.paused && !game.shotMode) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      stepSimulation(STEP);
      accumulator -= STEP;
      if (game.screen !== SCREEN_PLAY) {
        accumulator = 0;
        break;
      }
    }
  }
  handleScreenKeys();
  render(ctx, game);
  statusTimer += elapsed;
  if (status && statusTimer > 0.5) {
    statusTimer = 0;
    const level = game.level;
    status.textContent = level
      ? `${level.name}. Alarm ${Math.floor(level.alarm)} percent. Loot $${game.campaignLoot + level.lootValue}.`
      : '';
  }
  endFrameInput();
  window.__nightLedgerReady = true;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
