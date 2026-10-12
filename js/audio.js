import { audio } from './state.js?v=sfx29';
import { DESERT_MUSIC_URL } from './config.js?v=sfx38';

let desertMusic = null;
let desertMusicWanted = false;

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

function ensureDesertMusic() {
  if (desertMusic) return desertMusic;
  desertMusic = new Audio(DESERT_MUSIC_URL);
  desertMusic.loop = true;
  desertMusic.preload = 'auto';
  desertMusic.volume = 0.12;
  desertMusic.setAttribute('data-track', 'desert');
  document.body.appendChild(desertMusic);
  return desertMusic;
}

function tryPlayDesertMusic() {
  if (!desertMusicWanted) return;
  const track = ensureDesertMusic();
  if (!track.paused) return;
  const play = track.play();
  if (play && play.catch) play.catch(() => {});
}

export function startDesertMusic() {
  desertMusicWanted = true;
  tryPlayDesertMusic();
}

export function stopDesertMusic() {
  desertMusicWanted = false;
  if (!desertMusic) return;
  desertMusic.pause();
  desertMusic.currentTime = 0;
}

export function unlockAudio() {
  const ctx = ensureAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  tryPlayDesertMusic();
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
export function playShootSound(vol = 1) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.12;
  const v = Math.max(0.05, vol);

  // Soft muffled punch (no sharp crack)
  const punch = ctx.createOscillator();
  const punchGain = ctx.createGain();
  punch.type = 'sine';
  punch.frequency.setValueAtTime(140, t);
  punch.frequency.exponentialRampToValueAtTime(55, t + 0.08);
  punchGain.gain.setValueAtTime(0.0001, t);
  punchGain.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.004);
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
  noiseGain.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);
  noise.stop(t + dur);
}

/** Wet splash — enemy death. */
export function playHitSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;

  const plop = ctx.createOscillator();
  const plopGain = ctx.createGain();
  plop.type = 'sine';
  plop.frequency.setValueAtTime(240, t);
  plop.frequency.exponentialRampToValueAtTime(62, t + 0.18);
  plopGain.gain.setValueAtTime(0.0001, t);
  plopGain.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
  plopGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  plop.connect(plopGain);
  plopGain.connect(ctx.destination);
  plop.start(t);
  plop.stop(t + 0.2);

  const splashDur = 0.22;
  const n = Math.max(1, Math.floor(ctx.sampleRate * splashDur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = p < 0.12 ? p / 0.12 : Math.pow(1 - (p - 0.12) / 0.88, 1.15);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const splash = ctx.createBufferSource();
  splash.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 180;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2200, t);
  lp.frequency.exponentialRampToValueAtTime(700, t + splashDur);
  const splashGain = ctx.createGain();
  splashGain.gain.setValueAtTime(0.0001, t);
  splashGain.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
  splashGain.gain.exponentialRampToValueAtTime(0.001, t + splashDur);
  splash.connect(hp);
  hp.connect(lp);
  lp.connect(splashGain);
  splashGain.connect(ctx.destination);
  splash.start(t);
  splash.stop(t + splashDur);

  const droplet = (at, freq, gain, dur) => {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.45, at + dur);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(gn);
    gn.connect(ctx.destination);
    o.start(at);
    o.stop(at + dur);
  };
  droplet(t + 0.03, 980, 0.045, 0.08);
  droplet(t + 0.07, 1480, 0.035, 0.07);
  droplet(t + 0.11, 720, 0.03, 0.09);
  droplet(t + 0.14, 1240, 0.022, 0.06);

  noiseBurst(ctx, t + 0.02, 0.09, 0.07, (src, gn) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 0.7;
    src.connect(bp);
    bp.connect(gn);
  });
}

let plasticDeathIr = null;

function getPlasticDeathIr(ctx) {
  if (plasticDeathIr && plasticDeathIr.sampleRate === ctx.sampleRate) return plasticDeathIr;
  const seconds = 1.35;
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.7);
    }
  }
  plasticDeathIr = ir;
  return ir;
}

