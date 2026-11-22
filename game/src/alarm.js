// The alarm meter: one number the whole heist hangs on. Being watched —
// by a guard's eyes or a camera's lens — pushes it up; staying unseen lets
// it bleed away. At 100 the museum locks down and the run is over.

import { ALARM } from './config.js';
import { clamp } from './geometry.js';
import { playAlarmBeep } from './audio.js';

export function updateAlarm(level, dt) {
  let rising = false;
  if (level.seenByGuard) {
    level.alarm += ALARM.guardWatchRate * dt;
    rising = true;
  }
  if (level.camSeen) {
    level.alarm += ALARM.cameraRate * (0.4 + 0.6 * level.camExposure) * dt;
    rising = true;
  }
  if (!rising) {
    level.alarm -= ALARM.decayRate * dt;
  }
  level.alarm = clamp(level.alarm, 0, ALARM.max);
  level.alarmPeak = Math.max(level.alarmPeak, level.alarm);

  if (level.alarm >= ALARM.dangerLine) {
    level.beepTimer -= dt;
    if (level.beepTimer <= 0) {
      level.beepTimer = 0.55;
      playAlarmBeep();
    }
  }
  if (level.alarm >= ALARM.max && !level.caughtReason) {
    level.caughtReason = 'The alarm hit 100% — the museum locked down.';
  }
}

/** Green, amber or red, for the HUD bar and the warning light. */
export function alarmColor(value) {
  if (value >= ALARM.dangerLine) return '#ff4757';
  if (value >= 40) return '#ffb020';
  return '#43d17c';
}
