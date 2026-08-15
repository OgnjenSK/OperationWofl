import { audio } from './state.js';

export function ensureAudio() {
  if (!audio.ctx) {
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio.ctx = null;
    }
  }
  return audio.ctx;
}

export function playTone(freq, dur, gain) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  gn.gain.value = gain;
  o.connect(gn);
  gn.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  o.stop(t + dur);
  gn.gain.setValueAtTime(gain, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
}

/** Player shot — suppressed / silenced gun. */
export function playShootSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.12;

  // Soft muffled punch (no sharp crack)
  const punch = ctx.createOscillator();
  const punchGain = ctx.createGain();
  punch.type = 'sine';
  punch.frequency.setValueAtTime(140, t);
  punch.frequency.exponentialRampToValueAtTime(55, t + 0.08);
  punchGain.gain.setValueAtTime(0.0001, t);
  punchGain.gain.exponentialRampToValueAtTime(0.2, t + 0.004);
  punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  punch.connect(punchGain);
  punchGain.connect(ctx.destination);
  punch.start(t);
  punch.stop(t + 0.09);

  // Short dull air puff through the suppressor
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.4);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(280, t + dur);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.14, t + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);
  noise.stop(t + dur);
}

/** Sharp stab/pierce when an enemy dies. */
export function playHitSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Blade tip — quick high metallic ping
  const tip = ctx.createOscillator();
  const tipGain = ctx.createGain();
  tip.type = 'square';
  tip.frequency.setValueAtTime(1400, t);
  tip.frequency.exponentialRampToValueAtTime(280, t + 0.07);
  tipGain.gain.setValueAtTime(0.0001, t);
  tipGain.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
  tipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  tip.connect(tipGain);
  tipGain.connect(ctx.destination);
  tip.start(t);
  tip.stop(t + 0.08);

  // Body thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(120, t);
  thud.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  thudGain.gain.setValueAtTime(0.0001, t);
  thudGain.gain.exponentialRampToValueAtTime(0.08, t + 0.008);
  thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(t);
  thud.stop(t + 0.14);

  // Short scrape noise
  const dur = 0.1;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.04, t + 0.006);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);
  noise.stop(t + dur);
}

export function playEnemyShootSound() { playTone(220, 0.08, 0.08); }

/** Quick laser/zing for desert basic attacks. */
export function playDesertLaserSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.11;
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(1680, t);
  o.frequency.exponentialRampToValueAtTime(220, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(gn);
  gn.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

/** Soft whoosh for dragon wing flaps — one per fly-loop. */
export function playWingFlapSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const duration = 0.14;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.pow(1 - i / bufferSize, 1.6);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(520, t);
  filter.frequency.exponentialRampToValueAtTime(160, t + duration);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.16, t + 0.018);
  gn.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(filter);
  filter.connect(gn);
  gn.connect(ctx.destination);
  src.start(t);
  src.stop(t + duration);
}

/** Soft blazing whoosh for dragon attacks (quieter, less crisp). */
export function playFireballSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.28;

  // Warm roar (higher pitch)
  const roar = ctx.createOscillator();
  const roarGain = ctx.createGain();
  roar.type = 'sine';
  roar.frequency.setValueAtTime(340, t);
  roar.frequency.exponentialRampToValueAtTime(160, t + dur);
  roarGain.gain.setValueAtTime(0.0001, t);
  roarGain.gain.exponentialRampToValueAtTime(0.055, t + 0.04);
  roarGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  roar.connect(roarGain);
  roarGain.connect(ctx.destination);
  roar.start(t);
  roar.stop(t + dur);

  // Soft flame wash (heavily low-passed noise)
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI) * 0.9;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1600, t);
  lp.frequency.exponentialRampToValueAtTime(520, t + dur);
  lp.Q.value = 0.4;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.065, t + 0.05);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);
  noise.stop(t + dur);

  // Mid shimmer (higher)
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(720, t);
  shimmer.frequency.exponentialRampToValueAtTime(320, t + dur);
  shimmerGain.gain.setValueAtTime(0.0001, t);
  shimmerGain.gain.exponentialRampToValueAtTime(0.028, t + 0.05);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.start(t);
  shimmer.stop(t + dur);

  // Light echo / slapback of the flame wash
  const echo = ctx.createBufferSource();
  echo.buffer = buffer;
  const echoLp = ctx.createBiquadFilter();
  echoLp.type = 'lowpass';
  echoLp.frequency.value = 820;
  const echoGain = ctx.createGain();
  const echoDelay = 0.07;
  echoGain.gain.setValueAtTime(0.0001, t + echoDelay);
  echoGain.gain.exponentialRampToValueAtTime(0.03, t + echoDelay + 0.04);
  echoGain.gain.exponentialRampToValueAtTime(0.001, t + echoDelay + dur * 0.9);
  echo.connect(echoLp);
  echoLp.connect(echoGain);
  echoGain.connect(ctx.destination);
  echo.start(t + echoDelay);
  echo.stop(t + echoDelay + dur);
}