/** Bullet through plastic: crack, noisy Doppler fly-by, long echo. */
function playPlasticFlybySound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const sweepDur = 0.95;

  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  dry.connect(ctx.destination);

  const conv = ctx.createConvolver();
  conv.buffer = getPlasticDeathIr(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  conv.connect(wet);
  wet.connect(ctx.destination);

  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.2;
  const echoLp = ctx.createBiquadFilter();
  echoLp.type = 'lowpass';
  echoLp.frequency.value = 2400;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.42;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.4;
  delay.connect(echoLp);
  echoLp.connect(feedback);
  feedback.connect(delay);
  echoLp.connect(echoOut);
  echoOut.connect(ctx.destination);

  const bus = ctx.createGain();
  bus.gain.value = 0.7;
  bus.connect(dry);
  bus.connect(conv);
  bus.connect(delay);

  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.75, t);
  pan.pan.linearRampToValueAtTime(0.75, t + sweepDur);
  pan.connect(bus);

  const crackDur = 0.05;
  const n = Math.max(1, Math.floor(ctx.sampleRate * crackDur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
  }
  const crack = ctx.createBufferSource();
  crack.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2400;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 8500;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.0001, t);
  crackGain.gain.exponentialRampToValueAtTime(0.2, t + 0.002);
  crackGain.gain.exponentialRampToValueAtTime(0.001, t + crackDur);
  crack.connect(hp);
  hp.connect(lp);
  lp.connect(crackGain);
  crackGain.connect(bus);
  crack.start(t);
  crack.stop(t + crackDur);

  const tick = (at, freq, gain, dur, type) => {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.38, at + dur);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(gain, at + 0.002);
    gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(gn);
    gn.connect(bus);
    o.start(at);
    o.stop(at + dur);
  };
  tick(t, 2100, 0.07, 0.055, 'square');
  tick(t, 980, 0.045, 0.07, 'triangle');

  const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * sweepDur));
  const nbuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const ndata = nbuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    ndata[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = nbuf;
  const dopplerBp = ctx.createBiquadFilter();
  dopplerBp.type = 'bandpass';
  dopplerBp.Q.value = 1.35;
  dopplerBp.frequency.setValueAtTime(5200, t);
  dopplerBp.frequency.exponentialRampToValueAtTime(280, t + sweepDur);
  const noiseHp = ctx.createBiquadFilter();
  noiseHp.type = 'highpass';
  noiseHp.frequency.setValueAtTime(900, t);
  noiseHp.frequency.exponentialRampToValueAtTime(180, t + sweepDur);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
  noiseGain.gain.setValueAtTime(0.14, t + 0.28);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + sweepDur);
  noise.connect(noiseHp);
  noiseHp.connect(dopplerBp);
  dopplerBp.connect(noiseGain);
  noiseGain.connect(pan);
  noise.start(t);
  noise.stop(t + sweepDur);

  const whine = ctx.createOscillator();
  const whineLp = ctx.createBiquadFilter();
  const whineGain = ctx.createGain();
  whine.type = 'sawtooth';
  whine.frequency.setValueAtTime(2400, t);
  whine.frequency.exponentialRampToValueAtTime(220, t + sweepDur);
  whineLp.type = 'lowpass';
  whineLp.frequency.setValueAtTime(4200, t);
  whineLp.frequency.exponentialRampToValueAtTime(700, t + sweepDur);
  whineGain.gain.setValueAtTime(0.0001, t);
  whineGain.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
  whineGain.gain.exponentialRampToValueAtTime(0.001, t + sweepDur);
  whine.connect(whineLp);
  whineLp.connect(whineGain);
  whineGain.connect(pan);
  whine.start(t);
  whine.stop(t + sweepDur);
}

export function playEnemyGaspSound() {
  playHitSound();
}

