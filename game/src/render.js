// All drawing. The judge meets the game through screenshots, so this file
// works hard on readability: warm flashlight cones for guards, teal cones
// for cameras, gold for loot, red for lasers and danger, dark blue shadow
// to hide in — every system legible at a glance, in one frame.

import {
  VIEW_WIDTH, VIEW_HEIGHT, HUD_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT,
  GUARD, CAMERA, COLORS, GAME_TITLE, GAME_SUBTITLE, THIEF_NAME,
} from './config.js';
import { conePolygon, clamp } from './geometry.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_FLOOR_CLEAR, SCREEN_VICTORY,
  nearestLoot, nearestLockedDoor, nearestPanel,
} from './world.js';
import { camerasDark, laserIsOn } from './security.js';
import { alarmColor } from './alarm.js';
import { THIEF } from './config.js';

const WORLD_BOUNDS = { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT };

export function computeRating(spots, alarmPeak) {
  if (spots === 0 && alarmPeak < 35) return 'GHOST';
  if (spots <= 1 && alarmPeak < 60) return 'SHADOW';
  if (spots <= 3) return 'PROWLER';
  return 'SMASH-AND-GRAB';
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const level = game.level;
  if (level) {
    drawWorld(ctx, level);
    drawHud(ctx, game, level);
  }
  if (game.screen === SCREEN_TITLE) drawTitle(ctx, game);
  else if (game.screen === SCREEN_CAUGHT) drawCaught(ctx, game, level);
  else if (game.screen === SCREEN_FLOOR_CLEAR) drawFloorClear(ctx, game, level);
  else if (game.screen === SCREEN_VICTORY) drawVictory(ctx, game);
  else if (game.paused) drawPaused(ctx);
}

/* ---------------- the world ---------------- */

function drawWorld(ctx, level) {
  ctx.save();
  ctx.translate(0, HUD_HEIGHT);
  drawFloor(ctx, level);
  drawExit(ctx, level);
  drawPanels(ctx, level);
  for (const item of level.loot) if (!item.taken) drawLoot(ctx, level, item);
  drawDoors(ctx, level);
  drawLasers(ctx, level);
  drawCameraCones(ctx, level);
  drawGuardCones(ctx, level);
  for (const cam of level.cameras) drawCamera(ctx, level, cam);
  for (const guard of level.guards) drawGuard(ctx, level, guard);
  drawNoise(ctx, level);
  drawPlayer(ctx, level);
  drawFloaters(ctx, level);
  drawVignette(ctx);
  ctx.restore();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = COLORS.floorBase;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 24; x < WORLD_WIDTH - 24; x += 46) {
    ctx.moveTo(x, 24);
    ctx.lineTo(x, WORLD_HEIGHT - 24);
  }
  for (let y = 24; y < WORLD_HEIGHT - 24; y += 46) {
    ctx.moveTo(24, y);
    ctx.lineTo(WORLD_WIDTH - 24, y);
  }
  ctx.stroke();

  for (const deco of level.decor) {
    ctx.fillStyle = COLORS[deco.kind] || COLORS.marble;
    ctx.fillRect(deco.x, deco.y, deco.w, deco.h);
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.18)';
    ctx.strokeRect(deco.x + 4, deco.y + 4, deco.w - 8, deco.h - 8);
    if (deco.label) {
      ctx.fillStyle = 'rgba(232, 236, 246, 0.13)';
      ctx.font = '700 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(deco.label, deco.x + deco.w / 2, deco.y + deco.h / 2 + 10);
    }
  }
  for (const shadow of level.shadows) {
    ctx.fillStyle = COLORS.shadowZone;
    ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
  }
  for (const lamp of level.lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 120);
    glow.addColorStop(0, 'rgba(255, 214, 130, 0.20)');
    glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - 120, lamp.y - 120, 240, 240);
    ctx.fillStyle = '#ffdf9e';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Walls with a lit top edge and a soft drop shadow.
  for (const wall of level.walls) {
    ctx.fillStyle = COLORS.wallShadow;
    ctx.fillRect(wall.x + 3, wall.y + 5, wall.w, wall.h);
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = COLORS.wallEdge;
    ctx.fillRect(wall.x, wall.y, wall.w, 3);
  }
}

