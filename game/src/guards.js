// Guard brains: waypoint patrols with scanning pauses, a suspicion meter
// that fills while the thief is in the flashlight cone, investigation of
// noises and last-seen positions, searching, and the chase that ends the
// run if it touches the thief. Fair by design: suspicion needs a clear
// line of sight, fills slower against a sneaking thief in shadow, and a
// bump only raises the alarm — the catch needs an alerted guard.

import { GUARD, ALARM, WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import {
  clamp, angleDifference, turnToward, lineOfSight, resolveCircleRects, distance,
} from './geometry.js';
import { addFloater } from './world.js';
import { detectionFactor } from './player.js';
import { playSpotted, playSuspicious } from './audio.js';

const TURN_RATE = 3.4;

export function guardSeesPlayer(level, guard) {
  const player = level.player;
  const dist = distance(guard.x, guard.y, player.x, player.y);
  if (dist < 30) return true;
  if (dist > GUARD.viewDistance) return false;
  const bearing = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDifference(guard.angle, bearing)) > GUARD.viewHalfAngle) return false;
  return lineOfSight(guard.x, guard.y, player.x, player.y, level.blockers);
}

export function updateGuards(level, dt) {
  for (const guard of level.guards) {
    updateOneGuard(level, guard, dt);
  }
}

function updateOneGuard(level, guard, dt) {
  const player = level.player;
  const sees = guardSeesPlayer(level, guard);
  guard.seesPlayer = sees;
  const distToPlayer = distance(guard.x, guard.y, player.x, player.y);

  if (sees) {
    level.seenByGuard = true;
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    guard.memory = GUARD.memorySeconds;
  }

  // A shoulder bump is unmistakable: full suspicion, and a catch if the
  // guard was already alerted.
  if (distToPlayer < 24) {
    if (guard.alerted) {
      level.caughtReason = 'A guard caught you red-handed.';
      return;
    }
    guard.suspicion = 1;
  }

  if (sees) {
    const closeness = 1.45 - 0.9 * (distToPlayer / GUARD.viewDistance);
    guard.suspicion = clamp(guard.suspicion + closeness * detectionFactor(level) * dt, 0, 1);
    if (guard.suspicion > 0.5 && !guard.warned) {
      guard.warned = true;
      addFloater(level, guard.x, guard.y - 26, '?', '#ffb020');
      playSuspicious();
    }
  } else {
    guard.suspicion = clamp(guard.suspicion - 0.45 * dt, 0, 1);
    if (guard.suspicion < 0.2) guard.warned = false;
  }

  if (guard.suspicion >= 1 && !guard.alerted) {
    guard.alerted = true;
    level.spots += 1;
    level.alarm = Math.min(ALARM.max, level.alarm + ALARM.guardSpotHit);
    guard.mode = 'chase';
    addFloater(level, guard.x, guard.y - 28, '!', '#ff4757');
    playSpotted();
  }

  // A tossed coin pulls a patrolling guard off his route.
  if (level.noise && guard.mode === 'patrol') {
    if (distance(guard.x, guard.y, level.noise.x, level.noise.y) < level.noise.radius) {
      guard.mode = 'investigate';
      guard.investigateX = level.noise.x;
      guard.investigateY = level.noise.y;
    }
  }
  if (guard.alerted && guard.mode !== 'chase' && guard.mode !== 'search') guard.mode = 'chase';

  switch (guard.mode) {
    case 'chase':
      actChase(level, guard, dt, sees);
      break;
    case 'search':
      actSearch(level, guard, dt);
      break;
    case 'investigate':
      actInvestigate(level, guard, dt);
      break;
    case 'return':
      actReturn(level, guard, dt);
      break;
    default:
      actPatrol(level, guard, dt);
      break;
  }

  if (guard.mode === 'chase' && distToPlayer < GUARD.catchDistance) {
    level.caughtReason = 'A guard caught you red-handed.';
  }
}

