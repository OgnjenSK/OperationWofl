import {
  SIZE_COLOR, TYPE_NAMES, TYPE_SPEEDS, ENEMY_Y_SHIFT,
  LEVEL_CONFIG, MAX_LEVEL, SOLDIER_FRAME_MS, JAM_CHANCE,
  CROUCH_SCALE_Y, FAR1_SHEET_W, FAR1_SHEET_H, FAR1_HURT_FRAME_MS,
  FAR1_IDLE_ROW, FAR1_STANCE_ROW, FAR1_ATTACK_ROW, FAR1_HURT_ROW, FAR1_DEATH_ROW,
  SAND_SPLASH_FRAMES, SAND_SPLASH_FRAME_MS, SAND_SPLASH_DRAW_SCALE, BAND_UNIT_SCALE,
  MAG_SIZE, AMMO_MAGS, AMMO_REFILL_MS, PLAYER_MAX_HEALTH
} from './config.js?v=sfx70';
import { state } from './state.js?v=sfx29';
import { playShootSound, playEnemyGaspSound, playRadarHitSound, playPalmHitSound, playCactusTearSound, playCactusSplashSound, playPyramidHitSound, playJamSound, playMagOutSound, playReloadSound, playEnemyShootSound, playWingFlapSound, playDesertLaserSound, playFireballSound } from './audio.js?v=sfx51';
import { damagePlayer, setHud } from './ui.js?v=sfx32';
import {
  getAnimRow, getRowFrameCount, getAttackAnimDuration, updateSoldierAnimation
} from './sprites.js?v=sfx26';
import { findFrontmostPropAt, applyPropHit, hitWorldPropAt, resetCityScroll } from './background.js?v=sfx111';

let onLevelComplete = () => {};

export function setOnLevelComplete(fn) {
  onLevelComplete = fn;
}

export function getEnemyHitbox(s) {
  let widthFactor = 0.38;
  let heightFactor = 0.32;
  let topFactor = 0.34;
  if (s.size === 'small') {
    widthFactor = 0.32;
    heightFactor = 0.28;
    topFactor = 0.36;
  } else if (s.size === 'medium') {
    widthFactor = 0.33;
    heightFactor = 0.28;
    topFactor = 0.36;
  }
  const hw = Math.round(s.w * widthFactor);
  const hh = Math.round(s.h * heightFactor);
  const hx = Math.round(s.x + (s.w - hw) * 0.5);
  const hy = Math.round(s.y + s.h * topFactor);
  return { x: hx, y: hy, w: hw, h: hh };
}

