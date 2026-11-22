// Geometry helpers: angles, line of sight and raycasts against wall
// rectangles. The museum is axis-aligned boxes, so every query here is a
// slab test or a segment test — cheap enough to run per ray, per frame.

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Smallest signed difference from angle `from` to angle `to`, in (-PI, PI]. */
export function angleDifference(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Turn `current` toward `target` by at most `maxStep` radians. */
export function turnToward(current, target, maxStep) {
  const diff = angleDifference(current, target);
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function pointInAnyRect(x, y, rects) {
  for (let i = 0; i < rects.length; i += 1) {
    if (pointInRect(x, y, rects[i])) return true;
  }
  return false;
}

/** True when the segment (x1,y1)-(x2,y2) touches or crosses the rect. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;
  return (
    segmentsCross(x1, y1, x2, y2, left, top, right, top) ||
    segmentsCross(x1, y1, x2, y2, right, top, right, bottom) ||
    segmentsCross(x1, y1, x2, y2, right, bottom, left, bottom) ||
    segmentsCross(x1, y1, x2, y2, left, bottom, left, top)
  );
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = direction(cx, cy, dx, dy, ax, ay);
  const d2 = direction(cx, cy, dx, dy, bx, by);
  const d3 = direction(ax, ay, bx, by, cx, cy);
  const d4 = direction(ax, ay, bx, by, dx, dy);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function direction(px, py, qx, qy, rx, ry) {
  return (qx - px) * (ry - py) - (qy - py) * (rx - px);
}

/** True when nothing in `blockers` stands between the two points. */
export function lineOfSight(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/**
 * Distance from (x, y) along `angle` until the ray meets a blocker rect or
 * the world bounds; `maxDistance` when it meets nothing.
 */
export function raycastDistance(x, y, angle, maxDistance, blockers, bounds) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDistance;
  for (let i = 0; i < blockers.length; i += 1) {
    const t = rayRectEntry(x, y, dx, dy, blockers[i]);
    if (t !== null && t < best) best = t;
  }
  if (bounds) {
    const boundT = rayRectExit(x, y, dx, dy, bounds);
    if (boundT !== null && boundT < best) best = boundT;
  }
  return best;
}

/** Exit distance of a ray out of a rect it starts inside (slab method). */
function rayRectExit(x, y, dx, dy, rect) {
  let tMax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (x < rect.x || x > rect.x + rect.w) return null;
  } else {
    const t1 = (rect.x - x) / dx;
    const t2 = (rect.x + rect.w - x) / dx;
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (Math.abs(dy) < 1e-9) {
    if (y < rect.y || y > rect.y + rect.h) return null;
  } else {
    const t1 = (rect.y - y) / dy;
    const t2 = (rect.y + rect.h - y) / dy;
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  return tMax === Infinity ? null : tMax;
}

/** Entry distance of a ray into a rect (slab method), or null when it misses. */
function rayRectEntry(x, y, dx, dy, rect) {
  let tMin = 0;
  let tMax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (x < rect.x || x > rect.x + rect.w) return null;
  } else {
    let t1 = (rect.x - x) / dx;
    let t2 = (rect.x + rect.w - x) / dx;
    if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
  }
  if (Math.abs(dy) < 1e-9) {
    if (y < rect.y || y > rect.y + rect.h) return null;
  } else {
    let t1 = (rect.y - y) / dy;
    let t2 = (rect.y + rect.h - y) / dy;
    if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
  }
  if (tMax < tMin) return null;
  return tMin;
}

/**
 * The visible polygon of a vision cone: a fan of rays from the eye, clipped
 * by walls. Returns points around the eye, ready for a canvas path.
 */
export function conePolygon(x, y, facing, halfAngle, range, blockers, bounds, rays = 26) {
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const angle = facing - halfAngle + (2 * halfAngle * i) / rays;
    const d = raycastDistance(x, y, angle, range, blockers, bounds);
    points.push({ x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d });
  }
  return points;
}

/**
 * Move a circle out of every rect it overlaps; returns the corrected centre.
 * Used for the thief and the guards so bodies slide along walls.
 */
export function resolveCircleRects(x, y, radius, rects) {
  let cx = x;
  let cy = y;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      const nearX = clamp(cx, rect.x, rect.x + rect.w);
      const nearY = clamp(cy, rect.y, rect.y + rect.h);
      const dx = cx - nearX;
      const dy = cy - nearY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= radius * radius) continue;
      if (distSq > 1e-9) {
        const dist = Math.sqrt(distSq);
        cx = nearX + (dx / dist) * radius;
        cy = nearY + (dy / dist) * radius;
      } else {
        // Centre is inside the rect: push out along the smallest exit.
        const exits = [
          { d: cx - rect.x, x: rect.x - radius, y: cy },
          { d: rect.x + rect.w - cx, x: rect.x + rect.w + radius, y: cy },
          { d: cy - rect.y, x: cx, y: rect.y - radius },
          { d: rect.y + rect.h - cy, x: cx, y: rect.y + rect.h + radius },
        ];
        exits.sort((a, b) => a.d - b.d);
        cx = exits[0].x;
        cy = exits[0].y;
      }
    }
  }
  return { x: cx, y: cy };
}