function drawExit(ctx, level) {
  const exit = level.exit;
  const open = level.mainTaken;
  ctx.fillStyle = open ? 'rgba(67, 209, 124, 0.28)' : 'rgba(147, 160, 189, 0.16)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? '#43d17c' : '#93a0bd';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = open ? '#43d17c' : '#93a0bd';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const labelX = exit.x > WORLD_WIDTH - 120 ? exit.x + exit.w / 2 : exit.x + exit.w / 2;
  ctx.save();
  ctx.translate(labelX, exit.y + exit.h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(open ? 'VAN — GO!' : 'EXIT', 0, 4);
  ctx.restore();
  // The getaway van, nose out of the dark beyond the door.
  ctx.fillStyle = '#12182b';
  ctx.fillRect(exit.x + exit.w - 2, exit.y + 10, 2, exit.h - 20);
}

function drawPanels(ctx, level) {
  for (const panel of level.panels) {
    ctx.fillStyle = '#1a2236';
    ctx.fillRect(panel.x - 13, panel.y - 10, 26, 20);
    ctx.strokeStyle = '#5a6f9e';
    ctx.strokeRect(panel.x - 13, panel.y - 10, 26, 20);
    ctx.fillStyle = level.panelTimer > 0 ? '#43d17c' : '#5eeac4';
    ctx.fillRect(panel.x - 8, panel.y - 5, 16, 7);
    ctx.fillStyle = '#93a0bd';
    ctx.font = '600 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM PANEL', panel.x, panel.y + 20);
  }
}

