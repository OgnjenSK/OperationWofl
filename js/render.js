import {
  FAR1_SHEET_W, FAR1_SHEET_H, CROUCH_SCALE_Y,
  SAND_SPLASH_FRAME_W, SAND_SPLASH_FRAME_H, SAND_SPLASH_FRAMES,
  SAND_SPLASH_FRAME_MS, SAND_SPLASH_GROUND_Y, SAND_SPLASH_DRAW_SCALE,
  AMMO_URL, AMMO_ROWS, AMMO_PER_ROW, AMMO_DRAW_SCALE
} from './config.js?v=sfx70';
import { g, state } from './state.js?v=sfx29';
import { drawPixelText, measurePixelText } from './pixelfont.js?v=4';
import { fillBand, drawPalmObject, drawFarPyramids, drawFarCity, getSandSplashImage, drawPropHitboxes } from './background.js?v=sfx111';
import { getAnimRow, getRowFrameCount } from './sprites.js?v=sfx26';
import { getEnemyHitbox, getEnemyBounds, getFlierAnimRow, getEnemyLanes } from './enemies.js?v=sfx96';

const ammoImg = new Image();
ammoImg.src = AMMO_URL;

function bandIndexForFeet(feetY) {
  const bands = state.bands;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const top = b.y;
    const bot = b.y + b.h;
    if (feetY >= top && feetY < bot) return i;
  }
  if (feetY < bands[0].y) return 0;
  return bands.length - 1;
}

function drawSoldierSprite(s) {
  const fr = s.frames ? s.frames[s.frame] : null;
  const isCrouch = (s.name === 'front1' && (s.aiming > 0 || s.shooting > 0));
  const isRoll = (s.name === 'far2' && s.rolling);
  if (s.usesSheet && s.sheetImg && s.sheetImg.complete && s.sheetImg.naturalWidth > 0) {
    const row = (s.dying || s.dead) ? s.hurtRow : getAnimRow(s);
    const rowLimit = getRowFrameCount(s, row);
    let frame = s.frame;
    if (s.dying || s.dead) {
      const hold = (s.deathHoldFrame != null) ? s.deathHoldFrame : Math.max(0, rowLimit - 1);
      frame = Math.min(Math.max(0, frame), hold);
      s.frame = frame;
    } else if (frame >= rowLimit) {
      frame = 0;
      s.frame = 0;
    }
    const srcW = s.sheetFrameW || FAR1_SHEET_W;
    const srcH = s.sheetFrameH || FAR1_SHEET_H;
    const sx = frame * srcW, sy = row * srcH;
    const drawW = Math.round(srcW * s.sheetDrawScale), drawH = Math.round(srcH * s.sheetDrawScale);
    const dx = Math.round(s.x + (s.w - drawW) * 0.5);
    const lanePush = Math.round(Math.max(0, drawH - s.h) * (s.sheetLaneFactor || 0));
    const dy = Math.round(s.y + (s.h - drawH) + lanePush);
    const shouldFlip = s.sheetFlip ? (s.dir === 1) : (s.dir !== 1);
    if (shouldFlip) {
      g.save();
      g.imageSmoothingEnabled = false;
      g.translate(dx + drawW, 0);
      g.scale(-1, 1);
      g.drawImage(s.sheetImg, sx, sy, srcW, srcH, 0, dy, drawW, drawH);
      g.restore();
    } else {
      g.drawImage(s.sheetImg, sx, sy, srcW, srcH, dx, dy, drawW, drawH);
    }
  } else if (isRoll) {
    const cx = s.x + s.w * 0.5, cy = s.y + s.h * 0.8, r = Math.min(s.w, s.h) * 0.45;
    g.save();
    g.fillStyle = s.color || '#FFD400';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.9)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  } else if (isCrouch) {
    const yBase = s.y + s.h, yPrime = yBase - s.h * CROUCH_SCALE_Y;
    g.save();
    g.imageSmoothingEnabled = false;
    if (s.dir === 1) { g.translate(s.x + s.w, yPrime); g.scale(-1, CROUCH_SCALE_Y); g.drawImage(fr, 0, 0); }
    else { g.translate(s.x, yPrime); g.scale(1, CROUCH_SCALE_Y); g.drawImage(fr, 0, 0); }
    g.restore();
  } else if (fr) {
    if (s.dir === 1) {
      g.save();
      g.imageSmoothingEnabled = false;
      g.translate(s.x + s.w, 0);
      g.scale(-1, 1);
      g.drawImage(fr, 0, s.y);
      g.restore();
    } else g.drawImage(fr, s.x, s.y);
  }

  if (state.showNames) {
    let label = s.name;
    if (s.name === 'far2' && s.rolling) label += '[roll]';
    if (s.bursting) label += '[burst]';
    g.save();
    g.font = 'bold 12px system-ui,-apple-system,Segoe UI,Roboto,Arial';
    g.textBaseline = 'bottom';
    const tx = s.x + 2, ty = s.y - 2, wtxt = g.measureText(label).width + 6;
    g.fillStyle = 'rgba(0,0,0,.7)';
    g.fillRect(tx - 2, ty - 14, wtxt, 14);
    g.fillStyle = '#fff';
    g.fillText(label, tx, ty - 2);
    g.restore();
  }
  if (state.showBoundingBoxes) {
    const bb = getEnemyBounds(s);
    g.save();
    g.strokeStyle = 'rgba(255, 64, 255, 0.9)';
    g.lineWidth = 2;
    g.strokeRect(bb.x + 0.5, bb.y + 0.5, bb.w - 1, bb.h - 1);
    g.restore();
  }
  if (state.showHitboxes) {
    const hb = getEnemyHitbox(s);
    g.save();
    g.strokeStyle = 'rgba(0,255,255,0.9)';
    g.lineWidth = 2;
    g.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);
    g.restore();
  }
}

