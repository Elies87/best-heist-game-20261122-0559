// The Night Ledger — shared constants: stage size, tuning and palette.
// Everything the other modules need to agree on lives here, so a level, the
// guards and the renderer never hard-code their own copy of a number.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_HEIGHT = 64;
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = VIEW_HEIGHT - HUD_HEIGHT;

export const STEP = 1 / 120;

export const THIEF = {
  radius: 13,
  walkSpeed: 152,
  sneakSpeed: 88,
  grabRange: 34,
  interactRange: 40,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 60,
  investigateSpeed: 94,
  chaseSpeed: 131,
  viewDistance: 198,
  viewHalfAngle: (36 * Math.PI) / 180,
  catchDistance: 23,
  memorySeconds: 4.5,
  searchSeconds: 3.2,
};

export const CAMERA = {
  viewDistance: 178,
  viewHalfAngle: (24 * Math.PI) / 180,
  exposeSeconds: 0.9,
  forgetSeconds: 0.6,
  empSeconds: 10,
};

export const LASER = {
  alarmHit: 30,
  retriggerSeconds: 1.6,
};

export const ALARM = {
  max: 100,
  guardSpotHit: 30,
  guardWatchRate: 4,
  cameraRate: 11,
  empNoise: 4,
  decayRate: 1.7,
  dangerLine: 75,
};

export const TOOLS = {
  coinRange: 280,
  coinNoiseRadius: 128,
  coinLureSeconds: 3.4,
};

export const COLORS = {
  ink: '#0d1017',
  floorBase: '#232b3f',
  floorLine: '#293350',
  wall: '#39466a',
  wallEdge: '#5a6f9e',
  wallShadow: '#171d2e',
  carpetRed: '#5d2436',
  carpetGold: '#5c4a22',
  carpetTeal: '#1f4a4a',
  marble: '#2c3550',
  shadowZone: 'rgba(5, 8, 16, 0.42)',
  guardCone: 'rgba(255, 214, 120, 0.20)',
  guardConeEdge: 'rgba(255, 196, 82, 0.55)',
  guardConeHot: 'rgba(255, 92, 66, 0.30)',
  cameraCone: 'rgba(94, 234, 196, 0.15)',
  cameraConeEdge: 'rgba(94, 234, 196, 0.45)',
  laser: '#ff4757',
  lootGold: '#ffd166',
  lootGem: '#7bf1ff',
  alarmLow: '#43d17c',
  alarmMid: '#ffb020',
  alarmHigh: '#ff4757',
  hudBar: 'rgba(10, 13, 22, 0.92)',
  hudText: '#e8ecf6',
  hudDim: '#93a0bd',
  accent: '#ffd166',
};

export const GAME_TITLE = 'THE NIGHT LEDGER';
export const GAME_SUBTITLE = 'a museum heist in three floors';
export const THIEF_NAME = 'Wren';