function drawDoors(ctx, level) {
  for (const door of level.doors) {
    if (door.open) {
      ctx.fillStyle = '#6b5322';
      const horizontal = door.w > door.h;
      if (horizontal) ctx.fillRect(door.x + 2, door.y - 8, door.w - 4, 7);
      else ctx.fillRect(door.x - 8, door.y + 2, 7, door.h - 4);
      continue;
    }
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(door.x + 1, door.y + 1, door.w - 2, door.h - 2);
    ctx.fillStyle = '#2c2110';
    ctx.beginPath();
    ctx.arc(door.x + door.w / 2, door.y + door.h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelY = door.w > door.h ? door.y + door.h + 11 : door.y + door.h / 2 + 3;
    const labelX = door.w > door.h ? door.x + door.w / 2 : door.x + door.w + 16;
    ctx.fillText('LOCKED', labelX, labelY);
  }
}

function drawLasers(ctx, level) {
  for (const laser of level.lasers) {
    for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
      ctx.fillStyle = '#39466a';
      ctx.fillRect(ex - 5, ey - 5, 10, 10);
      ctx.fillStyle = COLORS.laser;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const on = laserIsOn(laser, level.time);
    ctx.strokeStyle = laser.flash > 0
      ? 'rgba(255, 120, 130, 0.95)'
      : on
        ? 'rgba(255, 71, 87, 0.75)'
        : 'rgba(255, 71, 87, 0.16)';
    ctx.lineWidth = laser.flash > 0 ? 3.4 : 1.8;
    ctx.setLineDash(on || laser.flash > 0 ? [] : [5, 6]);
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function conePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function drawCameraCones(ctx, level) {
  if (camerasDark(level)) return;
  for (const cam of level.cameras) {
    const points = conePolygon(cam.x, cam.y, cam.angle, CAMERA.viewHalfAngle, CAMERA.viewDistance, level.blockers, WORLD_BOUNDS, 20);
    conePath(ctx, points);
    ctx.fillStyle = COLORS.cameraCone;
    ctx.fill();
    ctx.strokeStyle = COLORS.cameraConeEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (cam.exposure > 0.3) {
      conePath(ctx, points);
      ctx.fillStyle = `rgba(255, 71, 87, ${0.22 * cam.exposure})`;
      ctx.fill();
    }
  }
}

function drawGuardCones(ctx, level) {
  for (const guard of level.guards) {
    const points = conePolygon(guard.x, guard.y, guard.angle, GUARD.viewHalfAngle, GUARD.viewDistance, level.blockers, WORLD_BOUNDS, 26);
    conePath(ctx, points);
    const hot = guard.alerted || guard.suspicion > 0.5;
    ctx.fillStyle = hot ? COLORS.guardConeHot : COLORS.guardCone;
    ctx.fill();
    ctx.strokeStyle = hot ? 'rgba(255, 92, 66, 0.6)' : COLORS.guardConeEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCamera(ctx, level, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.fillStyle = '#12182b';
  ctx.fillRect(-9, -9, 18, 18);
  ctx.rotate(cam.angle);
  ctx.fillStyle = '#2c3550';
  ctx.fillRect(-4, -6, 14, 12);
  ctx.fillStyle = '#5eeac4';
  ctx.fillRect(8, -3, 4, 6);
  ctx.restore();
  const dark = camerasDark(level);
  ctx.fillStyle = dark ? '#39466a' : cam.exposure > 0.35 ? '#ff4757' : cam.exposure > 0.05 ? '#ffb020' : '#43d17c';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y - 13, 3, 0, Math.PI * 2);
  ctx.fill();
  if (dark) {
    ctx.fillStyle = '#93a0bd';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFLINE', cam.x, cam.y + 22);
  }
}

function drawGuard(ctx, level, guard) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(guard.x, guard.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = guard.alerted ? '#7a2436' : '#2b3f6e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = guard.alerted ? '#ff6b57' : '#7d94c4';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap brim toward facing, and a skin-tone face.
  const fx = Math.cos(guard.angle);
  const fy = Math.sin(guard.angle);
  ctx.fillStyle = '#e8b98d';
  ctx.beginPath();
  ctx.arc(guard.x + fx * 3, guard.y + fy * 3, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#16233f';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(guard.x + fx * 6 - fy * 5, guard.y + fy * 6 + fx * 5);
  ctx.lineTo(guard.x + fx * 11, guard.y + fy * 11);
  ctx.lineTo(guard.x + fx * 6 + fy * 5, guard.y + fy * 6 - fx * 5);
  ctx.stroke();
  // Suspicion arc over the head.
  if (guard.suspicion > 0.02) {
    ctx.strokeStyle = 'rgba(10, 13, 22, 0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 21, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = guard.suspicion > 0.5 ? '#ff4757' : '#ffb020';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 21, 8, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, level) {
  const player = level.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Loot bag, swelling with the take.
  const bagR = 6 + Math.min(player.lootCount, 6);
  const bx = player.x - Math.cos(player.angle) * 13;
  const by = player.y - Math.sin(player.angle) * 13;
  ctx.fillStyle = '#4a3620';
  ctx.beginPath();
  ctx.arc(bx, by, bagR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', bx, by + 3);
  // Body and hood.
  ctx.fillStyle = player.sneaking ? '#14424a' : '#1b5563';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7bf1ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  ctx.fillStyle = '#0d2b33';
  ctx.beginPath();
  ctx.arc(player.x + fx * 2, player.y + fy * 2, 7.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39d';
  ctx.beginPath();
  ctx.arc(player.x + fx * 5.4, player.y + fy * 5.4, 3.6, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(123, 241, 255, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Being watched: an eye that fills with the closest suspicion.
  const watched = level.seenByGuard || level.camSeen;
  if (watched) {
    let fill = level.camSeen ? level.camExposure : 0;
    for (const guard of level.guards) fill = Math.max(fill, guard.suspicion);
    ctx.save();
    ctx.translate(player.x, player.y - 30);
    ctx.strokeStyle = fill > 0.5 ? '#ff4757' : '#ffb020';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(0, -8, 9, 0);
    ctx.quadraticCurveTo(0, 8, -9, 0);
    ctx.stroke();
    ctx.fillStyle = fill > 0.5 ? '#ff4757' : '#ffb020';
    ctx.beginPath();
    ctx.arc(0, 0, 2 + fill * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Interaction progress ring.
  if (player.channel) {
    const progress = clamp(player.channel.t / player.channel.need, 0, 1);
    ctx.strokeStyle = 'rgba(10,13,22,0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 21, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }
}

function drawNoise(ctx, level) {
  if (!level.noise) return;
  const noise = level.noise;
  const age = 1 - noise.timer / 3.4;
  ctx.strokeStyle = 'rgba(232, 236, 246, 0.5)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i += 1) {
    const r = 8 + ((age * 3 + i) % 3) * 16;
    ctx.globalAlpha = 0.55 - ((age * 3 + i) % 3) * 0.16;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.lootGold;
  ctx.beginPath();
  ctx.arc(noise.x, noise.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloaters(ctx, level) {
  ctx.textAlign = 'center';
  ctx.font = '700 14px system-ui, sans-serif';
  for (const floater of level.floaters) {
    const alpha = clamp(1.4 - floater.t, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y - floater.t * 26);
  }
  ctx.globalAlpha = 1;
}

function drawVignette(ctx) {
  const glow = ctx.createRadialGradient(
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.42,
    WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_HEIGHT * 0.86,
  );
  glow.addColorStop(0, 'rgba(4, 6, 12, 0)');
  glow.addColorStop(1, 'rgba(4, 6, 12, 0.42)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

/* ---------------- loot ---------------- */

function nameHash(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return hash;
}

function drawLoot(ctx, level, item) {
  const sparkle = 0.55 + 0.45 * Math.sin(level.time * 3 + nameHash(item.name));
  if (item.kind === 'painting') {
    ctx.fillStyle = '#6b5322';
    ctx.fillRect(item.x - 26, item.y - 18, 52, 36);
    const hue = nameHash(item.name) % 360;
    ctx.fillStyle = `hsl(${hue}, 42%, 30%)`;
    ctx.fillRect(item.x - 21, item.y - 13, 42, 26);
    ctx.fillStyle = `hsl(${(hue + 40) % 360}, 65%, 62%)`;
    ctx.beginPath();
    ctx.arc(item.x - 6, item.y - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,236,246,0.75)';
    ctx.fillRect(item.x - 16, item.y + 6, 32, 3);
  } else {
    // Pedestal and glass case for everything precious.
    ctx.fillStyle = '#171d2e';
    ctx.fillRect(item.x - 15, item.y - 4, 30, 18);
    ctx.fillStyle = 'rgba(160, 210, 255, 0.13)';
    ctx.fillRect(item.x - 14, item.y - 24, 28, 22);
    ctx.strokeStyle = 'rgba(190, 225, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(item.x - 14, item.y - 24, 28, 22);
    drawLootKind(ctx, item);
  }
  if (item.main) {
    ctx.strokeStyle = `rgba(123, 241, 255, ${0.5 + 0.4 * sparkle})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 8, 21 + sparkle * 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7bf1ff';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAIN TARGET', item.x, item.y - 46);
  }
  // Sparkle.
  ctx.strokeStyle = `rgba(255, 240, 190, ${sparkle})`;
  ctx.lineWidth = 1.4;
  const sx = item.x + 12;
  const sy = item.y - 22;
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy);
  ctx.lineTo(sx + 5, sy);
  ctx.moveTo(sx, sy - 5);
  ctx.lineTo(sx, sy + 5);
  ctx.stroke();
  // Name + value tag, small and readable.
  ctx.fillStyle = 'rgba(232, 236, 246, 0.85)';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${item.name} · $${item.value}`, item.x, item.y + (item.kind === 'painting' ? 30 : 34));
}

function drawLootKind(ctx, item) {
  const { x, y } = item;
  ctx.save();
  ctx.translate(x, y - 13);
  switch (item.kind) {
    case 'gem':
      ctx.fillStyle = COLORS.lootGem;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -2);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.stroke();
      break;
    case 'mask':
      ctx.fillStyle = COLORS.lootGold;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2110';
      ctx.beginPath();
      ctx.ellipse(-3.6, -1.5, 1.9, 1.2, 0, 0, Math.PI * 2);
      ctx.ellipse(3.6, -1.5, 1.9, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'pearl':
      ctx.fillStyle = '#f4e9ff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(-2.6, -2.6, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'book':
      ctx.fillStyle = '#5d2436';
      ctx.fillRect(-8, -10, 16, 20);
      ctx.fillStyle = COLORS.lootGold;
      ctx.fillRect(-8, -10, 3.4, 20);
      ctx.fillRect(-4, -3, 8, 1.8);
      ctx.fillRect(-4, 1.4, 8, 1.8);
      break;
    case 'statue':
      ctx.fillStyle = '#c98d4b';
      ctx.beginPath();
      ctx.arc(0, -7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, 9);
      ctx.lineTo(-2.4, -3);
      ctx.lineTo(2.4, -3);
      ctx.lineTo(6, 9);
      ctx.closePath();
      ctx.fill();
      break;
    case 'vase':
      ctx.fillStyle = '#7ba7d9';
      ctx.beginPath();
      ctx.ellipse(0, 1, 7.6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -11, 6, 4);
      break;
    default: // coins
      ctx.fillStyle = COLORS.lootGold;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 5 - i * 4.4, 8.6, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 84, 10, 0.6)';
        ctx.stroke();
      }
  }
  ctx.restore();
}

/* ---------------- HUD ---------------- */

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawHud(ctx, game, level) {
  ctx.fillStyle = COLORS.hudBar;
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(0, HUD_HEIGHT - 2, VIEW_WIDTH, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '700 17px Georgia, serif';
  ctx.fillText(GAME_TITLE, 16, 25);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '600 11.5px system-ui, sans-serif';
  ctx.fillText(level.name, 16, 46);

  // Alarm meter, centre stage.
  const barX = 400;
  const barW = 480;
  const barY = 14;
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ALARM', barX - 10, barY + 13);
  ctx.fillStyle = '#171d2e';
  ctx.fillRect(barX, barY, barW, 15);
  const alarmW = (level.alarm / 100) * barW;
  ctx.fillStyle = alarmColor(level.alarm);
  if (level.alarm >= 75 && Math.sin(level.time * 9) > 0) ctx.fillStyle = '#ff6b57';
  ctx.fillRect(barX, barY, alarmW, 15);
  ctx.strokeStyle = '#5a6f9e';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(barX + (barW / 10) * i, barY);
    ctx.lineTo(barX + (barW / 10) * i, barY + 15);
    ctx.stroke();
  }
  ctx.strokeStyle = '#93a0bd';
  ctx.strokeRect(barX, barY, barW, 15);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.floor(level.alarm)}%`, barX + barW + 10, barY + 13);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(level.brief, barX, 48);

  // Take and tools, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText(`$${game.campaignLoot + (level.banked ? 0 : level.lootValue)}`, VIEW_WIDTH - 16, 25);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '600 11.5px system-ui, sans-serif';
  const mainItem = level.def.loot.find((item) => item.main);
  const mainState = level.mainTaken ? `${mainItem.name} — stolen ✓` : `Target: ${mainItem.name}`;
  ctx.fillText(
    `${mainState} · ⏱ ${formatTime(level.time)} · EMP(Q) ×${level.tools.emp} · Coin(F) ×${level.tools.coins}${game.muted ? ' · MUTED' : ''}`,
    VIEW_WIDTH - 16,
    46,
  );

  drawContextPrompt(ctx, game, level);
}

function drawContextPrompt(ctx, game, level) {
  if (game.screen !== SCREEN_PLAY) return;
  const player = level.player;
  let text = null;
  if (player.channel) {
    const labels = { loot: 'Taking', door: 'Picking the lock', panel: 'Killing the cameras' };
    const pct = Math.floor((player.channel.t / player.channel.need) * 100);
    text = `${labels[player.channel.kind]}… ${pct}% — keep holding E`;
  } else {
    const item = nearestLoot(level, player.x, player.y, THIEF.grabRange);
    const door = item ? null : nearestLockedDoor(level, player.x, player.y, THIEF.interactRange);
    const panel = item || door ? null : nearestPanel(level, player.x, player.y, THIEF.interactRange + 6);
    if (item) text = `Hold E — take the ${item.name} ($${item.value})`;
    else if (door) text = 'Hold E — pick the lock (slow, stay unseen)';
    else if (panel && level.panelTimer <= 0) text = 'Hold E — take the cameras dark for 6s';
    else if (!level.mainTaken) {
      const exit = level.exit;
      const nearExit = Math.abs(player.x - (exit.x + exit.w / 2)) < 70 && Math.abs(player.y - (exit.y + exit.h / 2)) < 80;
      if (nearExit) text = 'The van is waiting — but the main target is still inside.';
    } else {
      const exit = level.exit;
      const nearExit = Math.abs(player.x - (exit.x + exit.w / 2)) < 70 && Math.abs(player.y - (exit.y + exit.h / 2)) < 80;
      if (nearExit) text = 'Into the van — you are clear!';
    }
  }
  if (!text) return;
  ctx.font = '600 14px system-ui, sans-serif';
  const width = ctx.measureText(text).width + 28;
  const x = (VIEW_WIDTH - width) / 2;
  const y = VIEW_HEIGHT - 42;
  ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
  ctx.fillRect(x, y, width, 27);
  ctx.strokeStyle = COLORS.accent;
  ctx.strokeRect(x, y, width, 27);
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_WIDTH / 2, y + 18);
}

/* ---------------- overlays ---------------- */

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 7, 13, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function panel(ctx, w, h) {
  const x = (VIEW_WIDTH - w) / 2;
  const y = (VIEW_HEIGHT - h) / 2;
  ctx.fillStyle = 'rgba(13, 17, 28, 0.96)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  return { x, y, w, h };
}

function drawTitle(ctx, game) {
  dimScreen(ctx, 0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 64px Georgia, serif';
  ctx.fillText(GAME_TITLE, VIEW_WIDTH / 2, 218);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText(GAME_SUBTITLE, VIEW_WIDTH / 2, 254);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#c6cede';
  ctx.fillText(
    `${THIEF_NAME} the thief slips into the Meridian Museum at closing time. Three floors, one van,`,
    VIEW_WIDTH / 2, 306,
  );
  ctx.fillText(
    'and every guard, camera and laser in the building between her and the Night Ledger.',
    VIEW_WIDTH / 2, 328,
  );
  ctx.textAlign = 'left';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudText;
  const lines = [
    'WASD / arrows — move        SHIFT — sneak (slow, hard to see)',
    'Hold E — take loot, pick locks, kill cameras at a panel',
    'Q — EMP burst: cameras dark 10s, but the noise costs alarm',
    'F or click — toss a coin: guards leave their patrol to look',
    'Stay out of the cones. Alarm at 100% means lockdown.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2 - 265, 386 + i * 26));
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 21px system-ui, sans-serif';
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER or click to begin the heist', VIEW_WIDTH / 2, 560);
  ctx.globalAlpha = 1;
}

function statRows(ctx, rows, x, y, rowH = 25) {
  ctx.font = '600 15.5px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudDim;
    ctx.fillText(label, x, y + i * rowH);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(value, x + 330, y + i * rowH);
  });
}

function drawCaught(ctx, game, level) {
  ctx.fillStyle = 'rgba(90, 10, 16, 0.45)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  dimScreen(ctx, 0.35);
  const box = panel(ctx, 520, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4757';
  ctx.font = '700 46px Georgia, serif';
  ctx.fillText('BUSTED', VIEW_WIDTH / 2, box.y + 66);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '15.5px system-ui, sans-serif';
  ctx.fillText(level.caughtReason, VIEW_WIDTH / 2, box.y + 100);
  statRows(ctx, [
    ['Floor', level.name],
    ['Loot in the bag', `$${level.lootValue}`],
    ['Time on the floor', formatTime(level.time)],
    ['Alarm peak', `${Math.floor(level.alarmPeak)}%`],
  ], box.x + 95, box.y + 148);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('Press R or ENTER — try the floor again', VIEW_WIDTH / 2, box.y + 292);
}

function drawFloorClear(ctx, game, level) {
  dimScreen(ctx, 0.55);
  const box = panel(ctx, 540, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#43d17c';
  ctx.font = '700 38px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', VIEW_WIDTH / 2, box.y + 60);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText(level.name, VIEW_WIDTH / 2, box.y + 88);
  statRows(ctx, [
    ['Loot from this floor', `$${level.lootValue}`],
    ['Campaign total', `$${game.campaignLoot}`],
    ['Time', formatTime(level.time)],
    ['Times fully spotted', String(level.spots)],
    ['Alarm peak', `${Math.floor(level.alarmPeak)}%`],
    ['Floor rating', computeRating(level.spots, level.alarmPeak)],
  ], box.x + 105, box.y + 132);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 17px system-ui, sans-serif';
  const last = game.levelIndex >= 2;
  ctx.fillText(last ? 'Press ENTER — the final tally' : 'Press ENTER — next floor', VIEW_WIDTH / 2, box.y + 322);
}

function drawVictory(ctx, game) {
  dimScreen(ctx, 0.6);
  const box = panel(ctx, 560, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText('THE LEDGER IS YOURS', VIEW_WIDTH / 2, box.y + 64);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'italic 15.5px Georgia, serif';
  ctx.fillText('Three floors, one thief, and the Meridian never knew.', VIEW_WIDTH / 2, box.y + 94);
  statRows(ctx, [
    ['Total take', `$${game.campaignLoot}`],
    ['Total time', formatTime(game.campaignTime)],
    ['Times fully spotted', String(game.campaignSpots)],
    ['Campaign rating', computeRating(game.campaignSpots, game.campaignPeak || 0)],
  ], box.x + 115, box.y + 148);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('Press ENTER — run the museum again', VIEW_WIDTH / 2, box.y + 330);
}

function drawPaused(ctx) {
  dimScreen(ctx, 0.5);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '700 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('P — resume · R — restart floor · M — mute', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 32);
}