/** Bullet hitting a steel radar dish — hollow metallic clang. */
export function playRadarHitSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;

  const strikeDur = 0.06;
  const n = Math.max(1, Math.floor(ctx.sampleRate * strikeDur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  }
  const strike = ctx.createBufferSource();
  strike.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5600;
  const strikeGain = ctx.createGain();
  strikeGain.gain.setValueAtTime(0.0001, t);
  strikeGain.gain.exponentialRampToValueAtTime(0.18, t + 0.003);
  strikeGain.gain.exponentialRampToValueAtTime(0.001, t + strikeDur);
  strike.connect(hp);
  hp.connect(lp);
  lp.connect(strikeGain);
  strikeGain.connect(ctx.destination);
  strike.start(t);
  strike.stop(t + strikeDur);

  metalClack(ctx, t, 280, 0.12, 0.08);
  metalClack(ctx, t + 0.012, 740, 0.07, 0.07);

  const rings = [520, 830, 1240, 1860, 2480];
  rings.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.4);
    const peak = 0.055 / (i + 1);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.22 + i * 0.06);
    o.connect(gn);
    gn.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.45);
  });
}

function noiseBurst(ctx, at, dur, gain, setup) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = Math.pow(1 - i / n, 1.4);
    const flutter = 0.55 + 0.45 * Math.sin((i / ctx.sampleRate) * 64 * Math.PI * 2);
    data[i] = (Math.random() * 2 - 1) * env * flutter;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, at);
  gn.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
  setup(src, gn, at);
  gn.connect(ctx.destination);
  src.start(at);
  src.stop(at + dur);
}

/** Dry fronds rustling when a palm or cactus is shot. */
export function playPalmHitSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const rustle = (at, freq, dur, gain) => {
    noiseBurst(ctx, at, dur, gain, (src, gn) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 650;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 0.8;
      src.connect(hp);
      hp.connect(bp);
      bp.connect(gn);
    });
  };
  rustle(t, 2800, 0.14, 0.4);
  rustle(t + 0.045, 1900, 0.16, 0.34);
  rustle(t + 0.09, 2400, 0.13, 0.3);
  rustle(t + 0.15, 1650, 0.14, 0.26);
}

export function playCactusHitSound() {
  playPalmHitSound();
}

/** Sharp, strong tear/burst when a cactus arm/body chunk is ripped off. */
export function playCactusTearSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const tear = (at, freq, dur, gain, q = 1.2) => {
    noiseBurst(ctx, at, dur, gain, (src, gn) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      src.connect(hp);
      hp.connect(bp);
      bp.connect(gn);
    });
  };
  // Low punch so the burst lands hard.
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(140, t);
  thump.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  thumpGain.gain.setValueAtTime(0.0001, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.55, t + 0.008);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(t);
  thump.stop(t + 0.18);

  noiseBurst(ctx, t, 0.1, 0.7, (src, gn) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    src.connect(lp);
    lp.connect(gn);
  });

  tear(t, 2800, 0.09, 0.95, 1.4);
  tear(t + 0.02, 1900, 0.11, 0.85, 1.0);
  tear(t + 0.04, 3800, 0.08, 0.75, 1.8);
  tear(t + 0.07, 1400, 0.12, 0.65, 0.85);
  tear(t + 0.1, 2400, 0.09, 0.5, 1.2);
}