function drawDepthLayer(bandIndex) {
  const band = state.bands[bandIndex];
  const items = [];
  (band.objects || []).forEach(o => {
    if (o.kind === 'pyramid' || o.kind === 'pyramid2') return;
    items.push({ z: o.y + o.height, palm: o });
  });
  state.soldiers.forEach(s => {
    if (bandIndexForFeet(s.y + s.h) === bandIndex) {
      items.push({ z: s.y + s.h, soldier: s });
    }
  });
  state.effects.forEach(e => {
    if (e.type !== 'sandSplash' || e.bandIndex !== bandIndex) return;
    items.push({ z: e.y, splash: e });
  });
  items.sort((a, b) => a.z - b.z);
  items.forEach(it => {
    if (it.palm && (it.palm.kind === 'coconut' || it.palm.kind === 'cactusBurst' || it.palm.kind === 'cactusDebris')) return;
    if (it.palm) drawPalmObject(it.palm);
    else if (it.splash) drawSandSplash(it.splash);
    else drawSoldierSprite(it.soldier);
  });
  items.forEach(it => {
    if (it.palm && (it.palm.kind === 'coconut' || it.palm.kind === 'cactusBurst' || it.palm.kind === 'cactusDebris')) drawPalmObject(it.palm);
  });
}

export function drawSoldiers() {
  // Soldiers are drawn inside drawWorld() depth layers with palms.
}

function drawWorld() {
  fillBand(state.sky);
  drawFarCity();
  // Far layer
  fillBand(state.bands[0]);
  drawFarPyramids();
  drawDepthLayer(0);
  // Flying dragons sit between far and middle depth.
  drawFliers();
  // Middle + front
  for (let i = 1; i < state.bands.length; i++) {
    fillBand(state.bands[i]);
    drawDepthLayer(i);
  }
}

