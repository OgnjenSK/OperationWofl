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

export function playShootSound() { playTone(110, 0.14, 0.26); }
export function playHitSound() { playTone(55, 0.2, 0.3); }
export function playEnemyShootSound() { playTone(220, 0.08, 0.08); }
