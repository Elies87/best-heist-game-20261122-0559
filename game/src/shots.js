// Screenshot scenes behind ?shot=cover|alarm|vault|getaway. Each one loads
// a real floor and poses its live state — the thief mid-crossing, a guard's
// cone swinging onto her, the vault chamber, the getaway tally — so the
// frame is the game's own render of a moment its rules can produce, and
// the same scene always stages the same frame.

import { loadLevel, SCREEN_PLAY, SCREEN_FLOOR_CLEAR } from './world.js';

function pose(level, x, y, angle) {
  level.player.x = x;
  level.player.y = y;
  level.player.angle = angle;
}

function poseGuard(guard, x, y, angle, suspicion = 0) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.scanBase = angle;
  guard.suspicion = suspicion;
  if (suspicion > 0.5) guard.warned = true;
}

export function applyShot(game, name) {
  if (name === 'alarm') return stageAlarm(game);
  if (name === 'vault') return stageVault(game);
  if (name === 'getaway') return stageGetaway(game);
  return stageCover(game);
}

/** Floor one, mid-crossing: cones sweeping, loot glinting, alarm low. */
function stageCover(game) {
  const level = loadLevel(game, 0);
  level.time = 6.5;
  pose(level, 622, 436, -0.35);
  level.player.sneaking = false;
  poseGuard(level.guards[0], 706, 486, 2.6, 0.35);
  poseGuard(level.guards[1], 1052, 472, -1.35, 0);
  poseGuard(level.guards[2], 1010, 148, 2.9, 0);
  level.cameras[0].angle = Math.PI / 2 + 0.28;
  level.alarm = 16;
  level.alarmPeak = 22;
  return SCREEN_PLAY;
}

/** Floor two, a bad second: a guard at '?' going on '!', camera hot. */
function stageAlarm(game) {
  const level = loadLevel(game, 1);
  level.time = 1.0;
  pose(level, 700, 380, Math.PI);
  poseGuard(level.guards[1], 786, 428, Math.atan2(380 - 428, 700 - 786), 0.82);
  poseGuard(level.guards[0], 330, 96, 0.2, 0);
  poseGuard(level.guards[2], 1166, 300, -Math.PI / 2, 0);
  level.cameras[0].angle = Math.PI / 2 - 0.3;
  level.cameras[1].angle = 0.1;
  level.cameras[1].exposure = 0.7;
  level.camSeen = true;
  level.camExposure = 0.7;
  level.seenByGuard = true;
  level.alarm = 63;
  level.alarmPeak = 63;
  return SCREEN_PLAY;
}

/** Floor three: inside the vault chamber, the Ledger in reach, lasers live. */
function stageVault(game) {
  const level = loadLevel(game, 2);
  level.time = 1.2;
  pose(level, 640, 402, -Math.PI / 2);
  poseGuard(level.guards[3], 548, 262, 0.7, 0.2);
  poseGuard(level.guards[0], 760, 90, Math.PI, 0);
  poseGuard(level.guards[1], 420, 560, 0, 0);
  poseGuard(level.guards[2], 90, 300, Math.PI / 2, 0);
  level.cameras[0].angle = Math.PI / 2 + 0.2;
  level.cameras[1].angle = 0.35;
  level.cameras[2].angle = Math.PI - 0.35;
  level.alarm = 28;
  level.alarmPeak = 34;
  level.tools.emp = 2;
  return SCREEN_PLAY;
}

/** The moment after floor one: the tally screen over the gallery. */
function stageGetaway(game) {
  const level = loadLevel(game, 0);
  level.time = 9.25;
  pose(level, 1150, 578, 0);
  level.mainTaken = true;
  level.banked = true;
  level.player.lootCount = 5;
  level.lootValue = 4300;
  level.spots = 1;
  level.alarm = 12;
  level.alarmPeak = 57;
  level.time = 132;
  poseGuard(level.guards[0], 520, 420, 0.8, 0);
  poseGuard(level.guards[1], 980, 380, 2.4, 0);
  poseGuard(level.guards[2], 1000, 160, 3.0, 0);
  game.campaignLoot = 4300;
  game.campaignTime = 132;
  game.campaignSpots = 1;
  return SCREEN_FLOOR_CLEAR;
}
