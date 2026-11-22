// Procedural sound with the Web Audio API: no audio files, every effect is
// synthesized. The context wakes on the first key press or click, as
// browsers require, and M toggles mute from main.js.

let context = null;
let master = null;
let muted = false;
let ambientStarted = false;

export function initAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.42;
    master.connect(context.destination);
    startAmbient();
  } catch (err) {
    context = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master && context) master.gain.setValueAtTime(muted ? 0 : 0.42, context.currentTime);
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, { type = 'sine', gain = 0.2, delay = 0, slideTo = null } = {}) {
  if (!context || !master) return;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + seconds);
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0008, start + seconds);
  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noiseBurst(seconds, gain, delay = 0) {
  if (!context || !master) return;
  const start = context.currentTime + delay;
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const amp = context.createGain();
  amp.gain.value = gain;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  source.connect(filter);
  filter.connect(amp);
  amp.connect(master);
  source.start(start);
}

/** A low, slow museum-at-night hum: two detuned triangles under a soft LFO. */
function startAmbient() {
  if (!context || !master || ambientStarted) return;
  ambientStarted = true;
  const amp = context.createGain();
  amp.gain.value = 0.016;
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.006;
  lfo.connect(lfoGain);
  lfoGain.connect(amp.gain);
  for (const freq of [110, 110.7, 165.2]) {
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(amp);
    osc.start();
  }
  amp.connect(master);
  lfo.start();
}

export function playUiClick() {
  tone(660, 0.07, { type: 'triangle', gain: 0.12 });
}

export function playLootChime(mainTarget) {
  const base = mainTarget ? 523.25 : 659.25;
  tone(base, 0.16, { type: 'sine', gain: 0.2 });
  tone(base * 1.25, 0.18, { type: 'sine', gain: 0.18, delay: 0.07 });
  tone(base * 1.5, 0.3, { type: 'sine', gain: 0.16, delay: 0.14 });
  if (mainTarget) tone(base * 2, 0.42, { type: 'triangle', gain: 0.14, delay: 0.22 });
}

export function playPickTick() {
  noiseBurst(0.03, 0.1);
  tone(1900, 0.03, { type: 'square', gain: 0.05 });
}

export function playDoorOpen() {
  tone(196, 0.22, { type: 'triangle', gain: 0.16, slideTo: 262 });
  noiseBurst(0.12, 0.05, 0.03);
}

export function playCoinToss() {
  tone(1245, 0.09, { type: 'sine', gain: 0.14 });
  tone(1568, 0.12, { type: 'sine', gain: 0.12, delay: 0.09 });
  tone(2093, 0.2, { type: 'sine', gain: 0.1, delay: 0.34 });
}

export function playEmpZap() {
  tone(1400, 0.28, { type: 'sawtooth', gain: 0.12, slideTo: 90 });
  noiseBurst(0.22, 0.14);
}

export function playPanelHum() {
  tone(440, 0.12, { type: 'sine', gain: 0.1 });
  tone(587, 0.2, { type: 'sine', gain: 0.1, delay: 0.1 });
}

export function playSpotted() {
  tone(988, 0.09, { type: 'square', gain: 0.12 });
  tone(988, 0.12, { type: 'square', gain: 0.12, delay: 0.11 });
}

export function playSuspicious() {
  tone(740, 0.08, { type: 'square', gain: 0.07 });
}

export function playAlarmBeep() {
  tone(1175, 0.1, { type: 'square', gain: 0.09 });
}

export function playLaserTrip() {
  tone(1568, 0.16, { type: 'sawtooth', gain: 0.14, slideTo: 784 });
  tone(1568, 0.16, { type: 'sawtooth', gain: 0.12, delay: 0.18, slideTo: 784 });
}

export function playCaughtSting() {
  tone(392, 0.3, { type: 'triangle', gain: 0.2 });
  tone(311, 0.34, { type: 'triangle', gain: 0.2, delay: 0.22 });
  tone(233, 0.6, { type: 'triangle', gain: 0.2, delay: 0.46 });
  noiseBurst(0.4, 0.06, 0.1);
}

export function playWinJingle() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => tone(freq, 0.24, { type: 'triangle', gain: 0.16, delay: i * 0.11 }));
  tone(1318.5, 0.5, { type: 'sine', gain: 0.12, delay: 0.46 });
}

export function playStepNoise() {
  noiseBurst(0.04, 0.03);
}
