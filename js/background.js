import {
  DESERT_SKY_URL, DESERT_FAR_URL, DESERT_MID_URL, DESERT_FRONT_URL, PALM_TREE_URL, CACTUS_URL,
  BAND_FRAC, DPR, FAR1_SHEET_H
} from './config.js?v=sfx25';
import { g, state, canvas } from './state.js?v=sfx24';
import { positionLevelArrows } from './ui.js?v=sfx24';

let palmTreeImg = null;
let cactusImg = null;
/** Same draw scales as far / middle / front soldiers. */
const PALM_UNIT_SCALE = [2, 3, 6];
const PALM_HEIGHT_MUL = 1.5;
const CACTUS_NATIVE_W = 78;
const CACTUS_NATIVE_H = 118;

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
  state.sky.image = createLayerImage(DESERT_SKY_URL, 'Desert sky', onLoad);
  state.bands[0].image = createLayerImage(DESERT_FAR_URL, 'Desert far', onLoad);
  state.bands[1].image = createLayerImage(DESERT_MID_URL, 'Desert mid', onLoad);
  state.bands[2].image = createLayerImage(DESERT_FRONT_URL, 'Desert front', onLoad);
  palmTreeImg = createLayerImage(PALM_TREE_URL, 'Palm tree', onLoad);
  cactusImg = createLayerImage(CACTUS_URL, 'Cactus', onLoad);
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
  state.sky.y = 0;
  state.sky.h = y;
  state.sky.pattern = makePattern('#b8dcff', '#c5e6ff');
  for (let i = 0; i < 3; i++) {
    const h = Math.floor(state.H * BAND_FRAC[i]);
    state.bands[i].y = y;
    state.bands[i].h = h;
    y += h;
  }
  state.bands[0].pattern = makePattern('#f0c56a', '#efc061');
  state.bands[1].pattern = makePattern('#efbb55', '#ebb24a');
  state.bands[2].pattern = makePattern('#e4a33d', '#dc9732');
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

function propImage(kind) {
  return kind === 'cactus' ? cactusImg : palmTreeImg;
}

export function drawObjects(b) {
  if (!b.objects || !b.objects.length) return;
  b.objects.forEach(o => drawPalmObject(o));
}

export function drawPalmObject(o) {
  const img = propImage(o.kind);
  if (!img || !img.complete || img.naturalWidth <= 0) return;
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(img, Math.round(o.x), Math.round(o.y), Math.round(o.width), Math.round(o.height));
  g.restore();
}

export function drawBandsAndHouses() {
  fillBand(state.sky);
  fillBand(state.bands[0]);
  fillBand(state.bands[1]);
  fillBand(state.bands[2]);
}

function propSize(kind, bandIndex, img) {
  if (kind === 'cactus') {
    const nw = (img && img.complete && img.naturalWidth > 0) ? img.naturalWidth : CACTUS_NATIVE_W;
    const nh = (img && img.complete && img.naturalHeight > 0) ? img.naturalHeight : CACTUS_NATIVE_H;
    const layerScale = (PALM_UNIT_SCALE[bandIndex] || 2) / PALM_UNIT_SCALE[0];
    return { width: nw * layerScale, height: nh * layerScale };
  }
  const scale = PALM_UNIT_SCALE[bandIndex] || 2;
  const height = FAR1_SHEET_H * scale * PALM_HEIGHT_MUL;
  const aspect = (img && img.complete && img.naturalWidth > 0)
    ? (img.naturalWidth / img.naturalHeight)
    : (1086 / 1448);
  return { width: height * aspect, height };
}

function spawnPalmOnBand(bandIndex) {
  const b = state.bands[bandIndex];
  if (!b.objects) b.objects = [];
  // Sparse spawn — skip often so props only appear sometimes.
  if (Math.random() < 0.5) {
    b.spawnIn = 280 + Math.random() * 520;
    return;
  }
  const kind = Math.random() < 0.96 ? 'cactus' : 'palm';
  const img = propImage(kind);
  const { width, height } = propSize(kind, bandIndex, img);
  const ground = b.y + b.h * (0.82 + Math.random() * 0.14);
  const y = ground - height;
  b.objects.push({ kind, x: state.W + 20, y, width, height });
  b.spawnIn = 650 + Math.random() * 1000 + bandIndex * 120;
}

export function spawnHouses(dt) {
  state.bands.forEach((b, i) => {
    if (b.spawnIn == null) b.spawnIn = 200 + i * 150;
    b.spawnIn -= b.speed * dt;
    if (b.spawnIn > 0) return;
    spawnPalmOnBand(i);
  });
}

export function updateHouses(dt) {
  state.bands.forEach(b => {
    if (!b.objects) return;
    b.objects.forEach(o => o.x -= b.speed * dt);
    b.objects = b.objects.filter(o => o.x + o.width > -80);
  });
}

export function updateBands(dt) {
  const layers = [state.sky, ...state.bands];
  layers.forEach(b => {
    if (!b || b.speed == null) return;
    b.off += b.speed * dt;
    const tileW = (b.image && b.image.complete && b.image.naturalWidth > 0) ? b.image.naturalWidth : 512;
    if (b.off >= tileW) b.off -= tileW;
  });
}