/** Water splash when the cactus body is destroyed: wet sploosh, spray hiss, bubbly droplets. */
export function playCactusSplashSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const bus = ctx.createGain();
  bus.gain.value = 0.18;
  bus.connect(ctx.destination);

  const noise = (at, dur, peak, attack, decayPow, setup) => {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const a = Math.max(1, Math.floor(ctx.sampleRate * attack));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = i < a ? i / a : Math.pow(1 - (i - a) / (n - a), decayPow);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gn = ctx.createGain();
    gn.gain.value = peak;
    setup(src, gn);
    gn.connect(bus);
    src.start(at);
    src.stop(at + dur);
  };

  // Main sploosh: resonant band sweeping up then settling, like water thrown out.
  noise(t, 0.42, 0.85, 0.012, 1.8, (src, gn) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(1900, t + 0.05);
    bp.frequency.exponentialRampToValueAtTime(800, t + 0.38);
    src.connect(bp);
    bp.connect(gn);
  });

  // Spray hiss trailing off.
  noise(t + 0.02, 0.6, 0.35, 0.03, 2.2, (src, gn) => {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    src.connect(hp);
    hp.connect(gn);
  });

  // Bubbly plinks — short rising chirps like droplets hitting water.
  for (let i = 0; i < 10; i++) {
    const at = t + 0.03 + Math.random() * 0.45;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    const f0 = 600 + Math.random() * 900;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.8, at + 0.03);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(0.09 + Math.random() * 0.06, at + 0.003);
    gn.gain.exponentialRampToValueAtTime(0.001, at + 0.04);
    o.connect(gn);
    gn.connect(bus);
    o.start(at);
    o.stop(at + 0.05);
  }
}

/** Plastic Doppler fly-by when a pyramid is shot. */
export function playPyramidHitSound() {
  playPlasticFlybySound();
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

/** Empty-chamber dry fire — short mechanical click. */
export function playJamSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;

  function tick(at, freq, gain, dur) {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    gn.gain.setValueAtTime(gain, at);
    gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(gn);
    gn.connect(ctx.destination);
    o.start(at);
    o.stop(at + dur);
  }

  function snap(at, dur, gain) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 8);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4500;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(gain, at);
    gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(gn);
    gn.connect(ctx.destination);
    src.start(at);
    src.stop(at + dur);
  }

  snap(t, 0.018, 0.16);
  tick(t, 980, 0.09, 0.016);
  snap(t + 0.02, 0.012, 0.08);
  tick(t + 0.02, 640, 0.05, 0.012);
}

function metalClack(ctx, at, freq, gain, dur) {
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, at + dur);
  gn.gain.setValueAtTime(0.0001, at);
  gn.gain.exponentialRampToValueAtTime(gain, at + 0.003);
  gn.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(gn);
  gn.connect(ctx.destination);
  o.start(at);
  o.stop(at + dur);

  const o2 = ctx.createOscillator();
  const gn2 = ctx.createGain();
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(freq * 2.4, at);
  o2.frequency.exponentialRampToValueAtTime(freq * 0.7, at + dur * 0.8);
  gn2.gain.setValueAtTime(0.0001, at);
  gn2.gain.exponentialRampToValueAtTime(gain * 0.45, at + 0.002);
  gn2.gain.exponentialRampToValueAtTime(0.001, at + dur * 0.7);
  o2.connect(gn2);
  gn2.connect(ctx.destination);
  o2.start(at);
  o2.stop(at + dur);
}

function plasticSlide(ctx, at, dur, gain) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900, at);
  bp.frequency.exponentialRampToValueAtTime(420, at + dur);
  bp.Q.value = 1.4;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, at);
  noiseGain.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, at + dur);
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(at);
  noise.stop(at + dur);
}

/** Mag release + drop (first reload scroll). */
export function playMagOutSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  metalClack(ctx, t, 340, 0.09, 0.06);
  plasticSlide(ctx, t + 0.03, 0.14, 0.07);
  metalClack(ctx, t + 0.11, 180, 0.07, 0.08);
}

/** Mag seat + bolt release (second reload scroll). */
export function playReloadSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  plasticSlide(ctx, t, 0.1, 0.08);
  metalClack(ctx, t + 0.06, 260, 0.11, 0.07);
  metalClack(ctx, t + 0.12, 520, 0.08, 0.05);
  metalClack(ctx, t + 0.18, 210, 0.1, 0.09);
  metalClack(ctx, t + 0.22, 880, 0.045, 0.04);
}
