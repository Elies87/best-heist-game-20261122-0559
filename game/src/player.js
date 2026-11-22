// The thief: movement, sneaking, hands-on work (grabbing loot, picking
// locks, killing cameras at a panel) and the two tools — an EMP that costs
// alarm noise and a tossed coin that pulls guards off their patrols.

import { THIEF, CAMERA, ALARM, TOOLS, WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { clamp, resolveCircleRects, pointInAnyRect } from './geometry.js';
import { isDown, wasPressed } from './input.js';
import { solidRects, nearestLoot, nearestLockedDoor, nearestPanel, addFloater } from './world.js';
import {
  playLootChime, playPickTick, playDoorOpen, playCoinToss, playEmpZap, playPanelHum, playStepNoise,
} from './audio.js';

export function playerInShadow(level) {
  return pointInAnyRect(level.player.x, level.player.y, level.shadows);
}

/** Detection multiplier from stance and cover: sneak in shadow is safest. */
export function detectionFactor(level) {
  let factor = 1;
  if (level.player.sneaking) factor *= 0.45;
  if (playerInShadow(level)) factor *= 0.5;
  return factor;
}

export function updatePlayer(level, dt, aim) {
  const player = level.player;
  player.sneaking = isDown('ShiftLeft', 'ShiftRight');

  if (player.channel) {
    updateChannel(level, dt);
    return;
  }

  updateTools(level, aim);

  let mx = 0;
  let my = 0;
  if (isDown('KeyA', 'ArrowLeft')) mx -= 1;
  if (isDown('KeyD', 'ArrowRight')) mx += 1;
  if (isDown('KeyW', 'ArrowUp')) my -= 1;
  if (isDown('KeyS', 'ArrowDown')) my += 1;
  player.moving = mx !== 0 || my !== 0;

  if (player.moving) {
    const length = Math.sqrt(mx * mx + my * my);
    let speed = player.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    speed *= 1 - Math.min(player.lootCount * 0.02, 0.12);
    if (level.mainTaken) speed *= 0.93;
    const vx = (mx / length) * speed;
    const vy = (my / length) * speed;
    player.angle = Math.atan2(vy, vx);
    const moved = resolveCircleRects(
      player.x + vx * dt,
      player.y + vy * dt,
      player.radius,
      solidRects(level),
    );
    player.x = clamp(moved.x, 24 + player.radius, WORLD_WIDTH - 24 - player.radius);
    player.y = clamp(moved.y, 24 + player.radius, WORLD_HEIGHT - 24 - player.radius);
    if (!player.sneaking) {
      player.stepTimer += dt;
      if (player.stepTimer > 0.36) {
        player.stepTimer = 0;
        playStepNoise();
      }
    }
  }

  if (isDown('KeyE')) startChannel(level);
}

function updateTools(level, aim) {
  const player = level.player;
  if (wasPressed('KeyQ') && level.tools.emp > 0 && level.empTimer <= 0) {
    level.tools.emp -= 1;
    level.empTimer = CAMERA.empSeconds;
    level.alarm = Math.min(ALARM.max, level.alarm + ALARM.empNoise);
    addFloater(level, player.x, player.y - 26, 'EMP BURST', '#7bf1ff');
    playEmpZap();
  }
  const toss = wasPressed('KeyF') || aim.clicked;
  if (toss && level.tools.coins > 0) {
    let tx = aim.x;
    let ty = aim.y;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > TOOLS.coinRange) {
      tx = player.x + (dx / dist) * TOOLS.coinRange;
      ty = player.y + (dy / dist) * TOOLS.coinRange;
    }
    if (dist > 24) {
      level.tools.coins -= 1;
      level.noise = { x: tx, y: ty, timer: TOOLS.coinLureSeconds, radius: TOOLS.coinNoiseRadius };
      addFloater(level, tx, ty - 14, 'clink!', '#e8ecf6');
      playCoinToss();
    }
  }
}

function startChannel(level) {
  const player = level.player;
  const item = nearestLoot(level, player.x, player.y, THIEF.grabRange);
  if (item) {
    player.channel = { kind: 'loot', target: item, t: 0, need: item.channel, tick: 0 };
    return;
  }
  const door = nearestLockedDoor(level, player.x, player.y, THIEF.interactRange);
  if (door) {
    player.channel = { kind: 'door', target: door, t: 0, need: door.pickSeconds, tick: 0 };
    return;
  }
  const panel = nearestPanel(level, player.x, player.y, THIEF.interactRange + 6);
  if (panel && level.panelTimer <= 0) {
    player.channel = { kind: 'panel', target: panel, t: 0, need: 1.2, tick: 0 };
  }
}

function channelAnchor(channel) {
  const target = channel.target;
  if (channel.kind === 'door') {
    return { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  }
  return { x: target.x, y: target.y };
}

function updateChannel(level, dt) {
  const player = level.player;
  const channel = player.channel;
  const anchor = channelAnchor(channel);
  const dx = anchor.x - player.x;
  const dy = anchor.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const reach = channel.kind === 'loot' ? THIEF.grabRange + 14 : THIEF.interactRange + 26;
  if (!isDown('KeyE') || dist > reach) {
    player.channel = null;
    return;
  }
  player.angle = Math.atan2(dy, dx);
  channel.t += dt;
  channel.tick += dt;
  if (channel.kind === 'door' && channel.tick > 0.26) {
    channel.tick = 0;
    playPickTick();
  }
  if (channel.t < channel.need) return;

  const target = channel.target;
  if (channel.kind === 'loot') {
    target.taken = true;
    player.lootCount += 1;
    level.lootValue += target.value;
    if (target.main) level.mainTaken = true;
    addFloater(level, target.x, target.y - 20, `+$${target.value} ${target.name}`, target.main ? '#7bf1ff' : '#ffd166');
    playLootChime(target.main);
  } else if (channel.kind === 'door') {
    target.open = true;
    target.locked = false;
    addFloater(level, anchor.x, anchor.y - 18, 'Lock picked', '#e8ecf6');
    playDoorOpen();
  } else if (channel.kind === 'panel') {
    level.panelTimer = target.disabledSeconds;
    addFloater(level, target.x, target.y - 18, 'Cameras dark', '#5eeac4');
    playPanelHum();
  }
  player.channel = null;
}
