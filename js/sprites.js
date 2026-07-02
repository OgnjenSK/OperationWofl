import {
  SIZE_COLOR, TYPE_NAMES, GOTCHI_TEST_URL, GOTCHI_ALT_URL,
  FAR1_SHEET_W, FAR1_SHEET_H, FAR1_FRAMES, FAR1_ROW_FRAME_COUNTS,
  FAR1_WALK_ROW, FAR1_ATTACK_ROW, FAR1_HURT_ROW, FAR1_DEATH_ROW,
  FAR1_FRAME_MS, FAR1_WALK_FRAME_MS, SOLDIER_FRAME_MS
} from './config.js';

export function getAnimRow(s) {
  if (s.dying) return s.hurtRow;
  if (s.dead) return s.deathRow;
  return s.shooting > 0 ? s.attackRow : s.walkRow;
}

export function getRowFrameCount(s, row) {
  if (!s.usesSheet) return s.frames.length;
  return (s.rowFrameCounts && s.rowFrameCounts[row]) || s.framesPerRow || 1;
}

export function getAttackAnimDuration(s) {
  if (!s.usesSheet) return 0.32;
  const frames = getRowFrameCount(s, s.attackRow);
  const frameMs = s.frameMs || FAR1_FRAME_MS;
  return (frames * frameMs) / 1000;
}

function makeSoldierFrames(scale, color) {
  const baseW = 14, baseH = 22;
  const w = Math.round(baseW * scale), h = Math.round(baseH * scale);
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const cg = off.getContext('2d');
    cg.imageSmoothingEnabled = false;
    cg.scale(scale, scale);
    cg.fillStyle = color;
    cg.fillRect(5, 8, 4, 10);
    cg.strokeStyle = '#0b0b0b';
    cg.lineWidth = .9;
    cg.strokeRect(5, 8, 4, 10);
    cg.fillStyle = '#f2f3f5';
    cg.beginPath();
    cg.arc(7, 5, 3, 0, Math.PI * 2);
    cg.fill();
    cg.strokeStyle = '#0b0b0b';
    cg.lineWidth = .9;
    cg.beginPath();
    cg.arc(7, 5, 3, 0, Math.PI * 2);
    cg.stroke();
    cg.strokeStyle = '#0b0b0b';
    cg.lineWidth = 1.1;
    const t = f / 6 * Math.PI * 2, hipX = 7, hipY = 18, footY = 22;
    const legA = Math.sin(t), legB = Math.sin(t + Math.PI);
    cg.beginPath();
    cg.moveTo(hipX, hipY);
    cg.lineTo(hipX + 3 * legA, footY);
    cg.moveTo(hipX, hipY);
    cg.lineTo(hipX + 3 * legB, footY);
    const armA = Math.sin(t + Math.PI / 2), armB = Math.sin(t + Math.PI / 2 + Math.PI);
    cg.moveTo(7, 10);
    cg.lineTo(7 + 4 * armA, 14);
    cg.moveTo(7, 10);
    cg.lineTo(7 + 4 * armB, 14);
    cg.stroke();
    frames.push(off);
  }
  return { frames, w, h };
}

export function buildSoldierSprites() {
  const scales = { small: 8, medium: 12, large: 16 };
  const out = {};
  ['small', 'medium', 'large'].forEach(sz => {
    const [c0, c1] = SIZE_COLOR[sz];
    out[sz] = [makeSoldierFrames(scales[sz], c0), makeSoldierFrames(scales[sz], c1)];
  });

  function makeSheetImage(url, label) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onerror = () => console.warn(label + ' failed to load');
    return img;
  }

  const sheets = {
    base: makeSheetImage(GOTCHI_TEST_URL, 'Gotchi sprite 2729'),
    alt: makeSheetImage(GOTCHI_ALT_URL, 'Gotchi sprite 2731')
  };

  function applySharedSheet(target, img, drawScale, laneFactor) {
    Object.assign(target, {
      usesSheet: true,
      sheetImg: img,
      sheetFrameW: FAR1_SHEET_W,
      sheetFrameH: FAR1_SHEET_H,
      walkRow: FAR1_WALK_ROW,
      attackRow: FAR1_ATTACK_ROW,
      hurtRow: FAR1_HURT_ROW,
      deathRow: FAR1_DEATH_ROW,
      framesPerRow: FAR1_FRAMES,
      rowFrameCounts: FAR1_ROW_FRAME_COUNTS.slice(),
      sheetDrawScale: drawScale,
      sheetFlip: false,
      sheetLaneFactor: laneFactor,
      customFrameMs: FAR1_FRAME_MS,
      customWalkFrameMs: FAR1_WALK_FRAME_MS
    });
  }

  [
    ['small', 0, sheets.alt, 2, 0.10],
    ['small', 1, sheets.base, 2, 0.10],
    ['medium', 0, sheets.alt, 3, 0.20],
    ['medium', 1, sheets.base, 3, 0.20],
    ['large', 0, sheets.alt, 6, 0.50],
    ['large', 1, sheets.base, 6, 0.50]
  ].forEach(([size, variant, img, drawScale, laneFactor]) => {
    applySharedSheet(out[size][variant], img, drawScale, laneFactor);
  });

  return out;
}

export function updateSoldierAnimation(s, dt) {
  const animRowNow = getAnimRow(s);
  if (s.usesSheet && s.currentAnimRow !== animRowNow) {
    s.currentAnimRow = animRowNow;
    s.frame = 0;
    s.animAcc = 0;
  }
  const animFrameMs = (s.usesSheet && s.walkFrameMs && s.aiming <= 0 && s.shooting <= 0 && !s.dying && !s.dead)
    ? s.walkFrameMs
    : s.frameMs;
  s.animAcc += dt * 1000;
  if (s.animAcc >= animFrameMs) {
    s.animAcc -= animFrameMs;
    const frameCount = s.usesSheet ? getRowFrameCount(s, getAnimRow(s)) : s.frames.length;
    s.frame = (s.frame + 1) % frameCount;
  }
}
