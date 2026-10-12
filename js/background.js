import {
  DESERT_SKY_URL, DESERT_FAR_URL, DESERT_CITY_URL, CITY_DRAW_SCALE, DESERT_MID_URL, DESERT_FRONT_URL, DESERT_SHOOT_FRONT_URL, PALM_TREE_URL, PALM_TREE_HIT_URL, COCONUT_URL,
  CACTUS_URL, CACTUS_HAND_LEFT_URL, CACTUS_HAND_RIGHT_URL, CACTUS_HAND_CENTER_URL, CACTUS_HIT_URL, CACTUS_BURST_URL,
  PYRAMID_URL, PYRAMID2_URL, RADAR_URL, RADAR_FRAME_W, RADAR_FRAME_H, RADAR_FRAMES, RADAR_IDLE_FRAME,
  RADAR_HIT_FRAME_MS, RADAR_HIT_LOOPS, RADAR_SLOW_FRAME_MS, RADAR_SLOW_LOOPS,
  PALM_HIT_FRAME_W, PALM_HIT_FRAMES, PALM_HIT_FRAME_MS, PALM_HIT_LOOP_FROM, PALM_HIT_LOOP_TO, PALM_HIT_LOOPS,
  CACTUS_HIT_FRAME_W, CACTUS_HIT_FRAMES, CACTUS_HIT_FRAME_MS, CACTUS_HIT_LOOPS, CACTUS_INTACT_HITS,
  CACTUS_BURST_FRAME_W, CACTUS_BURST_FRAME_H, CACTUS_BURST_FRAMES, CACTUS_BURST_FRAME_MS,
  BAND_FRAC, DPR, FAR1_SHEET_H
} from './config.js?v=sfx63';
import { g, state, canvas } from './state.js?v=sfx29';
import { positionLevelArrows } from './ui.js?v=sfx32';

let palmTreeImg = null;
let palmTreeHitImg = null;
let coconutImg = null;
let cactusImg = null;
let cactusHandLeftImg = null;
let cactusHandRightImg = null;
let cactusHandCenterImg = null;
let cactusHitImg = null;
let cactusBurstImg = null;
let radarImg = null;
let pyramidImg = null;
let pyramid2Img = null;
let sandSplashImg = null;
/** Same draw scales as far / middle / front soldiers. */
const PALM_UNIT_SCALE = [2, 3, 6];
const PALM_HEIGHT_MUL = 1.5;
const CACTUS_NATIVE_W = 78;
const CACTUS_NATIVE_H = 118;
const COCONUT_NATIVE_W = 30;
const COCONUT_NATIVE_H = 25;
const COCONUT_DRAW_MUL = 1.0125;
const COCONUT_SPAWN_X = 0.49;
const COCONUT_SPAWN_Y = 0.33;
const COCONUT_DROP_AFTER_HITS = 4;
const COCONUT_DROP_CHANCE = 0.45;
const COCONUT_MAX_PER_TREE = 1;
const RADAR_DRAW_SCALE = 0.58;
const PYRAMID_NATIVE_W = 2146;
const PYRAMID_NATIVE_H = 733;
const PYRAMID2_NATIVE_W = 1536;
const PYRAMID2_NATIVE_H = 1024;
const PYRAMID_DRAW_SCALE = 1;
const PYRAMID_GAP = 320;
const PROP_SKIP_CHANCE = [0.52, 0.52, 0.52];
const PROP_SPAWN_BASE = [720, 720, 720];
const PROP_SPAWN_RAND = [640, 640, 640];
const PROP_SKIP_BASE = [420, 420, 420];
const PROP_SKIP_RAND = [480, 480, 480];

export function getSandSplashImage() {
  return sandSplashImg;
}

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

function punchBlackBackground(img, keepSize) {
  return punchChromaBackground(img, keepSize, (px, o) => {
    if (px[o + 3] < 20) return true;
    return px[o] <= 12 && px[o + 1] <= 12 && px[o + 2] <= 12;
  });
}

function punchMagentaBackground(img, keepSize) {
  return punchChromaBackground(img, keepSize, (px, o) => {
    if (px[o + 3] < 20) return true;
    if (px[o] >= 200 && px[o + 2] >= 200 && px[o + 1] <= 100) return true;
    return px[o] <= 12 && px[o + 1] <= 12 && px[o + 2] <= 12;
  });
}

function punchChromaBackground(img, keepSize, isBgPixel) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const cg = src.getContext('2d');
  cg.drawImage(img, 0, 0);
  let data;
  try {
    data = cg.getImageData(0, 0, w, h);
  } catch (e) {
    return img;
  }
  const px = data.data;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const isBg = i => isBgPixel(px, i * 4);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i] || !isBg(i)) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    px[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  cg.putImageData(data, 0, 0);
  if (keepSize || maxX < minX) return src;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = document.createElement('canvas');
  cropped.width = cw;
  cropped.height = ch;
  cropped.getContext('2d').drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return cropped;
}

function imageReady(img) {
  if (!img) return false;
  if (img.naturalWidth > 0) return true;
  return !!(img.width > 0 && img.getContext);
}