export function getEnemyBounds(s) {
  if (s.usesSheet) {
    const srcW = s.sheetFrameW || FAR1_SHEET_W;
    const srcH = s.sheetFrameH || FAR1_SHEET_H;
    const drawW = Math.round(srcW * s.sheetDrawScale);
    const drawH = Math.round(srcH * s.sheetDrawScale);
    const dx = Math.round(s.x + (s.w - drawW) * 0.5);
    const lanePush = Math.round(Math.max(0, drawH - s.h) * (s.sheetLaneFactor || 0));
    const dy = Math.round(s.y + (s.h - drawH) + lanePush);
    return { x: dx, y: dy, w: drawW, h: drawH };
  }
  if (s.name === 'far2' && s.rolling) {
    const cx = s.x + s.w * 0.5;
    const cy = s.y + s.h * 0.8;
    const r = Math.min(s.w, s.h) * 0.45;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  const isCrouch = s.name === 'front1' && (s.aiming > 0 || s.shooting > 0);
  if (isCrouch) {
    const yPrime = s.y + s.h - s.h * CROUCH_SCALE_Y;
    return { x: s.x, y: yPrime, w: s.w, h: Math.round(s.h * CROUCH_SCALE_Y) };
  }
  return { x: s.x, y: s.y, w: s.w, h: s.h };
}

function markEnemyKilled(target) {
  target.dying = true;
  target.dead = false;
  target.bursting = false;
  target.shooting = 0;
  target.shoot = 0;
  target.preAttack = null;
  target.idleLoopsLeft = 0;
  target.aiming = 0;
  target.desertPhase = null;
  target.desertShotsLeft = 0;
  target.desertIdleLoopsLeft = 0;
  target.desertAtkWrapping = false;
  target.preWindupT = 0;
  target.attackRecoverT = 0;
  target.holdAttack = false;
  if (target.vx != null) target.faceRight = target.vx >= 0;
  else if (target.hx != null) target.faceRight = target.hx >= 0;
  const animRow = target.hurtRow != null ? target.hurtRow : FAR1_HURT_ROW;
  const hurtFrames = target.usesSheet
    ? ((target.rowFrameCounts && target.rowFrameCounts[animRow]) || target.framesPerRow || 4)
    : (target.frames ? target.frames.length : 4);
  // Hurt row ends with a recovery/idle frame — freeze on the last real hit pose.
  const hitPoseFrames = hurtFrames >= 3 ? hurtFrames - 1 : hurtFrames;
  target.deathHoldFrame = Math.max(0, hitPoseFrames - 1);
  target.deathAnimRow = animRow;
  const playMs = target.deathHoldFrame * FAR1_HURT_FRAME_MS;
  const holdMs = target.name === 'dragon' ? 420 : 140;
  target.deathTimer = (playMs + holdMs) / 1000;
  target.deathSlideSpeed = Math.max(80, (target.moveSpeed || target.cruiseSpeed || 140) * 0.6);
  target.frame = 0;
  target.animAcc = 0;
  target.currentAnimRow = animRow;
  if (state.enemiesLeft > 0) {
    state.enemiesLeft--;
    setHud();
    if (state.enemiesLeft === 0) onLevelComplete();
  }
}

function bandDepthIndexForFeet(feetY) {
  let bandIndex = 0;
  for (let i = 0; i < state.bands.length; i++) {
    const b = state.bands[i];
    if (feetY >= b.y && feetY < b.y + b.h) return i;
    if (feetY >= b.y) bandIndex = i;
  }
  return bandIndex;
}

function chooseFrontmostHit(x, y) {
  let best = null;
  let bestDepth = -1e9;

  state.soldiers.forEach(s => {
    if (s.dying || s.dead) return;
    const hb = getEnemyHitbox(s);
    if (x < hb.x || x > hb.x + hb.w || y < hb.y || y > hb.y + hb.h) return;
    const feet = s.y + s.h;
    const depth = bandDepthIndexForFeet(feet) * 1e6 + feet;
    if (depth > bestDepth) {
      bestDepth = depth;
      best = { type: 'enemy', target: s, depth };
    }
  });

  const midY = state.bands[1] ? state.bands[1].y : 0;
  state.fliers.forEach(f => {
    if (f.dying || f.dead) return;
    if (x < f.x - f.r || x > f.x + f.r || y < f.y - f.r || y > f.y + f.r) return;
    const depth = midY - 10 + (f.y + f.r) * 0.0001;
    if (depth > bestDepth) {
      bestDepth = depth;
      best = { type: 'enemy', target: f, depth };
    }
  });

  const prop = findFrontmostPropAt(x, y);
  if (prop && prop.depth > bestDepth) {
    best = { type: 'prop', prop, depth: prop.depth };
  }
  return best;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function getFlierBounds(f) {
  const drawW = Math.round((f.sheetFrameW || FAR1_SHEET_W) * (f.sheetDrawScale || 2.4));
  const drawH = Math.round((f.sheetFrameH || FAR1_SHEET_H) * (f.sheetDrawScale || 2.4));
  return {
    x: Math.round(f.x - drawW * 0.5),
    y: Math.round(f.y - drawH * 0.5),
    w: drawW,
    h: drawH
  };
}

function shotHitsWorldObject(x, y) {
  for (let i = 0; i < state.soldiers.length; i++) {
    if (pointInRect(x, y, getEnemyBounds(state.soldiers[i]))) return true;
  }
  for (let i = 0; i < state.fliers.length; i++) {
    if (pointInRect(x, y, getFlierBounds(state.fliers[i]))) return true;
  }
  return hitWorldPropAt(x, y);
}

function bandIndexAtY(y) {
  const bands = state.bands;
  if (!bands.length) return -1;
  if (y < bands[0].y) return -1;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (y < b.y + b.h) return i;
  }
  return bands.length - 1;
}

function spawnSandSplash(x, y) {
  const bandIndex = bandIndexAtY(y);
  if (bandIndex < 0) return;
  const unit = BAND_UNIT_SCALE[bandIndex] || BAND_UNIT_SCALE[BAND_UNIT_SCALE.length - 1];
  const front = BAND_UNIT_SCALE[BAND_UNIT_SCALE.length - 1];
  state.effects.push({
    type: 'sandSplash',
    x,
    y,
    t: 0,
    dur: (SAND_SPLASH_FRAMES * SAND_SPLASH_FRAME_MS) / 1000,
    bandIndex,
    scale: SAND_SPLASH_DRAW_SCALE * (unit / front)
  });
}

let ammoRefillTimer = null;

function scheduleAmmoRefill() {
  clearTimeout(ammoRefillTimer);
  ammoRefillTimer = setTimeout(() => {
    ammoRefillTimer = null;
    if (state.phase !== 'play' || state.ammo > 0 || state.mags > 1) return;
    state.mags = AMMO_MAGS;
    state.ammo = state.magSize;
    playReloadSound();
    setHud();
  }, AMMO_REFILL_MS);
}

export function handleShoot(x, y) {
  if (state.phase !== 'play') return;
  if (state.jammed) {
    playJamSound();
    setHud();
    return;
  }
  if (state.ammo <= 0) {
    playJamSound();
    return;
  }
  state.ammo--;
  if (state.ammo <= 0 && state.mags <= 1) scheduleAmmoRefill();
  const hit = chooseFrontmostHit(x, y);
  const skyMiss = !hit && !hitWorldPropAt(x, y) && bandIndexAtY(y) < 0;
  playShootSound(skyMiss ? 0.35 : 1);
  state.effects.push({ type: 'flash', x, y, t: 0, dur: 0.15 });
  if (Math.random() < (JAM_CHANCE || 0.02)) {
    state.jammed = true;
    state.reloadDir = 0;
  }
  setHud();
  if (!hit) {
    if (!shotHitsWorldObject(x, y)) spawnSandSplash(x, y);
    return;
  }
  if (hit.type === 'enemy') {
    const target = hit.target;
    if (target.hp != null) {
      target.hp--;
      if (target.hp <= 0) {
        playEnemyGaspSound();
        markEnemyKilled(target);
      }
    } else {
      playEnemyGaspSound();
      markEnemyKilled(target);
    }
    state.effects.push({ type: 'hit', x, y, t: 0, dur: 0.18 });
    return;
  }
  const kind = applyPropHit(hit.prop, x, y);
  if (kind === 'palm' || kind === 'cactus') playPalmHitSound();
  if (kind === 'cactusTear') playCactusTearSound();
  if (kind === 'cactusSplash') playCactusSplashSound();
  if (kind === 'pyramid' || kind === 'pyramid2' || kind === 'coconut') playPyramidHitSound();
  if (kind === 'radar') {
    playRadarHitSound();
    state.effects.push({ type: 'hit', x, y, t: 0, dur: 0.18 });
  }
}

export function handleReload() {
  if (state.phase !== 'play') return;
  if (state.ammo > 0 || state.mags <= 1) return;
  playMagOutSound();
  setTimeout(() => playReloadSound(), 120);
  state.mags--;
  state.ammo = state.magSize;
  setHud();
}

export function handleReloadWheel(deltaY) {
  if (state.phase !== 'play') return;
  if (!state.jammed) {
    state.reloadDir = 0;
    return;
  }
  const dir = deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0;
  if (!dir) return;
  if (!state.reloadDir) {
    state.reloadDir = dir;
    playMagOutSound();
    setHud();
    return;
  }
  if (dir === state.reloadDir) return;
  state.reloadDir = 0;
  state.jammed = false;
  playReloadSound();
  setHud();
}

function createSoldier(size, spr, name, x, y, dir, shot) {
  const s = {
    size, name, x, y, dir, w: spr.w, h: spr.h,
    frames: spr.frames || null, frame: 0,
    usesSheet: !!spr.usesSheet,
    sheetImg: spr.sheetImg || null,
    walkRow: spr.walkRow || 0,
    idleRow: spr.idleRow != null ? spr.idleRow : FAR1_IDLE_ROW,
    stanceRow: spr.stanceRow != null ? spr.stanceRow : FAR1_STANCE_ROW,
    attackRow: spr.attackRow != null ? spr.attackRow : FAR1_ATTACK_ROW,
    hurtRow: spr.hurtRow || 0,
    deathRow: spr.deathRow || 0,
    framesPerRow: spr.framesPerRow || 6,
    sheetDrawScale: spr.sheetDrawScale || 1,
    sheetFlip: spr.sheetFlip == null ? true : spr.sheetFlip,
    sheetLaneFactor: spr.sheetLaneFactor || 0,
    rowFrameCounts: spr.rowFrameCounts ? spr.rowFrameCounts.slice() : null,
    frameMs: spr.customFrameMs || SOLDIER_FRAME_MS[size],
    walkFrameMs: spr.customWalkFrameMs || null,
    animAcc: 0,
    moveSpeed: TYPE_SPEEDS[name] * 1.5,
    shooting: 0,
    nextShotIn: shot,
    aiming: 0,
    color: SIZE_COLOR[size][TYPE_NAMES[size].indexOf(name)],
    dead: false,
    dying: false,
    deathTimer: 0,
    deathSlideSpeed: 0,
    currentAnimRow: (spr.walkRow || 0)
  };
  if (name === 'far2') { s.rolling = false; s.rollIn = 0.8 + Math.random() * 1.4; s.rollTime = 0; }
  if (isDesertSoldier(s)) {
    s.bursting = false;
    s.burstShotsLeft = 0;
    s.burstGapTimer = 0;
    s.desertPhase = null;
    s.desertShotsLeft = 0;
    s.desertIdleLoopsLeft = 0;
    s.desertAtkWrapping = false;
  }
  return s;
}

function isDesertSoldier(s) {
  // All ground lane soldiers use Desert Basic; dragon is flier-only.
  return s.name === 'far1' || s.name === 'far2'
    || s.name === 'middle1' || s.name === 'middle2'
    || s.name === 'front1' || s.name === 'front2';
}

/** Ground strips (fraction of a band's height) where each size picks its base line; one strip chosen at random. */
const SPAWN_LANES = {
  small: [{ band: 1, from: 0, to: 0.6 }],
  medium: [{ band: 2, from: 0, to: 0.2 }, { band: 1, from: 0.8, to: 1 }],
  large: [{ band: 2, from: 0.4, to: 1 }]
};
const LANE_NAMES = { small: 'far', medium: 'middle', large: 'front' };

function laneBaseRange(lane) {
  const band = state.bands[lane.band];
  const min = band.y + band.h * lane.from + 2;
  const max = Math.max(min + 1, band.y + band.h * lane.to - 2);
  return { min, max };
}

/** Screen-space Y ranges where each lane's enemies have their feet (for the debug overlay). */
export function getEnemyLanes() {
  const out = [];
  Object.keys(SPAWN_LANES).forEach(size => {
    const spr = state.soldierSprites && state.soldierSprites[size] && state.soldierSprites[size][0];
    const feetShift = spr ? Math.round(spr.h * ENEMY_Y_SHIFT) : 0;
    SPAWN_LANES[size].forEach(lane => {
      const { min, max } = laneBaseRange(lane);
      out.push({ size, name: LANE_NAMES[size], top: min + feetShift, bottom: max + feetShift });
    });
  });
  return out;
}

function spawnOne(size) {
  const lanes = SPAWN_LANES[size];
  const { min, max } = laneBaseRange(lanes[(Math.random() * lanes.length) | 0]);
  const base = min + Math.random() * (max - min);
  const variants = state.soldierSprites[size];
  const idx = Math.random() < 0.5 ? 0 : 1;
  const spr = variants[idx];
  const name = TYPE_NAMES[size][idx];
  const y = base - spr.h + Math.round(spr.h * ENEMY_Y_SHIFT);
  const dir = Math.random() < 0.35 ? 1 : -1;
  const x = dir === -1 ? state.W + 20 : -spr.w - 20;
  let shot = size === 'small' ? 2.3 + Math.random() * 0.9 : size === 'medium' ? 1.4 + Math.random() * 0.6 : 1.2 + Math.random() * 0.6;
  if (name === 'middle2') shot = 0.8 + Math.random() * 0.5;
  state.soldiers.push(createSoldier(size, spr, name, x, y, dir, shot));
}

function updateDyingSoldier(s, dt) {
  if (!s.dying) return;
  s.deathTimer -= dt;
  s.x -= s.dir * s.deathSlideSpeed * dt;
  if (s.deathTimer <= 0) s.dead = true;
}

function updateFar2Roll(s, dt) {
  if (s.dying || s.name !== 'far2') return;
  if (s.rolling) {
    s.rollTime -= dt;
    if (s.rollTime <= 0) {
      s.rolling = false;
      s.rollIn = 1.6 + Math.random() * 1.4;
    }
  } else {
    s.rollIn -= dt;
    if (s.rollIn <= 0) {
      s.rolling = true;
      s.rollTime = 0.55 + Math.random() * 0.35;
    }
  }
}

function triggerEnemyShot(s) {
  s.shooting = getAttackAnimDuration(s);
  playEnemyShootSound();
  damagePlayer(1);
}

function fireDesertShot(s) {
  damagePlayer(1);
  if (s.desertShotsLeft > 0) s.desertShotsLeft--;
}

/** Zing on 1st / 3rd / 5th attack frames (0-based 0, 2, 4). */
function playDesertZapIfFrame(s) {
  if (s.frame === 0 || s.frame === 2 || s.frame === 4) {
    playDesertLaserSound();
  }
}

function resetNextShot(s) {
  s.nextShotIn = s.size === 'small' ? 2.3 + Math.random() * 0.9 : s.size === 'medium' ? 1.4 + Math.random() * 0.6 : 1.2 + Math.random() * 0.6;
}

/** Desert basic often chains 2–3 attacks (~70%); otherwise a single shot. */
function chooseDesertBurstCount() {
  const roll = Math.random();
  if (roll < 0.45) return 2;
  if (roll < 0.70) return 3;
  return 1;
}

/**
 * Desert attack sequence:
 *   1) small chance: idle (1st row) three full loops — if so, skip prepare
 *   2) prepare: 3rd row, frames 0–2 (skipped when idle played)
 *   3) attack: 4th row — from prepare always starts on frame 4; otherwise from 0
 *      chained shots play full loop; final/single cuts after 3rd frame → reset
 *      (if final started past the cut, wrap once so the attack still plays through)
 *   4) reset: 3rd row, frames 3–5
 *   5) walk
 */
const DESERT_PREPARE_END = 2;     // 3rd row frames 0–2
const DESERT_RESET_START = 3;     // 3rd row frames 3–5
const DESERT_RESET_END = 5;
const DESERT_ATK_LAST_CUT = 2;    // 4th row — cut final attack after third frame
const DESERT_ATK_FROM_PREPARE = 3; // 4th frame (0-based) after prepare
const DESERT_IDLE_CHANCE = 0.50;

function beginDesertCombat(s) {
  s.desertShotsLeft = chooseDesertBurstCount();
  s.bursting = true;
  s.burstShotsLeft = 0;
  s.shooting = 0;
  s.aiming = 0;
  s.animAcc = 0;
  // Optional idle: after it finishes, skip prepare and go straight to attack.
  if (Math.random() < DESERT_IDLE_CHANCE) {
    s.desertPhase = 'idleWait';
    s.desertIdleLoopsLeft = 3;
    s.currentAnimRow = s.idleRow != null ? s.idleRow : FAR1_IDLE_ROW;
    s.frame = 0;
  } else {
    startDesertPrepare(s);
  }
}

function startDesertPrepare(s) {
  const stanceRow = s.stanceRow != null ? s.stanceRow : FAR1_STANCE_ROW;
  s.desertPhase = 'prepare';
  s.currentAnimRow = stanceRow;
  s.frame = 0;
  s.animAcc = 0;
}

function startDesertAttackPhase(s, startFrame = 0) {
  const attackRow = s.attackRow != null ? s.attackRow : FAR1_ATTACK_ROW;
  s.desertPhase = 'attack';
  s.currentAnimRow = attackRow;
  s.frame = startFrame;
  s.animAcc = 0;
  // Final attack started past the cut must wrap so it still plays through once.
  s.desertAtkWrapping = startFrame > DESERT_ATK_LAST_CUT;
  fireDesertShot(s);
  playDesertZapIfFrame(s);
}

function startDesertReset(s) {
  const stanceRow = s.stanceRow != null ? s.stanceRow : FAR1_STANCE_ROW;
  s.desertPhase = 'reset';
  s.currentAnimRow = stanceRow;
  s.frame = DESERT_RESET_START;
  s.animAcc = 0;
}

function updateDesertCombat(s, dt) {
  if (!s.desertPhase) return false;
  const frameMs = s.frameMs || 90;
  const attackRow = s.attackRow != null ? s.attackRow : FAR1_ATTACK_ROW;
  const stanceRow = s.stanceRow != null ? s.stanceRow : FAR1_STANCE_ROW;
  const idleRow = s.idleRow != null ? s.idleRow : FAR1_IDLE_ROW;
  s.animAcc = (s.animAcc || 0) + dt * 1000;

  while (s.animAcc >= frameMs) {
    s.animAcc -= frameMs;

    if (s.desertPhase === 'idleWait') {
      s.currentAnimRow = idleRow;
      const count = getRowFrameCount(s, idleRow);
      if (s.frame < count - 1) {
        s.frame += 1;
      } else if ((s.desertIdleLoopsLeft || 1) > 1) {
        // Still more idle loops to play.
        s.desertIdleLoopsLeft -= 1;
        s.frame = 0;
        break;
      } else {
        // Three idle loops done — skip prepare, start attack.
        s.desertIdleLoopsLeft = 0;
        startDesertAttackPhase(s);
        break;
      }
    } else if (s.desertPhase === 'prepare') {
      s.currentAnimRow = stanceRow;
      if (s.frame < DESERT_PREPARE_END) {
        s.frame += 1;
      } else {
        // After prepare, attack always begins on the 4th frame.
        startDesertAttackPhase(s, DESERT_ATK_FROM_PREPARE);
        break;
      }
    } else if (s.desertPhase === 'attack') {
      s.currentAnimRow = attackRow;
      const last = getRowFrameCount(s, attackRow) - 1;
      const moreShots = s.desertShotsLeft > 0;
      if (moreShots) {
        if (s.frame < last) {
          s.frame += 1;
          playDesertZapIfFrame(s);
        } else {
          // Chained — repeat full attack anim from the start.
          s.frame = 0;
          s.desertAtkWrapping = false;
          fireDesertShot(s);
          playDesertZapIfFrame(s);
          break;
        }
      } else if (s.desertAtkWrapping) {
        // Final attack started past the cut (e.g. frame 4 after prepare):
        // play out → wrap → cut after 3rd frame so it still performs once.
        if (s.frame === DESERT_ATK_LAST_CUT) {
          s.desertAtkWrapping = false;
          startDesertReset(s);
          break;
        }
        if (s.frame < last) s.frame += 1;
        else s.frame = 0;
        playDesertZapIfFrame(s);
      } else if (s.frame < DESERT_ATK_LAST_CUT) {
        s.frame += 1;
        playDesertZapIfFrame(s);
      } else {
        // Final attack from frame 0 — cut after 3rd frame → reset.
        startDesertReset(s);
        break;
      }
    } else if (s.desertPhase === 'reset') {
      s.currentAnimRow = stanceRow;
      if (s.frame < DESERT_RESET_END) {
        s.frame += 1;
      } else {
        s.desertPhase = null;
        s.desertShotsLeft = 0;
        s.desertAtkWrapping = false;
        s.bursting = false;
        s.shooting = 0;
        resetNextShot(s);
        s.currentAnimRow = s.walkRow;
        s.frame = 0;
        break;
      }
    }
  }
  return true;
}

function updateEnemyBurst(s, dt) {
  if (s.dying) return false;
  if (isDesertSoldier(s) && s.desertPhase) return updateDesertCombat(s, dt);
  if (!s.bursting) return false;
  if (s.shooting > 0) s.shooting -= dt;
  else if (s.burstShotsLeft > 0) {
    // Chain next full attack anim — no walk-pose gap between shots.
    triggerEnemyShot(s);
    s.burstShotsLeft--;
    s.frame = 0;
    s.animAcc = 0;
  } else {
    s.bursting = false;
    resetNextShot(s);
  }
  return true;
}

function updateStandardEnemyState(s, dt) {
  if (s.dying) return;
  if (s.desertPhase) return;
  if (s.shooting > 0) s.shooting -= dt;
  else if (s.nextShotIn <= 0) {
    if (isDesertSoldier(s)) {
      beginDesertCombat(s);
    } else if (s.name === 'front1') {
      s.aiming = 0.35;
      s.nextShotIn = 1.2 + Math.random() * 0.7;
    } else {
      triggerEnemyShot(s);
      resetNextShot(s);
    }
  } else if (s.aiming > 0) {
    s.aiming -= dt;
    if (s.aiming <= 0) triggerEnemyShot(s);
  } else {
    let speed = s.moveSpeed;
    if (s.name === 'far2' && s.rolling) speed *= 2.0;
    s.x += s.dir * speed * dt;
  }
}

function tickSoldierSpawnTimer(size, dt, base, variance) {
  const T = state.soldierTimers;
  const scale = state.spawnScale || 1;
  T[size] -= dt;
  if (T[size] <= 0) {
    spawnOne(size);
    T[size] = (base + Math.random() * variance) * scale;
  }
}

export function updateSoldiers(dt) {
  tickSoldierSpawnTimer('small', dt, 3, 2);
  tickSoldierSpawnTimer('medium', dt, 3.5, 2.5);
  tickSoldierSpawnTimer('large', dt, 4, 3);

  state.soldiers.forEach(s => {
    updateDyingSoldier(s, dt);
    s.nextShotIn -= dt;

    if (s.usesSheet) {
      if (s.dying || s.dead) {
        const hold = (s.deathHoldFrame != null)
          ? s.deathHoldFrame
          : Math.max(0, getRowFrameCount(s, s.hurtRow) - 1);
        s.currentAnimRow = s.hurtRow;
        if (s.frame > hold) s.frame = hold;
      } else {
        const rowLimit = getRowFrameCount(s, getAnimRow(s));
        if (s.frame >= rowLimit) s.frame = 0;
      }
    }

    updateFar2Roll(s, dt);
    if (!updateEnemyBurst(s, dt)) updateStandardEnemyState(s, dt);
    updateSoldierAnimation(s, dt);
  });

  state.soldiers = state.soldiers.filter(s => !s.dead && (s.dir === -1 ? (s.x + s.w > -40) : (s.x < state.W + 40)));
}

function spawnFlier() {
  const spr = state.soldierSprites && state.soldierSprites.flier;
  const side = (Math.random() * 3) | 0;
  const r = spr ? Math.round(Math.min(spr.w, spr.h) * 0.28) : 60;
  const speed = 180 + Math.random() * 120;
  let x, y, vx, vy;
  const startY = Math.random() * state.H * 0.35 + 10;
  if (side === 0) { x = -40; y = startY; vx = speed; vy = 40 - 80 * Math.random(); }
  else if (side === 1) { x = state.W + 40; y = startY; vx = -speed; vy = 40 - 80 * Math.random(); }
  else { x = Math.random() * state.W; y = -40; vx = 80 - 160 * Math.random(); vy = speed; }
  // Normalize spawn velocity to the cruise speed (keeps direction, fixed magnitude).
  const spawnLen = Math.max(1, Math.hypot(vx, vy));
  vx = (vx / spawnLen) * speed;
  vy = (vy / spawnLen) * speed;
  state.fliers.push({
    x, y, vx, vy, r, hp: 5,
    cruiseSpeed: speed,
    speedMul: 1,
    attackRecoverT: 0,
    preWindupT: 0,
    turnIn: 2.0 + Math.random() * 2.0,
    shoot: 0,
    burstShotsLeft: 0,
    dead: false,
    dying: false,
    name: 'dragon',
    usesSheet: !!(spr && spr.usesSheet),
    sheetImg: spr ? spr.sheetImg : null,
    sheetFrameW: spr ? spr.sheetFrameW : FAR1_SHEET_W,
    sheetFrameH: spr ? spr.sheetFrameH : FAR1_SHEET_H,
    idleRow: spr && spr.idleRow != null ? spr.idleRow : FAR1_IDLE_ROW,
    walkRow: spr ? spr.walkRow : 1,
    attackRow: spr ? spr.attackRow : 3,
    hurtRow: spr && spr.hurtRow != null ? spr.hurtRow : FAR1_HURT_ROW,
    deathRow: spr && spr.deathRow != null ? spr.deathRow : FAR1_DEATH_ROW,
    framesPerRow: spr ? spr.framesPerRow : 7,
    rowFrameCounts: spr && spr.rowFrameCounts ? spr.rowFrameCounts.slice() : null,
    sheetDrawScale: spr ? spr.sheetDrawScale : 2.4,
    sheetFlip: false,
    w: spr ? spr.w : 120,
    h: spr ? spr.h : 120,
    frame: 0,
    animAcc: 0,
    frameMs: spr ? spr.frameMs : 60
  });
}

function getFlierAnimRow(f) {
  if (f.dying || f.dead) {
    return f.deathAnimRow != null
      ? f.deathAnimRow
      : (f.hurtRow != null ? f.hurtRow : FAR1_HURT_ROW);
  }
  if (f.shoot > 0 || f.bursting) return f.attackRow != null ? f.attackRow : FAR1_ATTACK_ROW;
  if (f.preAttack === 'idle' || f.preAttack === 'idleAfter') {
    return f.idleRow != null ? f.idleRow : FAR1_IDLE_ROW;
  }
  return f.walkRow || 1;
}

const FLIER_IDLE_LOOPS = 2;
const FLIER_SLOW_MUL = 0.22;
const FLIER_WINDUP = 0.7;
const FLIER_TURN_MIN = 2.8;
const FLIER_TURN_RANGE = 2.2;
const FLIER_HOLD_CHANCE = 0.4;

function flierInCombat(f) {
  return !!(f.bursting || f.shoot > 0 || f.preAttack || f.attackRecoverT > 0 || f.preWindupT > 0);
}

function beginFlierIdle(f, phase) {
  f.preAttack = phase;
  f.idleLoopsLeft = FLIER_IDLE_LOOPS;
  f.currentAnimRow = f.idleRow != null ? f.idleRow : FAR1_IDLE_ROW;
  f.frame = 0;
  f.animAcc = 0;
}

function applyFlierSpeed(f, dt) {
  if (f.preWindupT > 0) {
    const u = 1 - f.preWindupT / FLIER_WINDUP;
    f.speedMul = 1 + (FLIER_SLOW_MUL - 1) * u;
  } else if (f.attackRecoverT > 0) {
    const u = 1 - f.attackRecoverT / FLIER_WINDUP;
    f.speedMul = FLIER_SLOW_MUL + (1 - FLIER_SLOW_MUL) * u;
  } else {
    const attacking = f.bursting || f.shoot > 0;
    const targetMul = (f.holdAttack && attacking) ? 0
      : (attacking || f.preAttack) ? FLIER_SLOW_MUL : 1;
    const blend = Math.min(1, dt * 5);
    f.speedMul = (f.speedMul == null ? 1 : f.speedMul) + (targetMul - f.speedMul) * blend;
  }
  const dirLen = Math.hypot(f.vx, f.vy);
  let ux, uy;
  if (dirLen > 1) {
    ux = f.vx / dirLen;
    uy = f.vy / dirLen;
    f.hx = ux;
    f.hy = uy;
  } else {
    ux = f.hx == null ? 1 : f.hx;
    uy = f.hy == null ? 0 : f.hy;
  }
  const spd = (f.cruiseSpeed || 180) * (f.speedMul == null ? 1 : f.speedMul);
  f.vx = ux * spd;
  f.vy = uy * spd;
}

function resetFlierTurnIn(f) {
  f.turnIn = FLIER_TURN_MIN + Math.random() * FLIER_TURN_RANGE;
}

function beginFlierAttack(f) {
  f.preAttack = null;
  f.idleLoopsLeft = 0;
  f.bursting = true;
  f.burstShotsLeft = 9;
  f.holdAttack = Math.random() < FLIER_HOLD_CHANCE;
  const len = Math.max(1, Math.hypot(f.vx, f.vy));
  f.hx = f.vx / len;
  f.hy = f.vy / len;
  const attackFrames = (f.rowFrameCounts && f.rowFrameCounts[f.attackRow]) || 6;
  f.shoot = (attackFrames * (f.frameMs || 60)) / 1000;
  f.frame = 0;
  f.animAcc = 0;
  f.currentAnimRow = f.attackRow != null ? f.attackRow : FAR1_ATTACK_ROW;
  damagePlayer(1);
}

function updateDyingFlier(f, dt) {
  f.deathTimer -= dt;
  if (f.deathTimer <= 0) f.dead = true;
  f.vx *= Math.max(0, 1 - 2.4 * dt);
  f.vy += 260 * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  updateSoldierAnimation(f, dt);
}

export function updateFliers(dt) {
  state.flyingTimer -= dt;
  if (state.flyingTimer <= 0) {
    if (state.fliers.length < 2) {
      spawnFlier();
      state.flyingTimer = 3 + Math.random() * 3;
    } else {
      state.flyingTimer = 0.75;
    }
  }
  state.fliers.forEach(f => {
    if (f.dead) return;
    if (f.dying) {
      updateDyingFlier(f, dt);
      return;
    }
    if (f.attackRecoverT > 0) {
      f.attackRecoverT -= dt;
      if (f.attackRecoverT <= 0) {
        f.attackRecoverT = 0;
        resetFlierTurnIn(f);
      }
    }
    if (f.preWindupT > 0) {
      f.preWindupT -= dt;
      if (f.preWindupT <= 0) {
        f.preWindupT = 0;
        beginFlierIdle(f, 'idle');
      }
    }
    if (!flierInCombat(f)) {
      f.turnIn -= dt;
      if (f.turnIn <= 0) {
        f.preWindupT = FLIER_WINDUP;
      }
    }
    if (f.shoot > 0) {
      f.shoot -= dt;
      if (f.shoot <= 0) {
        if (f.burstShotsLeft > 0) {
          damagePlayer(1);
          f.burstShotsLeft--;
          const attackFrames = (f.rowFrameCounts && f.rowFrameCounts[f.attackRow]) || 6;
          f.shoot = (attackFrames * (f.frameMs || 60)) / 1000;
          f.frame = 0;
          f.animAcc = 0;
        } else {
          f.bursting = false;
          f.holdAttack = false;
          beginFlierIdle(f, 'idleAfter');
        }
      }
    }

    applyFlierSpeed(f, dt);

    const animRow = getFlierAnimRow(f);
    if (f.currentAnimRow !== animRow) {
      f.currentAnimRow = animRow;
      f.frame = 0;
      f.animAcc = 0;
    }
    f.animAcc = (f.animAcc || 0) + dt * 1000;
    const frameMs = f.frameMs || 60;
    if (f.animAcc >= frameMs) {
      f.animAcc -= frameMs;
      const frameCount = (f.rowFrameCounts && f.rowFrameCounts[animRow]) || f.framesPerRow || 7;
      const prevFrame = f.frame || 0;
      f.frame = (prevFrame + 1) % frameCount;
      const loopDone = f.frame === 0 && prevFrame !== 0;
      const attacking = f.shoot > 0 || f.bursting;

      const onScreen = f.x + f.r > 0 && f.x - f.r < state.W
        && f.y + f.r > 0 && f.y - f.r < state.H;

      if (f.preAttack === 'idle' && loopDone) {
        if ((f.idleLoopsLeft || 1) > 1) {
          f.idleLoopsLeft -= 1;
          f.frame = 0;
        } else {
          f.idleLoopsLeft = 0;
          beginFlierAttack(f);
        }
      } else if (f.preAttack === 'idleAfter' && loopDone) {
        if ((f.idleLoopsLeft || 1) > 1) {
          f.idleLoopsLeft -= 1;
          f.frame = 0;
        } else {
          f.preAttack = null;
          f.idleLoopsLeft = 0;
          f.attackRecoverT = FLIER_WINDUP;
          f.currentAnimRow = f.walkRow || 1;
          f.frame = 0;
          f.animAcc = 0;
        }
      } else if (attacking && (f.frame === 2 || f.frame === 5)) {
        // Fireball whoosh on attack frames 2 and 5 (0-based).
        playFireballSound();
      } else if (!attacking && !f.preAttack && onScreen && loopDone) {
        playWingFlapSound();
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const yMax = state.H * 0.33;
    if (f.y > yMax) {
      f.y = yMax;
      if (f.vy > 0) {
        f.vy = 0;
        if (Math.abs(f.vx) < 1) {
          f.vx = (f.vx >= 0 ? 1 : -1) * (f.cruiseSpeed || 180) * (f.speedMul || 1);
        }
      }
    }
  });
  state.fliers = state.fliers.filter(f => !f.dead && f.x > -80 && f.x < state.W + 80 && f.y > -80 && f.y < state.H + 80);
}

export function resetSpawnTimers() {
  const scale = state.spawnScale || 1;
  state.soldierTimers.small = (3 + Math.random() * 2) * scale;
  state.soldierTimers.medium = (3.5 + Math.random() * 2.5) * scale;
  state.soldierTimers.large = (4 + Math.random() * 3) * scale;
  state.flyingTimer = 3 + Math.random() * 3;
}

export function configureLevel(lvl) {
  const cfg = LEVEL_CONFIG[lvl] || LEVEL_CONFIG[1];
  state.enemiesLeft = cfg.enemies;
  state.spawnScale = cfg.spawnScale;
  state.maxHealth = PLAYER_MAX_HEALTH;
  state.health = state.maxHealth;
  state.soldiers.length = 0;
  state.fliers.length = 0;
  state.effects.length = 0;
  state.jammed = false;
  state.reloadDir = 0;
  state.magSize = MAG_SIZE;
  state.ammo = MAG_SIZE;
  state.mags = AMMO_MAGS;
  clearTimeout(ammoRefillTimer);
  ammoRefillTimer = null;
  if (state.bands[0] && state.bands[0].objects) state.bands[0].objects.length = 0;
  if (state.bands[1] && state.bands[1].objects) state.bands[1].objects.length = 0;
  if (state.bands[2] && state.bands[2].objects) state.bands[2].objects.length = 0;
  resetCityScroll();
  resetSpawnTimers();
  setHud();
}

export { MAX_LEVEL, getFlierAnimRow };
