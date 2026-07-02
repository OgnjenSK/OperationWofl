import {
  FAR1_SHEET_W, FAR1_SHEET_H, CROUCH_SCALE_Y
} from './config.js';
import { g, state } from './state.js';
import { getBgGradient } from './background.js';
import { drawBandsAndHouses } from './background.js';
import { getAnimRow, getRowFrameCount } from './sprites.js';
import { getEnemyHitbox } from './enemies.js';

export function drawSoldiers() {
  if (!state.soldiers.length) return;
  state.soldiers.sort((a, b) => (a.y + a.h) - (b.y + b.h));
  state.soldiers.forEach(s => {
    const fr = s.frames ? s.frames[s.frame] : null;
    const isCrouch = (s.name === 'front1' && (s.aiming > 0 || s.shooting > 0));
    const isRoll = (s.name === 'far2' && s.rolling);
    if (s.usesSheet && s.sheetImg && s.sheetImg.complete && s.sheetImg.naturalWidth > 0) {
      const row = getAnimRow(s);
      if (s.frame >= getRowFrameCount(s, row)) s.frame = 0;
      const srcW = s.sheetFrameW || FAR1_SHEET_W;
      const srcH = s.sheetFrameH || FAR1_SHEET_H;
      const sx = s.frame * srcW, sy = row * srcH;
      const drawW = Math.round(srcW * s.sheetDrawScale), drawH = Math.round(srcH * s.sheetDrawScale);
      const dx = Math.round(s.x + (s.w - drawW) * 0.5);
      const lanePush = Math.round(Math.max(0, drawH - s.h) * (s.sheetLaneFactor || 0));
      const dy = Math.round(s.y + (s.h - drawH) + lanePush);
      const shouldFlip = s.sheetFlip ? (s.dir === 1) : (s.dir !== 1);
      if (shouldFlip) {
        g.save();
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
      if (s.dir === 1) { g.translate(s.x + s.w, yPrime); g.scale(-1, CROUCH_SCALE_Y); g.drawImage(fr, 0, 0); }
      else { g.translate(s.x, yPrime); g.scale(1, CROUCH_SCALE_Y); g.drawImage(fr, 0, 0); }
      g.restore();
    } else if (fr) {
      if (s.dir === 1) { g.save(); g.translate(s.x + s.w, 0); g.scale(-1, 1); g.drawImage(fr, 0, s.y); g.restore(); }
      else g.drawImage(fr, s.x, s.y);
    }

    if (state.showNames) {
      let label = s.name;
      if (s.name === 'far2' && s.rolling) label += '[roll]';
      if (s.name === 'middle2' && s.bursting) label += '[burst]';
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
    if (state.showHitboxes) {
      const hb = getEnemyHitbox(s);
      g.save();
      g.strokeStyle = 'rgba(0,255,255,0.9)';
      g.lineWidth = 2;
      g.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);
      g.restore();
    }
  });
}

export function drawFliers() {
  state.fliers.forEach(f => {
    const size = f.r * 1.4;
    g.save();
    g.translate(f.x, f.y);
    g.fillStyle = '#9ef0ff';
    g.fillRect(-size / 2, -size / 2, size, size);
    g.strokeStyle = '#0b0b0b';
    g.lineWidth = 2;
    g.strokeRect(-size / 2, -size / 2, size, size);
    g.restore();
    if (state.showNames) {
      g.save();
      g.fillStyle = '#fff';
      g.font = 'bold 12px system-ui,-apple-system,Segoe UI,Roboto,Arial';
      g.fillText('helicopter(' + f.hp + ')', f.x - size / 2, f.y - size / 2 - 8);
      g.restore();
    }
  });
}

function drawHealth() {
  const max = state.maxHealth || 10, cur = state.health != null ? state.health : max;
  const barWidth = 10, barHeight = 20, gap = 4, baseX = 10, y = state.H - barHeight - 8;
  for (let i = 0; i < max; i++) {
    const x = baseX + i * (barWidth + gap);
    g.save();
    g.fillStyle = i < cur ? '#4cff8a' : 'rgba(0,0,0,0.4)';
    g.fillRect(x, y, barWidth, barHeight);
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, barWidth - 1, barHeight - 1);
    g.restore();
  }
}

function drawBaselines() {
  if (!state.showBaselines) return;
  const b0 = state.bands[0];
  g.save();
  g.strokeStyle = 'rgba(255,80,80,0.9)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, b0.y);
  g.lineTo(state.W, b0.y);
  g.moveTo(0, b0.y + b0.h);
  g.lineTo(state.W, b0.y + b0.h);
  g.stroke();
  g.restore();
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

function drawBgTop() {
  let bgGradient = getBgGradient();
  if (!bgGradient) {
    bgGradient = g.createLinearGradient(0, 0, 0, state.H);
    bgGradient.addColorStop(0, 'rgba(173, 223, 255, 0.95)');
    bgGradient.addColorStop(1, 'rgba(191, 231, 255, 0.15)');
  }
  g.fillStyle = bgGradient;
  g.fillRect(0, 0, state.W, state.H);
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
}

export function updateEffects(dt) {
  state.effects.forEach(e => e.t += dt);
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

export function render() {
  g.clearRect(0, 0, state.W, state.H);
  drawBandsAndHouses();
  drawSoldiers();
  drawFliers();
  drawBaselines();
  drawBandLabels();
  drawBgTop();
  drawHealth();
  drawEffects();
  drawCross();
}