function imageDims(img) {
  if (img && img.naturalWidth > 0) return { w: img.naturalWidth, h: img.naturalHeight };
  if (img && img.width > 0) return { w: img.width, h: img.height };
  return { w: 0, h: 0 };
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
  state.city.image = createLayerImage(DESERT_CITY_URL, 'Desert city', () => {
    state.city.image = punchBlackBackground(state.city.image, true);
    layoutCity();
    onLoad();
  });
  state.bands[0].image = createLayerImage(DESERT_FAR_URL, 'Desert far', onLoad);
  state.bands[1].image = createLayerImage(DESERT_MID_URL, 'Desert mid', onLoad);
  state.bands[2].image = createLayerImage(DESERT_FRONT_URL, 'Desert front', onLoad);
  palmTreeImg = createLayerImage(PALM_TREE_URL, 'Palm tree', onLoad);
  palmTreeHitImg = createLayerImage(PALM_TREE_HIT_URL, 'Palm tree hit', () => {
    palmTreeHitImg = punchBlackBackground(palmTreeHitImg, true);
    onLoad();
  });
  coconutImg = createLayerImage(COCONUT_URL, 'Coconut', () => {
    coconutImg = punchBlackBackground(coconutImg);
    onLoad();
  });
  cactusImg = createLayerImage(CACTUS_URL, 'Cactus', () => {
    cactusImg = punchMagentaBackground(cactusImg, true);
    onLoad();
  });
  cactusHandLeftImg = createLayerImage(CACTUS_HAND_LEFT_URL, 'Cactus hand left', () => {
    cactusHandLeftImg = punchMagentaBackground(cactusHandLeftImg, true);
    onLoad();
  });
  cactusHandRightImg = createLayerImage(CACTUS_HAND_RIGHT_URL, 'Cactus hand right', () => {
    cactusHandRightImg = punchMagentaBackground(cactusHandRightImg, true);
    onLoad();
  });
  cactusHandCenterImg = createLayerImage(CACTUS_HAND_CENTER_URL, 'Cactus hand center', () => {
    cactusHandCenterImg = punchMagentaBackground(cactusHandCenterImg, true);
    onLoad();
  });
  cactusHitImg = createLayerImage(CACTUS_HIT_URL, 'Cactus hit', () => {
    cactusHitImg = punchBlackBackground(cactusHitImg, true);
    onLoad();
  });
  cactusBurstImg = createLayerImage(CACTUS_BURST_URL, 'Cactus burst', () => {
    cactusBurstImg = punchBlackBackground(cactusBurstImg, true);
    onLoad();
  });
  radarImg = createLayerImage(RADAR_URL, 'Radar', onLoad);
  pyramidImg = createLayerImage(PYRAMID_URL, 'Pyramid', () => {
    pyramidImg = punchBlackBackground(pyramidImg);
    onLoad();
  });
  pyramid2Img = createLayerImage(PYRAMID2_URL, 'Pyramid 2', () => {
    pyramid2Img = punchBlackBackground(pyramid2Img);
    onLoad();
  });
  sandSplashImg = createLayerImage(DESERT_SHOOT_FRONT_URL, 'Desert shoot front', () => {
    sandSplashImg = punchBlackBackground(sandSplashImg, true);
    onLoad();
  });
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
  layoutCity();
  state.bands[0].pattern = makePattern('#f0c56a', '#efc061');
  state.bands[1].pattern = makePattern('#efbb55', '#ebb24a');
  state.bands[2].pattern = makePattern('#e4a33d', '#dc9732');
  positionLevelArrows();
}

function layoutCity() {
  const far = state.bands[0];
  const dims = imageDims(state.city.image);
  const nativeH = dims.h > 0 ? dims.h : 83;
  const nativeW = dims.w > 0 ? dims.w : 2172;
  const h = Math.round(nativeH * CITY_DRAW_SCALE);
  state.city.h = h;
  state.city.tileW = Math.round(nativeW * CITY_DRAW_SCALE);
  state.city.y = far ? far.y - h : 0;
}

export function resetCityScroll() {
  const gap = Math.max(480, Math.round((state.W || 800) * 0.4));
  state.city.x = (state.W || 0) + gap;
}

