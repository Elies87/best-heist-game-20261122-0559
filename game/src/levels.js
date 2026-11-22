// The three floors of the Meridian Museum, as data. world.js turns one of
// these into live state; the renderer reads the same shapes to draw them.
// Coordinates are world pixels: 1280 wide, 656 tall, origin top-left.
// Walls are solid rectangles; a doorway is a gap between two wall pieces,
// and a door entity fills its gap until it is picked open.

function wall(x, y, w, h) {
  return { x, y, w, h };
}

function door(x, y, w, h) {
  return { x, y, w, h, locked: true, open: false, pickSeconds: 2.2 };
}

function loot(x, y, kind, name, value, main = false) {
  return { x, y, kind, name, value, main, taken: false, channel: main ? 1.6 : 0.7 };
}

function guardPath(points, loop = true) {
  return { path: points.map(([x, y, wait = 0]) => ({ x, y, wait })), loop };
}

function camera(x, y, base, sweep, speed, phase = 0) {
  return { x, y, base, sweep, speed, phase };
}

function laser(x1, y1, x2, y2, period, offset = 0) {
  return { x1, y1, x2, y2, period, offset, cooldown: 0 };
}

export const LEVELS = [
  {
    name: 'Floor One — The Gallery Wing',
    brief: 'Steal the Sun Mask from the Sun Room, then reach the van.',
    start: { x: 92, y: 586 },
    exit: { x: 1212, y: 536, w: 44, h: 84 },
    emp: 2,
    coins: 3,
    walls: [
      wall(400, 24, 16, 276), wall(400, 348, 16, 284),
      wall(820, 24, 16, 226), wall(820, 298, 16, 334),
      wall(416, 300, 224, 16), wall(700, 300, 120, 16),
      wall(120, 470, 130, 16), wall(294, 470, 122, 16),
      wall(560, 110, 56, 56), wall(980, 420, 56, 56), wall(170, 170, 56, 56),
    ],
    doors: [door(820, 250, 16, 48)],
    decor: [
      { x: 60, y: 380, w: 280, h: 200, kind: 'carpetRed', label: '' },
      { x: 440, y: 60, w: 340, h: 200, kind: 'marble', label: 'GALLERY' },
      { x: 860, y: 330, w: 360, h: 260, kind: 'carpetGold', label: 'EAST WING' },
      { x: 860, y: 60, w: 360, h: 150, kind: 'carpetTeal', label: 'SUN ROOM' },
    ],
    shadows: [
      { x: 424, y: 486, w: 170, h: 120 },
      { x: 1050, y: 40, w: 180, h: 90 },
      { x: 60, y: 40, w: 150, h: 90 },
    ],
    lamps: [
      { x: 240, y: 300 }, { x: 620, y: 180 }, { x: 1040, y: 470 }, { x: 1040, y: 140 },
    ],
    panels: [],
    lasers: [],
    loot: [
      loot(120, 44, 'painting', 'Harbour at Dusk', 450),
      loot(300, 44, 'painting', 'The Cartographer', 500),
      loot(198, 246, 'statue', 'The Bronze Stag', 600),
      loot(140, 430, 'coins', 'Coin Cabinet', 300),
      loot(700, 200, 'gem', 'Star Sapphire', 900),
      loot(1140, 596, 'vase', 'Ming Vase', 350),
      loot(1040, 100, 'mask', 'The Sun Mask', 2500, true),
    ],
    guards: [
      guardPath([[470, 560, 1.0], [770, 560, 0.6], [770, 360, 1.2], [470, 360, 0.6]]),
      guardPath([[900, 560, 0.8], [1180, 560, 1.0], [1180, 340, 0.8], [900, 340, 1.0]]),
      guardPath([[880, 120, 1.2], [1200, 120, 0.8], [1200, 210, 1.2], [880, 210, 0.8]]),
    ],
    cameras: [camera(640, 26, Math.PI / 2, 0.62, 0.5)],
  },
  {
    name: 'Floor Two — The Archive Floor',
    brief: 'The Tide Pearl is in the east annex. Mind the laser on the shelf run.',
    start: { x: 70, y: 596 },
    exit: { x: 1150, y: 556, w: 106, h: 76 },
    emp: 2,
    coins: 3,
    walls: [
      wall(120, 150, 400, 26), wall(620, 150, 400, 26),
      wall(260, 300, 400, 26), wall(740, 300, 260, 26),
      wall(120, 450, 400, 26), wall(620, 450, 400, 26),
      wall(1060, 24, 16, 276), wall(1060, 348, 16, 172), wall(1060, 568, 16, 64),
      wall(24, 520, 176, 16), wall(244, 520, 256, 16),
    ],
    doors: [door(1060, 300, 16, 48)],
    decor: [
      { x: 60, y: 40, w: 940, h: 560, kind: 'marble', label: 'ARCHIVE' },
      { x: 1096, y: 60, w: 140, h: 200, kind: 'carpetTeal', label: 'ANNEX' },
      { x: 60, y: 546, w: 380, h: 86, kind: 'carpetRed', label: 'OFFICE' },
    ],
    shadows: [
      { x: 140, y: 190, w: 200, h: 90 },
      { x: 660, y: 340, w: 180, h: 90 },
      { x: 300, y: 490, w: 200, h: 26 },
    ],
    lamps: [
      { x: 320, y: 90 }, { x: 820, y: 90 }, { x: 320, y: 390 }, { x: 1160, y: 160 },
    ],
    panels: [{ x: 250, y: 600, disabledSeconds: 6 }],
    lasers: [laser(660, 313, 740, 313, 3.3, 0)],
    loot: [
      loot(150, 52, 'painting', 'First Folio Page', 500),
      loot(450, 52, 'painting', 'Sealed Letters', 550),
      loot(950, 205, 'coins', 'Specimen Coins', 400),
      loot(360, 382, 'statue', 'Marble Muse', 700),
      loot(150, 566, 'vase', 'Dynasty Urn', 350),
      loot(880, 584, 'gem', 'Fire Opal', 950),
      loot(1166, 120, 'pearl', 'The Tide Pearl', 3000, true),
    ],
    guards: [
      guardPath([[90, 90, 1.0], [560, 90, 0.8], [560, 225, 1.2], [90, 225, 0.8]]),
      guardPath([[700, 375, 0.8], [1150, 375, 1.0], [1150, 525, 0.8], [700, 525, 1.0]]),
      guardPath([[1120, 90, 1.2], [1210, 90, 0.8], [1210, 500, 1.2], [1120, 500, 0.8]]),
    ],
    cameras: [
      camera(640, 26, Math.PI / 2, 0.6, 0.45),
      camera(26, 330, 0, 0.55, 0.55, 1.7),
    ],
  },
  {
    name: 'Floor Three — The Vault',
    brief: 'The Night Ledger waits in the vault chamber. Every eye in the building is awake.',
    start: { x: 70, y: 90 },
    exit: { x: 1180, y: 566, w: 76, h: 66 },
    emp: 3,
    coins: 4,
    walls: [
      wall(440, 180, 160, 16), wall(680, 180, 160, 16),
      wall(440, 440, 160, 16), wall(680, 440, 160, 16),
      wall(440, 196, 16, 94), wall(440, 338, 16, 102),
      wall(840, 196, 16, 94), wall(840, 338, 16, 102),
      wall(150, 120, 56, 56), wall(1074, 120, 56, 56),
      wall(150, 480, 56, 56), wall(1074, 480, 56, 56),
      wall(560, 60, 160, 26), wall(560, 570, 160, 26),
    ],
    doors: [door(600, 180, 80, 16), door(840, 290, 16, 48)],
    decor: [
      { x: 470, y: 210, w: 340, h: 200, kind: 'carpetTeal', label: 'VAULT' },
      { x: 60, y: 200, w: 300, h: 260, kind: 'marble', label: 'WEST RING' },
      { x: 920, y: 200, w: 300, h: 260, kind: 'marble', label: 'EAST RING' },
      { x: 420, y: 40, w: 440, h: 110, kind: 'carpetGold', label: 'NORTH RING' },
    ],
    shadows: [
      { x: 456, y: 196, w: 90, h: 70 },
      { x: 734, y: 356, w: 90, h: 68 },
      { x: 60, y: 380, w: 120, h: 120 },
      { x: 1100, y: 160, w: 120, h: 110 },
    ],
    lamps: [
      { x: 640, y: 100 }, { x: 210, y: 330 }, { x: 1070, y: 330 }, { x: 640, y: 310 },
    ],
    panels: [{ x: 96, y: 128, disabledSeconds: 6 }],
    lasers: [
      laser(600, 448, 680, 448, 3.6, 0),
      laser(240, 196, 240, 316, 4.1, 1.3),
      laser(1040, 340, 1040, 460, 3.8, 2.1),
    ],
    loot: [
      loot(200, 44, 'painting', 'The Forger’s Study', 600),
      loot(1080, 44, 'painting', 'Winter Customs House', 650),
      loot(180, 330, 'gem', 'Kashmir Sapphire', 1000),
      loot(1100, 330, 'gem', 'Pigeon-Blood Ruby', 1000),
      loot(640, 112, 'coins', 'Doubloon Chest', 500),
      loot(640, 512, 'statue', 'The Gilded Sphinx', 800),
      loot(640, 310, 'book', 'The Night Ledger', 5000, true),
    ],
    guards: [
      guardPath([[1160, 90, 0.6], [120, 90, 1.0]], false),
      guardPath([[140, 560, 0.8], [1140, 560, 0.8]], false),
      guardPath([[90, 500, 1.0], [90, 160, 1.0]], false),
      guardPath([[520, 250, 0.8], [760, 250, 1.2], [760, 380, 0.8], [520, 380, 1.2]]),
    ],
    cameras: [
      camera(640, 26, Math.PI / 2, 0.6, 0.5),
      camera(26, 330, 0, 0.55, 0.5, 0.9),
      camera(1254, 330, Math.PI, 0.55, 0.5, 2.2),
    ],
  },
];