export function drawFliers() {
  state.fliers.forEach(f => {
    const drawW = Math.round((f.sheetFrameW || FAR1_SHEET_W) * (f.sheetDrawScale || 2.4));
    const drawH = Math.round((f.sheetFrameH || FAR1_SHEET_H) * (f.sheetDrawScale || 2.4));
    const dx = Math.round(f.x - drawW * 0.5);
    const dy = Math.round(f.y - drawH * 0.5);

    g.save();
    g.imageSmoothingEnabled = false;

    if (f.usesSheet && f.sheetImg && f.sheetImg.complete && f.sheetImg.naturalWidth > 0) {
      const srcW = f.sheetFrameW || FAR1_SHEET_W;
      const srcH = f.sheetFrameH || FAR1_SHEET_H;
      const row = (f.dying || f.dead)
        ? (f.deathAnimRow != null ? f.deathAnimRow : getFlierAnimRow(f))
        : getFlierAnimRow(f);
      const frameCount = (f.rowFrameCounts && f.rowFrameCounts[row]) || f.framesPerRow || 7;
      let frame = f.frame || 0;
      if (f.dying || f.dead) {
        const hold = f.deathHoldFrame != null ? f.deathHoldFrame : Math.max(0, frameCount - 1);
        if (frame > hold) frame = hold;
      } else {
        frame = frame % frameCount;
      }
      const sx = frame * srcW;
      const sy = row * srcH;
      const faceRight = f.faceRight != null ? f.faceRight : (f.vx >= 0);
      const shouldFlip = f.sheetFlip ? faceRight : !faceRight;
      if (shouldFlip) {
        g.translate(dx + drawW, dy);
        g.scale(-1, 1);
        g.drawImage(f.sheetImg, sx, sy, srcW, srcH, 0, 0, drawW, drawH);
      } else {
        g.drawImage(f.sheetImg, sx, sy, srcW, srcH, dx, dy, drawW, drawH);
      }
    } else {
      const size = f.r * 1.4;
      g.translate(f.x, f.y);
      g.fillStyle = '#9ef0ff';
      g.fillRect(-size / 2, -size / 2, size, size);
      g.strokeStyle = '#0b0b0b';
      g.lineWidth = 2;
      g.strokeRect(-size / 2, -size / 2, size, size);
    }
    g.restore();

    if (state.showNames) {
      g.save();
      g.fillStyle = '#fff';
      g.font = 'bold 12px system-ui,-apple-system,Segoe UI,Roboto,Arial';
      g.fillText((f.name || 'dragon') + '(' + f.hp + ')', f.x - drawW * 0.5, f.y - drawH * 0.5 - 8);
      g.restore();
    }
    if (state.showBoundingBoxes) {
      g.save();
      g.strokeStyle = 'rgba(255, 64, 255, 0.9)';
      g.lineWidth = 2;
      g.strokeRect(dx + 0.5, dy + 0.5, drawW - 1, drawH - 1);
      g.restore();
    }
    if (state.showHitboxes) {
      g.save();
      g.strokeStyle = 'rgba(0,255,255,0.9)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  });
}

const HUD_LEFT_FRAC = 0.10;
const hudLeft = () => Math.round(state.W * HUD_LEFT_FRAC);
const HEALTH_W = 18, HEALTH_H = 58, HEALTH_GAP = 4, HEALTH_BOTTOM = 10;
const HEALTH_COLOR = '#6f8cff';
const HEALTH_GRAY_MS = 120, HEALTH_WHITE_MS = 120;

let lastHealth = null;
// Lost pieces animate one after another: each starts when the previous one has finished.
const healthLoss = [];

function drawHealthSegment(x, y, fill) {
  g.fillStyle = fill;
  g.fillRect(x, y, HEALTH_W, HEALTH_H);
}

// A lost piece turns gray, then white, then stays as a faint ghost like spent ammo.
function drawHealth() {
  const max = state.maxHealth || 10, cur = state.health != null ? state.health : max;
  const now = performance.now();
  const pieceMs = HEALTH_GRAY_MS + HEALTH_WHITE_MS;
  if (lastHealth != null && cur < lastHealth) {
    for (let i = lastHealth - 1; i >= cur; i--) {
      const prev = healthLoss[healthLoss.length - 1];
      healthLoss.push({ i, t: prev ? Math.max(now, prev.t + pieceMs) : now });
    }
  } else if (lastHealth != null && cur > lastHealth) {
    healthLoss.length = 0;
  }
  lastHealth = cur;
  while (healthLoss.length && now - healthLoss[0].t >= pieceMs) healthLoss.shift();
  const y = state.H - HEALTH_H - HEALTH_BOTTOM;
  const xAt = i => hudLeft() + i * (HEALTH_W + HEALTH_GAP);
  g.save();
  for (let i = 0; i < Math.min(cur, max); i++) drawHealthSegment(xAt(i), y, HEALTH_COLOR);
  g.globalAlpha = 0.18;
  for (let i = Math.max(0, cur); i < max; i++) drawHealthSegment(xAt(i), y, HEALTH_COLOR);
  g.globalAlpha = 1;
  for (const p of healthLoss) {
    const age = now - p.t;
    drawHealthSegment(xAt(p.i), y, age < 0 ? HEALTH_COLOR : age < HEALTH_GRAY_MS ? '#8d939c' : '#ffffff');
  }
  g.restore();
}

function ammoLayout() {
  const bw = Math.round(ammoImg.naturalWidth * AMMO_DRAW_SCALE);
  const bh = Math.round(ammoImg.naturalHeight * AMMO_DRAW_SCALE);
  const gapX = 18, gapY = 12, multW = 62;
  const x0 = hudLeft() + multW;
  const rackBottom = state.H - HEALTH_BOTTOM - HEALTH_H - 16;
  return {
    bw, bh, gapX, gapY, x0, rackBottom,
    rackH: AMMO_ROWS * bh + (AMMO_ROWS - 1) * gapY,
    rackRight: x0 + AMMO_PER_ROW * bw + (AMMO_PER_ROW - 1) * gapX
  };
}

function drawAmmo() {
  if (!ammoImg.complete || !ammoImg.naturalWidth) return;
  const mult = Math.max(0, (state.mags || 1) - 1);
  const shown = Math.min(Math.max(0, state.ammo | 0), AMMO_ROWS * AMMO_PER_ROW);
  const { bw, bh, gapX, gapY, x0, rackBottom, rackH } = ammoLayout();
  g.save();
  g.imageSmoothingEnabled = false;
  for (let k = 0; k < AMMO_ROWS * AMMO_PER_ROW; k++) {
    const row = Math.floor(k / AMMO_PER_ROW), col = k % AMMO_PER_ROW;
    const x = x0 + col * (bw + gapX);
    const y = rackBottom - (row + 1) * bh - row * gapY;
    g.globalAlpha = k < shown ? 1 : 0.18;
    g.drawImage(ammoImg, x, y, bw, bh);
  }
  g.restore();
  drawPixelText(g, 'x' + mult, hudLeft(), rackBottom - rackH / 2, { scale: 3, color: '#ffffff', baseline: 'middle' });
}

function drawHudCaption() {
  if (state.phase !== 'play' || !ammoImg.naturalWidth) return;
  const { rackRight, rackBottom } = ammoLayout();
  drawPixelText(g, 'ENEMIES: ' + state.enemiesLeft, rackRight + 28, rackBottom, { scale: 3, baseline: 'bottom' });
}

function drawBandLabels() {
  if (!state.showLabels) return;
  g.save();
  g.font = '14px system-ui,-apple-system,Segoe UI,Roboto,Arial';
  g.textBaseline = 'top';
  g.lineWidth = 1;
  state.bands.forEach((b, i) => {
    g.fillStyle = ['rgba(255,0,0,0.12)', 'rgba(0,255,0,0.12)', 'rgba(0,128,255,0.12)'][i];
    g.fillRect(0, b.y, state.W, b.h);
    g.strokeStyle = ['rgba(255,0,0,0.7)', 'rgba(0,255,0,0.7)', 'rgba(0,128,255,0.7)'][i];
    g.strokeRect(0, b.y, state.W, b.h);
    const label = b.name + ' • y:' + (b.y | 0) + ' h:' + (b.h | 0) + ' • speed:' + b.speed;
    const pad = 6, tw = g.measureText(label).width + pad * 2, th = 20;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(8, b.y + 8, tw, th);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.strokeRect(8, b.y + 8, tw, th);
    g.fillStyle = '#fff';
    g.fillText(label, 8 + pad, b.y + 10);
  });
  g.restore();
}

const LANE_COLORS = {
  far: ['rgba(25,195,255,0.18)', 'rgba(25,195,255,0.95)'],
  middle: ['rgba(255,62,158,0.18)', 'rgba(255,62,158,0.95)'],
  front: ['rgba(255,212,0,0.18)', 'rgba(255,212,0,0.95)']
};

function drawEnemyLanes() {
  if (!state.showLanes) return;
  g.save();
  g.font = 'bold 12px system-ui,-apple-system,Segoe UI,Roboto,Arial';
  g.textBaseline = 'middle';
  g.lineWidth = 1.5;
  getEnemyLanes().forEach(lane => {
    const [fill, line] = LANE_COLORS[lane.name];
    const h = Math.max(1, lane.bottom - lane.top);
    g.fillStyle = fill;
    g.fillRect(0, lane.top, state.W, h);
    g.strokeStyle = line;
    g.setLineDash([8, 6]);
    g.beginPath();
    g.moveTo(0, lane.top + 0.5); g.lineTo(state.W, lane.top + 0.5);
    g.moveTo(0, lane.bottom + 0.5); g.lineTo(state.W, lane.bottom + 0.5);
    g.stroke();
    g.setLineDash([]);
    const label = lane.name + ' lane';
    const tw = g.measureText(label).width + 10;
    const tx = state.W - tw - 10;
    const ty = lane.top + h * 0.5;
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(tx, ty - 9, tw, 18);
    g.fillStyle = line;
    g.fillText(label, tx + 5, ty);
  });
  g.restore();
}

function drawCalloutHint(cx, cy, opts) {
  const label = opts.label.toUpperCase();
  const color = opts.color;
  const textScale = 2;
  const startR = 11;
  const diag = 16;
  const horiz = Math.max(opts.horiz || 38, measurePixelText(label, textScale) + 6);
  const edge = startR + diag + horiz;
  let sx = opts.sx;
  let sy = opts.sy;
  if (sx > 0 && cx > state.W - edge) sx = -1;
  else if (sx < 0 && cx < edge) sx = 1;
  if (sy > 0 && cy > state.H - 36) sy = -1;
  else if (sy < 0 && cy < 36) sy = 1;
  const x0 = cx + sx * startR;
  const y0 = cy + sy * startR;
  const x1 = x0 + sx * diag;
  const y1 = y0 + sy * diag;
  const x2 = x1 + sx * horiz;
  const textAbove = y1 > 16;
  const tx = (x1 + x2) * 0.5;
  const ty = textAbove ? y1 - 4 : y1 + 4;

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.lineTo(x2, y1);
  g.stroke();
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.lineTo(x2, y1);
  g.stroke();

  g.restore();
  drawPixelText(g, label, tx, ty, {
    scale: textScale, color, align: 'center', baseline: textAbove ? 'bottom' : 'top'
  });
}

// Red <-> yellow pulse shared by the reload and jammed hints.
function hintPulseColor() {
  const mix = 0.5 + 0.5 * Math.sin(((state.last || 0) / 180) * Math.PI * 2);
  const gg = Math.round(26 + (230 - 26) * mix);
  const b = Math.round(26 * (1 - mix));
  return 'rgb(255,' + gg + ',' + b + ')';
}

function drawReloadHint(cx, cy) {
  if (state.phase !== 'play' || state.ammo > 0 || state.jammed || state.mags <= 1) return;
  drawCalloutHint(cx, cy, {
    label: 'reload',
    color: hintPulseColor(),
    sx: 1,
    sy: 1
  });
}

function drawJamHint(cx, cy) {
  if (state.phase !== 'play' || !state.jammed) return;
  drawCalloutHint(cx, cy, {
    label: 'jammed',
    color: hintPulseColor(),
    sx: 1,
    sy: -1,
    horiz: 42
  });
}

function drawCross() {
  if (!state.cross.visible) return;
  const c = state.cross, L = 18, gap = 5;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(0,0,0,.7)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(c.x - L, c.y); g.lineTo(c.x - gap, c.y);
  g.moveTo(c.x + gap, c.y); g.lineTo(c.x + L, c.y);
  g.moveTo(c.x, c.y - L); g.lineTo(c.x, c.y - gap);
  g.moveTo(c.x, c.y + gap); g.lineTo(c.x, c.y + L);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.96)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(c.x - L, c.y); g.lineTo(c.x - gap, c.y);
  g.moveTo(c.x + gap, c.y); g.lineTo(c.x + L, c.y);
  g.moveTo(c.x, c.y - L); g.lineTo(c.x, c.y - gap);
  g.moveTo(c.x, c.y + gap); g.lineTo(c.x, c.y + L);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath();
  g.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  drawReloadHint(c.x, c.y);
  drawJamHint(c.x, c.y);
}

export function updateEffects(dt) {
  state.effects.forEach(e => {
    if (e.type === 'sandSplash' && e.bandIndex != null) {
      const band = state.bands[e.bandIndex];
      if (band) e.x -= band.speed * dt;
    }
    e.t += dt;
  });
  state.effects = state.effects.filter(e => e.t < e.dur);
}

function drawEffects() {
  state.effects.forEach(e => {
    const p = e.dur > 0 ? Math.min(1, e.t / e.dur) : 1;
    if (e.type === 'flash') {
      const r1 = 6 + 22 * p;
      g.save();
      g.globalAlpha = 1 - p;
      g.fillStyle = 'rgba(255,255,220,.95)';
      g.beginPath();
      g.arc(e.x, e.y, r1 * 0.6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,220,120,.9)';
      g.lineWidth = 2 + 2 * (1 - p);
      g.beginPath();
      g.arc(e.x, e.y, r1, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    } else if (e.type === 'muzzle') {
      const sc = e.scale || 1;
      const fade = 1 - p;
      const core = (10 + 18 * (1 - p)) * sc;
      const ring = (16 + 34 * p) * sc;
      g.save();
      g.globalAlpha = fade;
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.arc(e.x, e.y, core * 0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,230,120,0.9)';
      g.beginPath();
      g.arc(e.x, e.y, core * 0.7, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,160,40,0.95)';
      g.lineWidth = (2.5 + 2 * fade) * sc;
      g.beginPath();
      g.arc(e.x, e.y, ring * 0.55, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(255,220,160,0.85)';
      g.lineWidth = (1.5 + fade) * sc;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p * 0.4;
        const inner = core * 0.5;
        const outer = ring;
        g.moveTo(e.x + Math.cos(a) * inner, e.y + Math.sin(a) * inner);
        g.lineTo(e.x + Math.cos(a) * outer, e.y + Math.sin(a) * outer);
      }
      g.stroke();
      g.restore();
    } else if (e.type === 'hit') {
      const R = 8 + 28 * (1 - p);
      g.save();
      g.globalAlpha = 1 - p * 0.9;
      g.fillStyle = 'rgba(255,230,160,.9)';
      g.beginPath();
      g.arc(e.x, e.y, 4 * (1 - p), 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,200,80,.85)';
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.moveTo(e.x, e.y);
        g.lineTo(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R);
      }
      g.stroke();
      g.restore();
    }
  });
}

function drawSandSplash(e) {
  const img = getSandSplashImage();
  if (!img || !(img.naturalWidth > 0 || (img.width > 0 && img.getContext))) return;
  const frame = Math.min(
    SAND_SPLASH_FRAMES - 1,
    Math.max(0, Math.floor((e.t * 1000) / SAND_SPLASH_FRAME_MS))
  );
  const srcW = SAND_SPLASH_FRAME_W;
  const srcH = SAND_SPLASH_FRAME_H;
  const sx = frame * srcW;
  const sw = Math.min(srcW, Math.max(1, (img.naturalWidth || img.width) - sx));
  const scale = e.scale != null ? e.scale : SAND_SPLASH_DRAW_SCALE;
  const dw = Math.round(srcW * scale);
  const dh = Math.round(srcH * scale);
  const dx = Math.round(e.x - dw * 0.5);
  const dy = Math.round(e.y - SAND_SPLASH_GROUND_Y * scale);
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(img, sx, 0, sw, srcH, dx, dy, dw, dh);
  g.restore();
}

export function render() {
  g.clearRect(0, 0, state.W, state.H);
  g.save();
  g.imageSmoothingEnabled = false;
  drawWorld();
  g.restore();
  drawBandLabels();
  drawEnemyLanes();
  if (state.showPropHitboxes) drawPropHitboxes();
  drawHealth();
  drawEffects();
  drawAmmo();
  drawHudCaption();
  drawCross();
}
