import {
  DESERT_FAR_URL, DESERT_MID_URL, DESERT_FRONT_URL,
  HOUSE_COLORS, BAND_FRAC, DPR
} from './config.js';
import { g, state, canvas } from './state.js';
import { positionLevelArrows } from './ui.js';

let bgGradient = null;

export function getBgGradient() { return bgGradient; }

export function makePattern(c1, c2) {
  const off = document.createElement('canvas');
  off.width = 64;
  off.height = 64;
  const cg = off.getContext('2d');
  cg.fillStyle = c1;
  cg.fillRect(0, 0, 64, 64);
  cg.fillStyle = c2;
  for (let x = 0; x < 64; x += 8) cg.fillRect(x, 0, 4, 64);
  return cg.createPattern(off, 'repeat');
}

function createLayerImage(url, label, onLoad) {
  const img = new Image();
  const resolved = new URL(url, location.href).href;
  if (/^https?:\/\//i.test(resolved)) {
    try {
      if (new URL(resolved).origin !== location.origin) {
        img.crossOrigin = 'anonymous';
      }
    } catch (e) { /* ignore */ }
  }
  img.src = resolved;
  img.onerror = () => console.warn(label + ' failed to load:', resolved);
  img.onload = () => onLoad();
  return img;
}

export function initBackgroundImages(onLoad) {
  state.bands[0].image = createLayerImage(DESERT_FAR_URL, 'Desert far', onLoad);
  state.bands[1].image = createLayerImage(DESERT_MID_URL, 'Desert mid', onLoad);
  state.bands[2].image = createLayerImage(DESERT_FRONT_URL, 'Desert front', onLoad);
}

export function resize() {
  const vw = innerWidth;
  const vh = innerHeight;
  canvas.width = vw * DPR;
  canvas.height = vh * DPR;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  state.W = vw;
  state.H = vh;
  let y = Math.max(0, 1 - (BAND_FRAC[0] + BAND_FRAC[1] + BAND_FRAC[2])) * state.H;
  for (let i = 0; i < 3; i++) {
    const h = Math.floor(state.H * BAND_FRAC[i]);
    state.bands[i].y = y;
    state.bands[i].h = h;
    y += h;
  }
  state.bands[0].pattern = makePattern('#f0c56a', '#efc061');
  state.bands[1].pattern = makePattern('#efbb55', '#ebb24a');
  state.bands[2].pattern = makePattern('#e4a33d', '#dc9732');
  bgGradient = g.createLinearGradient(0, 0, 0, state.H);
  bgGradient.addColorStop(0, 'rgba(173, 223, 255, 0.95)');
  bgGradient.addColorStop(1, 'rgba(191, 231, 255, 0.15)');
  positionLevelArrows();
}

export function fillBand(b) {
  const img = b.image;
  if (img && img.complete && img.naturalWidth > 0) {
    const tileW = img.naturalWidth;
    const offset = ((b.off % tileW) + tileW) % tileW;
    const dy = Math.floor(b.y) - 1;
    const dh = Math.ceil(b.h) + 2;
    g.save();
    for (let x = -offset; x < state.W; x += tileW) {
      g.drawImage(img, Math.round(x), dy, tileW, dh);
    }
    g.restore();
    return;
  }
  g.save();
  g.fillStyle = b.pattern;
  g.translate(-b.off, 0);
  g.fillRect(0, Math.floor(b.y) - 1, state.W + b.off + 4, Math.ceil(b.h) + 2);
  g.restore();
}

export function drawObjects(b) {
  b.objects.forEach(o => {
    g.fillStyle = o.color;
    g.fillRect(o.x, o.y, o.width, o.height);
    g.strokeStyle = 'rgba(0,0,0,.85)';
    g.lineWidth = 2;
    g.strokeRect(o.x + 0.5, o.y + 0.5, o.width - 1, o.height - 1);
    g.fillStyle = '#1d1f27';
    g.beginPath();
    g.moveTo(o.x - 12, o.y);
    g.lineTo(o.x + o.width / 2, o.y - o.height * 0.42);
    g.lineTo(o.x + o.width + 12, o.y);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.9)';
    g.stroke();
  });
}

export function drawBandsAndHouses() {
  fillBand(state.bands[0]);
  drawObjects(state.bands[0]);
  fillBand(state.bands[1]);
  fillBand(state.bands[2]);
}

export function spawnHouses(dt) {
  const b = state.bands[0];
  b.spawnIn -= b.speed * dt;
  if (b.spawnIn > 0) return;
  const width = 200 + Math.random() * 200;
  const maxH = b.h * 1.3;
  const height = Math.min(maxH, b.h * (0.5 + Math.random() * 0.8));
  const base = b.y + 2 + Math.random() * ((b.y + b.h - 2) - (b.y + 2));
  const y = base - height;
  const color = HOUSE_COLORS[(Math.random() * HOUSE_COLORS.length) | 0];
  b.objects.push({ x: state.W + 40, y, width, height, color });
  b.spawnIn = 500 + Math.random() * 700;
}

export function updateHouses(dt) {
  const b = state.bands[0];
  b.objects.forEach(o => o.x -= b.speed * dt);
  b.objects = b.objects.filter(o => o.x + o.width > -60);
}

export function updateBands(dt) {
  state.bands.forEach(b => {
    b.off += b.speed * dt;
    const tileW = (b.image && b.image.complete && b.image.naturalWidth > 0) ? b.image.naturalWidth : 512;
    if (b.off >= tileW) b.off -= tileW;
  });
}