export function drawFarCity() {
  const city = state.city;
  const img = city && city.image;
  if (!city || !imageReady(img)) return;
  const { w: tileW, h: tileH } = imageDims(img);
  if (tileW <= 0 || tileH <= 0) return;
  const drawW = Math.round(tileW * CITY_DRAW_SCALE);
  const drawH = Math.round(tileH * CITY_DRAW_SCALE);
  if (drawW <= 0) return;
  if (city.x == null) resetCityScroll();
  const dy = Math.round((state.bands[0] ? state.bands[0].y : city.y + drawH) - drawH);
  g.save();
  g.imageSmoothingEnabled = false;
  for (let x = city.x; x < state.W; x += drawW) {
    if (x + drawW <= 0) continue;
    g.drawImage(img, Math.round(x), dy, drawW, drawH);
  }
  g.restore();
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

function isPyramidKind(kind) {
  return kind === 'pyramid' || kind === 'pyramid2';
}

function propImage(kind) {
  if (kind === 'cactus') return cactusImg;
  if (kind === 'radar') return radarImg;
  if (kind === 'pyramid') return pyramidImg;
  if (kind === 'pyramid2') return pyramid2Img;
  if (kind === 'coconut') return coconutImg;
  return palmTreeImg;
}

export function drawFarPyramids() {
  const b = state.bands[0];
  if (!b || !b.objects) return;
  b.objects.forEach(o => {
    if (isPyramidKind(o.kind)) drawPalmObject(o);
  });
}

export function drawObjects(b) {
  if (!b.objects || !b.objects.length) return;
  b.objects.forEach(o => {
    if (isPyramidKind(o.kind)) return;
    drawPalmObject(o);
  });
}

function radarLoopSteps(frames, loops) {
  return Math.max(2, (Math.max(1, frames) - 1) * 2) * loops;
}

function resetRadarIdle(o) {
  o.frame = RADAR_IDLE_FRAME;
  o.frameDir = 1;
  o.animAcc = 0;
  o.spinLeft = 0;
  o.slowLeft = 0;
  o.seekFrame = null;
}

function pickRadarStopFrame(frames, current) {
  const n = Math.max(1, frames | 0);
  if (n <= 1) return 0;
  let frame = (Math.random() * n) | 0;
  if (frame === current) frame = (frame + 1) % n;
  return frame;
}

function settleRadar(o) {
  o.animAcc = 0;
  o.spinLeft = 0;
  o.slowLeft = 0;
  o.seekFrame = null;
}

function radarIsAnimating(o) {
  return (o.spinLeft > 0) || (o.slowLeft > 0) || (o.seekFrame != null);
}

function radarFrameCount(img) {
  const dims = imageDims(img);
  if (dims.w > 0) return Math.max(1, Math.floor(dims.w / RADAR_FRAME_W));
  return RADAR_FRAMES;
}

export function drawPalmObject(o) {
  g.save();
  g.imageSmoothingEnabled = false;
  const dx = Math.round(o.x);
  const dy = Math.round(o.y);
  const dw = Math.round(o.width);
  const dh = Math.round(o.height);
  if (o.kind === 'cactusBurst') {
    if (!imageReady(cactusBurstImg)) {
      g.restore();
      return;
    }
    const frames = cactusBurstFrameCount(cactusBurstImg);
    const frame = Math.max(0, Math.min(frames - 1, o.frame ?? 0));
    const srcW = CACTUS_BURST_FRAME_W;
    const srcH = imageDims(cactusBurstImg).h || CACTUS_BURST_FRAME_H;
    g.drawImage(cactusBurstImg, frame * srcW, 0, srcW, srcH, dx, dy, dw, dh);
    g.restore();
    return;
  }
  if (o.kind === 'cactusDebris') {
    const partImg = cactusPartImage(o.part);
    if (!imageReady(partImg)) {
      g.restore();
      return;
    }
    const cx = dx + dw * 0.5;
    const cy = dy + dh * 0.5;
    g.translate(cx, cy);
    g.rotate(o.angle || 0);
    g.drawImage(partImg, -dw * 0.5, -dh * 0.5, dw, dh);
    g.restore();
    return;
  }
  const img = propImage(o.kind);
  if (!imageReady(img)) {
    g.restore();
    return;
  }
  if (o.kind === 'radar') {
    const srcW = RADAR_FRAME_W;
    const srcH = imageDims(img).h || RADAR_FRAME_H;
    const frames = radarFrameCount(img);
    const frame = Math.max(0, Math.min(frames - 1, o.frame ?? RADAR_IDLE_FRAME));
    g.drawImage(img, frame * srcW, 0, srcW, srcH, dx, dy, dw, dh);
  } else if (o.kind === 'palm' && palmIsShaking(o) && imageReady(palmTreeHitImg)) {
    const hit = palmTreeHitImg;
    const srcW = PALM_HIT_FRAME_W;
    const srcH = imageDims(hit).h || srcW;
    const frames = palmHitFrameCount(hit);
    const frame = Math.max(0, Math.min(frames - 1, o.hitFrame ?? 0));
    g.drawImage(hit, frame * srcW, 0, srcW, srcH, dx, dy, dw, dh);
  } else if (o.kind === 'cactus') {
    drawCactusObject(o, dx, dy, dw, dh);
  } else {
    g.drawImage(img, dx, dy, dw, dh);
  }
  g.restore();
}

function drawCactusObject(o, dx, dy, dw, dh) {
  // Hit sheet is the full cactus — only while still whole (pre-destructible shake).
  if (cactusIsShaking(o) && cactusIsFullyWhole(o) && imageReady(cactusHitImg)) {
    const hit = cactusHitImg;
    const srcW = CACTUS_HIT_FRAME_W;
    const srcH = imageDims(hit).h || CACTUS_NATIVE_H;
    const frames = cactusHitFrameCount(hit);
    const frame = Math.max(0, Math.min(frames - 1, o.hitFrame ?? 0));
    g.drawImage(hit, frame * srcW, 0, srcW, srcH, dx, dy, dw, dh);
    return;
  }
  const parts = o.parts || { left: true, center: true, right: true };
  if (imageReady(cactusImg)) g.drawImage(cactusImg, dx, dy, dw, dh);
  if (parts.center && imageReady(cactusHandCenterImg)) g.drawImage(cactusHandCenterImg, dx, dy, dw, dh);
  if (parts.left && imageReady(cactusHandLeftImg)) g.drawImage(cactusHandLeftImg, dx, dy, dw, dh);
  if (parts.right && imageReady(cactusHandRightImg)) g.drawImage(cactusHandRightImg, dx, dy, dw, dh);
}

export function drawBandsAndHouses() {
  fillBand(state.sky);
  drawFarCity();
  fillBand(state.bands[0]);
  fillBand(state.bands[1]);
  fillBand(state.bands[2]);
}

function propSize(kind, bandIndex, img) {
  if (kind === 'radar') {
    const h = imageReady(img) ? (imageDims(img).h || RADAR_FRAME_H) : RADAR_FRAME_H;
    const layerScale = (PALM_UNIT_SCALE[bandIndex] || 2) / PALM_UNIT_SCALE[0];
    const scale = (RADAR_DRAW_SCALE / 3) * layerScale;
    return { width: RADAR_FRAME_W * scale, height: h * scale };
  }
  if (kind === 'cactus') {
    const nw = (img && img.complete && img.naturalWidth > 0) ? img.naturalWidth : CACTUS_NATIVE_W;
    const nh = (img && img.complete && img.naturalHeight > 0) ? img.naturalHeight : CACTUS_NATIVE_H;
    const layerScale = (PALM_UNIT_SCALE[bandIndex] || 2) / PALM_UNIT_SCALE[0];
    return { width: nw * layerScale, height: nh * layerScale };
  }
  if (kind === 'pyramid' || kind === 'pyramid2') {
    const fallback = kind === 'pyramid2'
      ? { w: PYRAMID2_NATIVE_W, h: PYRAMID2_NATIVE_H }
      : { w: PYRAMID_NATIVE_W, h: PYRAMID_NATIVE_H };
    const dims = imageReady(img) ? imageDims(img) : fallback;
    return { width: dims.w * PYRAMID_DRAW_SCALE, height: dims.h * PYRAMID_DRAW_SCALE };
  }
  const scale = PALM_UNIT_SCALE[bandIndex] || 2;
  const height = FAR1_SHEET_H * scale * PALM_HEIGHT_MUL;
  const aspect = (img && img.complete && img.naturalWidth > 0)
    ? (img.naturalWidth / img.naturalHeight)
    : (1086 / 1448);
  return { width: height * aspect, height };
}

function pickPropKind() {
  const roll = Math.random();
  if (roll < 0.28) return 'palm';
  if (roll < 0.38) return 'radar';
  return 'cactus';
}

function pyramidWouldOverlap(x, width) {
  const b = state.bands[0];
  const left = x - PYRAMID_GAP;
  const right = x + width + PYRAMID_GAP;
  return (b.objects || []).some(o => {
    if (!isPyramidKind(o.kind)) return false;
    return left < o.x + o.width && right > o.x;
  });
}

function spawnPyramidOnFar() {
  const b = state.bands[0];
  if (!b.objects) b.objects = [];
  const kind = Math.random() < 0.5 ? 'pyramid' : 'pyramid2';
  const img = propImage(kind);
  const { width, height } = propSize(kind, 0, img);
  const x = state.W + 40;
  if (pyramidWouldOverlap(x, width)) return false;
  const ground = b.y + b.h * (0.88 + Math.random() * 0.08);
  const y = ground - height;
  b.objects.push({ kind, x, y, width, height });
  return true;
}

function spawnPalmOnBand(bandIndex) {
  const b = state.bands[bandIndex];
  if (!b.objects) b.objects = [];
  const skipChance = PROP_SKIP_CHANCE[bandIndex] ?? 0.68;
  if (Math.random() < skipChance) {
    b.spawnIn = (PROP_SKIP_BASE[bandIndex] ?? 550) + Math.random() * (PROP_SKIP_RAND[bandIndex] ?? 650);
    return;
  }
  const kind = pickPropKind();
  const img = propImage(kind);
  const { width, height } = propSize(kind, bandIndex, img);
  const ground = b.y + b.h * (0.82 + Math.random() * 0.14);
  const y = ground - height;
  const obj = { kind, x: state.W + 20, y, width, height };
  if (kind === 'radar') resetRadarIdle(obj);
  if (kind === 'palm') {
    obj.shots = 0;
    obj.coconutsDropped = 0;
  }
  if (kind === 'cactus') initCactusState(obj);
  b.objects.push(obj);
  b.spawnIn = (PROP_SPAWN_BASE[bandIndex] ?? 1000) + Math.random() * (PROP_SPAWN_RAND[bandIndex] ?? 900);
}

export function spawnHouses(dt) {
  const far = state.bands[0];
  if (far) {
    if (far.pyramidSpawnIn == null) far.pyramidSpawnIn = 500;
    far.pyramidSpawnIn -= far.speed * dt;
    if (far.pyramidSpawnIn <= 0) {
      far.pyramidSpawnIn = spawnPyramidOnFar() ? (1600 + Math.random() * 2000) : (400 + Math.random() * 320);
    }
  }
  state.bands.forEach((b, i) => {
    if (b.spawnIn == null) b.spawnIn = 420;
    b.spawnIn -= b.speed * dt;
    if (b.spawnIn > 0) return;
    spawnPalmOnBand(i);
  });
}

export function hitRadarsAt(x, y) {
  let hit = false;
  state.bands.forEach(b => {
    (b.objects || []).forEach(o => {
      if (o.kind !== 'radar') return;
      if (x < o.x || x > o.x + o.width || y < o.y || y > o.y + o.height) return;
      const frames = radarFrameCount(radarImg);
      resetRadarIdle(o);
      o.spinLeft = radarLoopSteps(frames, RADAR_HIT_LOOPS);
      o.slowLeft = radarLoopSteps(frames, RADAR_SLOW_LOOPS);
      hit = true;
    });
  });
  return hit;
}

function palmHitFrameCount(img) {
  const dims = imageDims(img);
  if (dims.w > 0) return Math.max(1, Math.floor(dims.w / PALM_HIT_FRAME_W));
  return PALM_HIT_FRAMES;
}

function palmIsShaking(o) {
  return (o.hitLeft || 0) > 0;
}

function palmShakeRange() {
  const total = palmHitFrameCount(palmTreeHitImg);
  const from = Math.max(0, Math.min(total - 1, PALM_HIT_LOOP_FROM));
  const to = Math.max(from, Math.min(total - 1, PALM_HIT_LOOP_TO));
  return { from, to, count: to - from + 1 };
}

function startPalmShake(o) {
  const range = palmShakeRange();
  o.hitFrame = range.from;
  o.hitAcc = 0;
  o.hitLeft = range.count * PALM_HIT_LOOPS;
}

function cactusBurstFrameCount(img) {
  const dims = imageDims(img);
  if (dims.w > 0) return Math.max(1, Math.floor(dims.w / CACTUS_BURST_FRAME_W));
  return CACTUS_BURST_FRAMES;
}

function cactusHitFrameCount(img) {
  const dims = imageDims(img);
  if (dims.w > 0) return Math.max(1, Math.floor(dims.w / CACTUS_HIT_FRAME_W));
  return CACTUS_HIT_FRAMES;
}

function cactusIsShaking(o) {
  return (o.hitLeft || 0) > 0;
}

function cactusIsFullyWhole(o) {
  const parts = o.parts || {};
  return !!(parts.left && parts.center && parts.right);
}

function initCactusState(o) {
  o.intact = true;
  o.intactHits = 0;
  o.parts = { left: true, center: true, right: true };
  o.hitFrame = 0;
  o.hitAcc = 0;
  o.hitLeft = 0;
}

function startCactusShake(o) {
  o.hitFrame = 0;
  o.hitAcc = 0;
  o.hitLeft = cactusHitFrameCount(cactusHitImg) * CACTUS_HIT_LOOPS;
}

/** Normalized part hitboxes inside the 78x118 cactus canvas, checked in this order.
 *  Left/right are the arms; center is the main body including the bottom stump. */
const CACTUS_PART_BOXES = [
  { part: 'left', u0: 0, u1: 0.28, v0: 0.30, v1: 0.72 },
  { part: 'right', u0: 0.72, u1: 1, v0: 0.08, v1: 0.48 },
  { part: 'center', u0: 0.28, u1: 0.72, v0: 0, v1: 1 }
];

function cactusPartAt(o, x, y) {
  const parts = o.parts || {};
  const u = (x - o.x) / Math.max(1, o.width);
  const v = (y - o.y) / Math.max(1, o.height);
  const box = CACTUS_PART_BOXES.find(b =>
    parts[b.part] && u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1
  );
  return box ? box.part : null;
}

function cactusHasDestructibleParts(o) {
  const parts = o.parts || {};
  return !!(parts.left || parts.center || parts.right);
}

function cactusPartAnchor(part) {
  if (part === 'left') return { u: 0.14, v: 0.51 };
  if (part === 'right') return { u: 0.86, v: 0.28 };
  return { u: 0.5, v: 0.45 };
}

function cactusPartImage(part) {
  if (part === 'left') return cactusHandLeftImg;
  if (part === 'right') return cactusHandRightImg;
  return cactusHandCenterImg;
}

function spawnCactusBurst(band, cactus, part) {
  const anchor = cactusPartAnchor(part);
  const sizeMul = 1.55;
  const bw = cactus.width * sizeMul;
  const bh = bw * (CACTUS_BURST_FRAME_H / CACTUS_BURST_FRAME_W);
  const cx = cactus.x + cactus.width * anchor.u;
  const cy = cactus.y + cactus.height * anchor.v;
  // Play reverse, only last two sheet frames (3 → 2).
  const playFrames = [3, 2].filter(f => f < cactusBurstFrameCount(cactusBurstImg));
  band.objects.push({
    kind: 'cactusBurst',
    x: cx - bw * 0.5,
    y: cy - bh * 0.5,
    width: bw,
    height: bh,
    playFrames,
    playIndex: 0,
    frame: playFrames[0] || 0,
    frameAcc: 0,
    framesLeft: playFrames.length
  });
}

/** Arms snap to a slight tilt, fling sideways, then vanish quickly.
 *  Farther bands fly slower and despawn sooner so they don't travel as far. */
function spawnCactusArmDebris(band, cactus, part) {
  const bandIndex = Math.max(0, state.bands.indexOf(band));
  const depthScale = (PALM_UNIT_SCALE[bandIndex] || 2) / PALM_UNIT_SCALE[2];
  const speed = (1100 + Math.random() * 400) * (0.45 + 0.55 * depthScale);
  const dir = part === 'right' ? 1 : -1;
  // Right: 30° clockwise; left: 30° counter-clockwise.
  const tilt = (part === 'right' ? 1 : -1) * (Math.PI / 6);
  band.objects.push({
    kind: 'cactusDebris',
    part,
    x: cactus.x,
    y: cactus.y,
    width: cactus.width,
    height: cactus.height,
    vx: dir * speed,
    vy: 0,
    angle: tilt,
    life: 0.022 + 0.028 * depthScale,
    age: 0
  });
}

function destroyCactusPart(o, band, part, withFx = true) {
  if (!o.parts || !o.parts[part]) return false;
  o.hitLeft = 0;
  o.hitFrame = 0;
  o.hitAcc = 0;
  o.parts[part] = false;
  if (withFx) {
    if (part === 'center') spawnCactusBurst(band, o, part);
    else spawnCactusArmDebris(band, o, part);
  }
  return true;
}

function applyCactusHit(o, band, x, y) {
  if (o.intact !== false) {
    startCactusShake(o);
    o.intactHits = (o.intactHits || 0) + 1;
    if (o.intactHits >= CACTUS_INTACT_HITS) o.intact = false;
    return false;
  }
  if (!cactusHasDestructibleParts(o)) return false;
  const part = cactusPartAt(o, x, y);
  if (!part) return false;
  if (part === 'left') return destroyCactusPart(o, band, 'left') ? 'arm' : false;
  if (part === 'right') return destroyCactusPart(o, band, 'right') ? 'arm' : false;
  if (o.parts.left) destroyCactusPart(o, band, 'left', false);
  if (o.parts.right) destroyCactusPart(o, band, 'right', false);
  return destroyCactusPart(o, band, 'center') ? 'center' : false;
}

function shotHitsObject(o, x, y) {
  return x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height;
}

function coconutSize(bandIndex) {
  const img = coconutImg;
  const nw = (img && imageReady(img) && imageDims(img).w) || COCONUT_NATIVE_W;
  const nh = (img && imageReady(img) && imageDims(img).h) || COCONUT_NATIVE_H;
  const layerScale = (PALM_UNIT_SCALE[bandIndex] || 2) / PALM_UNIT_SCALE[0];
  const scale = layerScale * COCONUT_DRAW_MUL;
  return { width: nw * scale, height: nh * scale };
}

function dropCoconutFromPalm(palm, band, bandIndex) {
  const { width, height } = coconutSize(bandIndex);
  band.objects.push({
    kind: 'coconut',
    x: palm.x + palm.width * COCONUT_SPAWN_X - width * 0.5,
    y: palm.y + palm.height * COCONUT_SPAWN_Y - height * 0.5,
    width,
    height,
    vy: 0,
    falling: true,
    groundY: palm.y + palm.height
  });
}

function maybeDropCoconut(palm, band, bandIndex) {
  palm.shots = (palm.shots || 0) + 1;
  palm.coconutsDropped = palm.coconutsDropped || 0;
  if (palm.shots < COCONUT_DROP_AFTER_HITS) return;
  if (palm.coconutsDropped >= COCONUT_MAX_PER_TREE) return;
  if (Math.random() > COCONUT_DROP_CHANCE) return;
  dropCoconutFromPalm(palm, band, bandIndex);
  palm.coconutsDropped += 1;
}

function propDepth(bandIndex, o) {
  let depth = bandIndex * 1e6 + (o.y + o.height);
  if (isPyramidKind(o.kind)) depth -= 1e5;
  // Grounded coconuts sit at the palm base and are drawn on top — prefer them over the tree.
  if (o.kind === 'coconut') depth += 1e4;
  return depth;
}

function strokeDebugBox(x, y, w, h, color, label, dashed) {
  g.strokeStyle = color;
  g.setLineDash(dashed ? [6, 4] : []);
  g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  if (!label) return;
  g.setLineDash([]);
  const tw = g.measureText(label).width + 6;
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(Math.round(x), Math.round(y) - 13, tw, 13);
  g.fillStyle = color;
  g.fillText(label, Math.round(x) + 3, Math.round(y) - 2);
}

/** Debug overlay: the rect that catches shots for every prop, plus cactus part boxes. */
export function drawPropHitboxes() {
  g.save();
  g.lineWidth = 2;
  g.font = 'bold 10px system-ui,-apple-system,Segoe UI,Roboto,Arial';
  state.bands.forEach(b => {
    (b.objects || []).forEach(o => {
      if (o.kind === 'cactusBurst' || o.kind === 'cactusDebris') return;
      if (o.kind === 'coconut' && (o.falling || o.flying)) return;
      if (o.kind !== 'cactus' || o.intact !== false) {
        const label = o.kind === 'cactus'
          ? 'cactus ' + (o.intactHits || 0) + '/' + CACTUS_INTACT_HITS
          : o.kind;
        strokeDebugBox(o.x, o.y, o.width, o.height, 'rgba(255,220,0,0.95)', label, false);
        return;
      }
      // Destructible cactus: full rect still blocks shots; only part boxes tear pieces off.
      strokeDebugBox(o.x, o.y, o.width, o.height, 'rgba(255,220,0,0.6)', 'cactus', true);
      const parts = o.parts || {};
      CACTUS_PART_BOXES.forEach(box => {
        if (!parts[box.part]) return;
        strokeDebugBox(
          o.x + o.width * box.u0,
          o.y + o.height * box.v0,
          o.width * (box.u1 - box.u0),
          o.height * (box.v1 - box.v0),
          'rgba(255,90,40,0.95)',
          box.part,
          false
        );
      });
    });
  });
  g.restore();
}

/** Frontmost world prop under the shot, or null. */
export function findFrontmostPropAt(x, y) {
  let best = null;
  let bestDepth = -1e9;
  state.bands.forEach((b, bandIndex) => {
    (b.objects || []).forEach(o => {
      if (o.kind === 'coconut' && (o.falling || o.flying)) return;
      if (o.kind === 'cactusBurst' || o.kind === 'cactusDebris') return;
      if (!shotHitsObject(o, x, y)) return;
      const depth = propDepth(bandIndex, o);
      if (depth > bestDepth) {
        bestDepth = depth;
        best = { kind: o.kind, object: o, band: b, bandIndex, depth };
      }
    });
  });
  return best;
}

export function applyPropHit(hit, x, y) {
  if (!hit || !hit.object) return null;
  const o = hit.object;
  if (o.kind === 'palm') {
    startPalmShake(o);
    maybeDropCoconut(o, hit.band, hit.bandIndex);
  } else if (o.kind === 'cactus') {
    const torn = applyCactusHit(o, hit.band, x, y);
    if (torn === 'center') return 'cactusSplash';
    return torn ? 'cactusTear' : 'cactus';
  } else if (o.kind === 'coconut') {
    o.flying = true;
    o.falling = false;
    o.vx = 1960;
    o.vy = -1520;
  } else if (o.kind === 'radar') {
    const frames = radarFrameCount(radarImg);
    resetRadarIdle(o);
    o.spinLeft = radarLoopSteps(frames, RADAR_HIT_LOOPS);
    o.slowLeft = radarLoopSteps(frames, RADAR_SLOW_LOOPS);
  }
  return o.kind;
}

export function hitPalmsAt(x, y) {
  let hit = false;
  state.bands.forEach((b, bandIndex) => {
    (b.objects || []).forEach(o => {
      if (o.kind !== 'palm') return;
      if (!shotHitsObject(o, x, y)) return;
      startPalmShake(o);
      maybeDropCoconut(o, b, bandIndex);
      hit = true;
    });
  });
  return hit;
}

export function hitCactiAt(x, y) {
  let hit = false;
  state.bands.forEach(b => {
    (b.objects || []).forEach(o => {
      if (o.kind !== 'cactus') return;
      if (!shotHitsObject(o, x, y)) return;
      if (applyCactusHit(o, b, x, y)) hit = true;
    });
  });
  return hit;
}

export function hitCoconutsAt(x, y) {
  let hit = false;
  state.bands.forEach(b => {
    (b.objects || []).forEach(o => {
      if (o.kind !== 'coconut') return;
      if (o.falling || o.flying) return;
      if (!shotHitsObject(o, x, y)) return;
      o.flying = true;
      o.falling = false;
      o.vx = 1960;
      o.vy = -1520;
      hit = true;
    });
  });
  return hit;
}

export function hitPyramidsAt(x, y) {
  return state.bands.some(b =>
    (b.objects || []).some(o => isPyramidKind(o.kind) && shotHitsObject(o, x, y))
  );
}

export function hitWorldPropAt(x, y) {
  return state.bands.some(b =>
    (b.objects || []).some(o =>
      x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height
    )
  );
}

export function updateHouses(dt) {
  state.bands.forEach(b => {
    if (!b.objects) return;
    b.objects.forEach(o => {
      o.x -= b.speed * dt;
      if (o.kind === 'cactusBurst') {
        o.frameAcc = (o.frameAcc || 0) + dt * 1000;
        while ((o.framesLeft || 0) > 0 && o.frameAcc >= CACTUS_BURST_FRAME_MS) {
          o.frameAcc -= CACTUS_BURST_FRAME_MS;
          o.framesLeft -= 1;
          if (o.framesLeft <= 0) {
            o.framesLeft = 0;
            break;
          }
          o.playIndex = (o.playIndex || 0) + 1;
          const seq = o.playFrames || [3, 2];
          o.frame = seq[Math.min(o.playIndex, seq.length - 1)] || 0;
        }
      } else if (o.kind === 'cactusDebris') {
        o.age = (o.age || 0) + dt;
        o.x += (o.vx || 0) * dt;
        o.y += (o.vy || 0) * dt;
      } else if (o.kind === 'coconut' && o.flying) {
        o.x += (o.vx || 0) * dt;
        o.y += (o.vy || 0) * dt;
      } else if (o.kind === 'coconut' && o.falling) {
        o.vy = (o.vy || 0) + 820 * dt;
        o.y += o.vy * dt;
        const floor = o.groundY != null ? o.groundY : o.y + o.height;
        if (o.y + o.height >= floor) {
          o.y = floor - o.height;
          o.vy = 0;
          o.falling = false;
        }
      }
      if (o.kind === 'palm' && palmIsShaking(o)) {
        const range = palmShakeRange();
        o.hitAcc = (o.hitAcc || 0) + dt * 1000;
        while (palmIsShaking(o) && o.hitAcc >= PALM_HIT_FRAME_MS) {
          o.hitAcc -= PALM_HIT_FRAME_MS;
          o.hitLeft -= 1;
          if (o.hitLeft <= 0) {
            o.hitFrame = 0;
            o.hitAcc = 0;
            o.hitLeft = 0;
            break;
          }
          o.hitFrame = (o.hitFrame || range.from) + 1;
          if (o.hitFrame > range.to) o.hitFrame = range.from;
        }
      }
      if (o.kind === 'cactus' && cactusIsShaking(o)) {
        const frames = cactusHitFrameCount(cactusHitImg);
        o.hitAcc = (o.hitAcc || 0) + dt * 1000;
        while (cactusIsShaking(o) && o.hitAcc >= CACTUS_HIT_FRAME_MS) {
          o.hitAcc -= CACTUS_HIT_FRAME_MS;
          o.hitLeft -= 1;
          if (o.hitLeft <= 0) {
            o.hitFrame = 0;
            o.hitAcc = 0;
            o.hitLeft = 0;
            break;
          }
          o.hitFrame = ((o.hitFrame || 0) + 1) % frames;
        }
      }
      if (o.kind !== 'radar' || !radarIsAnimating(o)) return;
      const frames = radarFrameCount(radarImg);
      const last = Math.max(0, frames - 1);
      o.animAcc = (o.animAcc || 0) + dt * 1000;
      while (radarIsAnimating(o)) {
        const frameMs = o.spinLeft > 0 ? RADAR_HIT_FRAME_MS : RADAR_SLOW_FRAME_MS;
        if (o.animAcc < frameMs) break;
        o.animAcc -= frameMs;
        o.frame = (o.frame ?? RADAR_IDLE_FRAME) + (o.frameDir || 1);
        if (o.frame >= last) {
          o.frame = last;
          o.frameDir = -1;
        } else if (o.frame <= 0) {
          o.frame = 0;
          o.frameDir = 1;
        }
        if (o.spinLeft > 0) {
          o.spinLeft -= 1;
        } else if (o.slowLeft > 0) {
          o.slowLeft -= 1;
          if (o.slowLeft <= 0) o.seekFrame = pickRadarStopFrame(frames, o.frame);
        }
        if (!(o.spinLeft > 0) && !(o.slowLeft > 0) && o.frame === o.seekFrame) {
          settleRadar(o);
          break;
        }
      }
    });
    b.objects = b.objects.filter(o => {
      if (o.kind === 'cactusBurst' && (o.framesLeft || 0) <= 0) return false;
      if (o.kind === 'cactusDebris' && (o.age || 0) >= (o.life || 0.04)) return false;
      if (o.x + o.width <= -80) return false;
      if (o.kind === 'coconut' && o.flying) {
        if (o.x > state.W + 120) return false;
        if (o.y + o.height < -80) return false;
      }
      return true;
    });
  });
}

export function updateBands(dt) {
  const layers = [state.sky, ...state.bands];
  layers.forEach(b => {
    if (!b || b.speed == null) return;
    b.off += b.speed * dt;
    const tileW = (b.tileW > 0) ? b.tileW : (imageDims(b.image).w || 512);
    if (b.off >= tileW) b.off -= tileW;
  });
  const city = state.city;
  if (!city || city.speed == null) return;
  if (city.x == null) resetCityScroll();
  city.x -= (state.sky.speed != null ? state.sky.speed : city.speed) * dt;
  const drawW = city.tileW || Math.round(2172 * CITY_DRAW_SCALE);
  while (drawW > 0 && city.x <= -drawW) city.x += drawW;
}