function moveGuard(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 4) return true;
  const wanted = Math.atan2(dy, dx);
  guard.angle = turnToward(guard.angle, wanted, TURN_RATE * dt);
  const step = Math.min(dist, speed * dt);
  const moved = resolveCircleRects(
    guard.x + Math.cos(guard.angle) * step * (Math.abs(angleDifference(guard.angle, wanted)) < 1.2 ? 1 : 0.35),
    guard.y + Math.sin(guard.angle) * step * (Math.abs(angleDifference(guard.angle, wanted)) < 1.2 ? 1 : 0.35),
    GUARD.radius,
    level.blockers,
  );
  guard.x = clamp(moved.x, 24 + GUARD.radius, WORLD_WIDTH - 24 - GUARD.radius);
  guard.y = clamp(moved.y, 24 + GUARD.radius, WORLD_HEIGHT - 24 - GUARD.radius);
  return dist < 10;
}

function actPatrol(level, guard, dt) {
  if (guard.waitTimer > 0) {
    guard.waitTimer -= dt;
    guard.angle = guard.scanBase + Math.sin(level.time * 1.5 + guard.x) * 0.65;
    return;
  }
  const node = guard.path[guard.nodeIndex];
  if (moveGuard(level, guard, node.x, node.y, GUARD.patrolSpeed, dt)) {
    guard.waitTimer = node.wait || 0;
    guard.scanBase = guard.angle;
    advanceNode(guard);
  }
}

function advanceNode(guard) {
  if (guard.loop) {
    guard.nodeIndex = (guard.nodeIndex + 1) % guard.path.length;
    return;
  }
  guard.nodeIndex += guard.direction;
  if (guard.nodeIndex >= guard.path.length) {
    guard.direction = -1;
    guard.nodeIndex = guard.path.length - 2;
  } else if (guard.nodeIndex < 0) {
    guard.direction = 1;
    guard.nodeIndex = 1;
  }
}

function actInvestigate(level, guard, dt) {
  if (guard.seesPlayer && guard.suspicion > 0.55) {
    guard.mode = 'chase';
    return;
  }
  if (moveGuard(level, guard, guard.investigateX, guard.investigateY, GUARD.investigateSpeed, dt)) {
    guard.mode = 'search';
    guard.searchTimer = 1.8;
    guard.searchBase = guard.angle;
  }
}

function actChase(level, guard, dt, sees) {
  const player = level.player;
  const tx = sees ? player.x : guard.lastSeenX;
  const ty = sees ? player.y : guard.lastSeenY;
  moveGuard(level, guard, tx, ty, GUARD.chaseSpeed, dt);
  if (!sees) {
    guard.memory -= dt;
    if (guard.memory <= 0) {
      guard.mode = 'search';
      guard.searchTimer = GUARD.searchSeconds;
      guard.searchBase = guard.angle;
      guard.alerted = false;
      guard.suspicion = 0.55;
    }
  }
}

function actSearch(level, guard, dt) {
  guard.searchTimer -= dt;
  guard.angle = guard.searchBase + Math.sin(level.time * 2.3 + guard.y) * 0.95;
  if (guard.seesPlayer && guard.suspicion >= 1) {
    guard.mode = 'chase';
    return;
  }
  if (guard.searchTimer <= 0) {
    let best = 0;
    let bestDist = Infinity;
    guard.path.forEach((node, i) => {
      const d = distance(guard.x, guard.y, node.x, node.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    guard.returnIndex = best;
    guard.mode = 'return';
  }
}

function actReturn(level, guard, dt) {
  const node = guard.path[guard.returnIndex];
  if (moveGuard(level, guard, node.x, node.y, GUARD.investigateSpeed, dt)) {
    guard.nodeIndex = guard.returnIndex;
    advanceNode(guard);
    guard.mode = 'patrol';
    guard.waitTimer = 0;
  }
}
