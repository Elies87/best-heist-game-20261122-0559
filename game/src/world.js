// Live game state: builds a playable floor from a levels.js definition and
// holds everything the update modules mutate — thief, guards, cameras,
// lasers, alarm, tools and the running score of the campaign.

import { LEVELS } from './levels.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_FLOOR_CLEAR = 'floor-clear';
export const SCREEN_VICTORY = 'victory';

export function createGame() {
  return {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: null,
    campaignLoot: 0,
    campaignTime: 0,
    campaignSpots: 0,
    floorsCleared: 0,
    muted: false,
    shotMode: null,
  };
}

/** The four outer walls of the museum floor, as solid rects. */
function borderWalls() {
  return [
    { x: 0, y: 0, w: WORLD_WIDTH, h: 24 },
    { x: 0, y: WORLD_HEIGHT - 24, w: WORLD_WIDTH, h: 24 },
    { x: 0, y: 0, w: 24, h: WORLD_HEIGHT },
    { x: WORLD_WIDTH - 24, y: 0, w: 24, h: WORLD_HEIGHT },
  ];
}

/** Turn a level definition into fresh, mutable state and attach it. */
export function loadLevel(game, index) {
  const def = LEVELS[index];
  const level = {
    def,
    index,
    name: def.name,
    brief: def.brief,
    time: 0,
    walls: [...borderWalls(), ...def.walls.map((w) => ({ ...w }))],
    doors: def.doors.map((d) => ({ ...d })),
    decor: def.decor,
    shadows: def.shadows,
    lamps: def.lamps,
    exit: { ...def.exit },
    player: {
      x: def.start.x,
      y: def.start.y,
      angle: 0,
      radius: 13,
      sneaking: false,
      moving: false,
      stepTimer: 0,
      channel: null,
      lootCount: 0,
    },
    guards: def.guards.map((g) => ({
      path: g.path,
      loop: g.loop,
      x: g.path[0].x,
      y: g.path[0].y,
      angle: Math.atan2(g.path[1].y - g.path[0].y, g.path[1].x - g.path[0].x),
      nodeIndex: 1,
      direction: 1,
      waitTimer: 0,
      scanBase: 0,
      mode: 'patrol',
      suspicion: 0,
      seesPlayer: false,
      lastSeenX: 0,
      lastSeenY: 0,
      memory: 0,
      searchTimer: 0,
      returnIndex: 0,
      alerted: false,
    })),
    cameras: def.cameras.map((c) => ({
      ...c,
      angle: c.base,
      exposure: 0,
      seesPlayer: false,
      disabledTimer: 0,
    })),
    lasers: def.lasers.map((l) => ({ ...l, flash: 0 })),
    panels: def.panels.map((p) => ({ ...p })),
    loot: def.loot.map((item) => ({ ...item })),
    tools: { emp: def.emp, coins: def.coins },
    empTimer: 0,
    panelTimer: 0,
    alarm: 0,
    alarmPeak: 0,
    lootValue: 0,
    mainTaken: false,
    spots: 0,
    noise: null,
    floaters: [],
    caughtReason: '',
    beepTimer: 0,
    blockers: [],
  };
  level.blockers = solidRects(level);
  game.level = level;
  game.levelIndex = index;
  return level;
}

/** Solid rects right now: walls plus every door that is still shut. */
export function solidRects(level) {
  const rects = level.walls.slice();
  for (const door of level.doors) {
    if (!door.open) rects.push(door);
  }
  return rects;
}

/** Add a floating label (loot values, warnings) that drifts up and fades. */
export function addFloater(level, x, y, text, color = '#ffd166') {
  level.floaters.push({ x, y, text, color, t: 0 });
  if (level.floaters.length > 12) level.floaters.shift();
}

export function updateFloaters(level, dt) {
  for (const floater of level.floaters) floater.t += dt;
  level.floaters = level.floaters.filter((f) => f.t < 1.4);
}

/** The loot item the thief is close enough to work on, if any. */
export function nearestLoot(level, x, y, range) {
  let best = null;
  let bestDist = range;
  for (const item of level.loot) {
    if (item.taken) continue;
    const dx = item.x - x;
    const dy = item.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  return best;
}

/** The shut, locked door within reach of a point, if any. */
export function nearestLockedDoor(level, x, y, range) {
  for (const door of level.doors) {
    if (door.open || !door.locked) continue;
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    const dx = cx - x;
    const dy = cy - y;
    if (Math.sqrt(dx * dx + dy * dy) < range + Math.max(door.w, door.h) / 2) return door;
  }
  return null;
}

/** The security panel within reach of a point, if any. */
export function nearestPanel(level, x, y, range) {
  for (const panel of level.panels) {
    const dx = panel.x - x;
    const dy = panel.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < range) return panel;
  }
  return null;
}

export function levelLootTotal(def) {
  return def.loot.reduce((sum, item) => sum + item.value, 0);
}
