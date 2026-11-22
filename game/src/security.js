// The building's electronic eyes: sweeping security cameras whose cones
// fill an exposure meter on the thief, and laser grids that blink on a
// cycle and bite hard when crossed. An EMP burst or a hacked panel turns
// every camera dark for a few seconds — the lasers are on their own wire.

import { CAMERA, LASER, ALARM } from './config.js';
import { clamp, angleDifference, lineOfSight, distance } from './geometry.js';
import { addFloater } from './world.js';
import { playLaserTrip } from './audio.js';

export function camerasDark(level) {
  return level.empTimer > 0 || level.panelTimer > 0;
}

export function laserIsOn(laser, time) {
  const t = (time + laser.offset) % laser.period;
  return t < laser.period * 0.62;
}

export function updateSecurity(level, dt) {
  const dark = camerasDark(level);
  for (const cam of level.cameras) {
    cam.angle = cam.base + Math.sin(level.time * cam.speed + cam.phase) * cam.sweep;
    cam.disabledTimer = Math.max(level.empTimer, level.panelTimer);
    if (dark) {
      cam.exposure = Math.max(0, cam.exposure - dt * 2);
      cam.seesPlayer = false;
      continue;
    }
    const player = level.player;
    const dist = distance(cam.x, cam.y, player.x, player.y);
    let inCone = false;
    if (dist < CAMERA.viewDistance) {
      const bearing = Math.atan2(player.y - cam.y, player.x - cam.x);
      if (Math.abs(angleDifference(cam.angle, bearing)) < CAMERA.viewHalfAngle) {
        inCone = lineOfSight(cam.x, cam.y, player.x, player.y, level.blockers);
      }
    }
    if (inCone) {
      cam.exposure = clamp(cam.exposure + dt / CAMERA.exposeSeconds, 0, 1);
    } else {
      cam.exposure = clamp(cam.exposure - dt / CAMERA.forgetSeconds, 0, 1);
    }
    cam.seesPlayer = cam.exposure > 0.15;
    if (cam.exposure > 0.35) {
      level.camSeen = true;
      level.camExposure = Math.max(level.camExposure, cam.exposure);
    }
  }

  for (const laser of level.lasers) {
    laser.cooldown = Math.max(0, laser.cooldown - dt);
    laser.flash = Math.max(0, laser.flash - dt);
    if (!laserIsOn(laser, level.time) || laser.cooldown > 0) continue;
    if (pointSegmentDistance(level.player, laser) < level.player.radius - 2) {
      laser.cooldown = LASER.retriggerSeconds;
      laser.flash = 0.35;
      level.alarm = Math.min(ALARM.max, level.alarm + LASER.alarmHit);
      addFloater(level, level.player.x, level.player.y - 26, 'LASER TRIPPED', '#ff4757');
      playLaserTrip();
    }
  }
}

/** Distance from the thief's centre to a laser beam segment. */
function pointSegmentDistance(player, laser) {
  const dx = laser.x2 - laser.x1;
  const dy = laser.y2 - laser.y1;
  const lengthSq = dx * dx + dy * dy;
  let t = 0;
  if (lengthSq > 0) {
    t = ((player.x - laser.x1) * dx + (player.y - laser.y1) * dy) / lengthSq;
    t = clamp(t, 0, 1);
  }
  const px = laser.x1 + dx * t;
  const py = laser.y1 + dy * t;
  return distance(player.x, player.y, px, py);
}
