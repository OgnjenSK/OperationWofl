import {
  SIZE_COLOR, TYPE_NAMES, TYPE_SPEEDS, ENEMY_Y_SHIFT,
  LEVEL_CONFIG, MAX_LEVEL, SOLDIER_FRAME_MS
} from './config.js';
import { state } from './state.js';
import { playShootSound, playHitSound, playEnemyShootSound } from './audio.js';
import { damagePlayer, setHud } from './ui.js';
import {
  getAnimRow, getRowFrameCount, getAttackAnimDuration, updateSoldierAnimation
} from './sprites.js';

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

function markEnemyKilled(target) {
  target.dying = true;
  target.deathTimer = 0.45;
  target.deathSlideSpeed = Math.max(80, (target.moveSpeed || 140) * 0.6);
  target.frame = 0;
  target.animAcc = 0;
  target.currentAnimRow = target.hurtRow;
}

function chooseHitTarget(x, y) {
  let target = null;
  let bestFeet = -1e9;
  state.soldiers.forEach(s => {
    if (s.dying || s.dead) return;
    const hb = getEnemyHitbox(s);
    if (x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) {
      const feet = s.y + s.h;
      if (feet > bestFeet) { bestFeet = feet; target = s; }
    }
  });
  if (target) return target;
  state.fliers.forEach(f => {
    if (x >= f.x - f.r && x <= f.x + f.r && y >= f.y - f.r && y <= f.y + f.r) {
      const feet = f.y + f.r;
      if (feet > bestFeet) { bestFeet = feet; target = f; }
    }
  });
  return target;
}

export function handleShoot(x, y) {
  playShootSound();
  state.effects.push({ type: 'flash', x, y, t: 0, dur: 0.15 });
  const target = chooseHitTarget(x, y);
  if (!target) return;
  playHitSound();
  if (target.hp != null) {
    target.hp--;
    if (target.hp <= 0) markEnemyKilled(target);
  } else {
    markEnemyKilled(target);
  }
  state.effects.push({ type: 'hit', x, y, t: 0, dur: 0.18 });
  if (state.enemiesLeft > 0) {
    state.enemiesLeft--;
    setHud();
    if (state.enemiesLeft === 0) onLevelComplete();
  }
}

function createSoldier(size, spr, name, x, y, dir, shot) {
  const s = {
    size, name, x, y, dir, w: spr.w, h: spr.h,
    frames: spr.frames || null, frame: 0,
    usesSheet: !!spr.usesSheet,
    sheetImg: spr.sheetImg || null,
    walkRow: spr.walkRow || 0,
    attackRow: spr.attackRow || 0,
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
  if (name === 'middle2') { s.bursting = false; s.burstShotsLeft = 0; s.burstGapTimer = 0; }
  return s;
}

function spawnOne(size) {
  const b1 = state.bands[1], b2 = state.bands[2];
  const baseIn = (band, a, b) => {
    const top = band.y + band.h * a, bot = band.y + band.h * b;
    const min = top + 2, max = Math.max(min + 1, bot - 2);
    return min + Math.random() * (max - min);
  };
  let base;
  if (size === 'large') base = baseIn(b2, 0.4, 1);
  else if (size === 'medium') base = Math.random() < 0.5 ? baseIn(b2, 0, 0.2) : baseIn(b1, 0.8, 1);
  else base = baseIn(b1, 0, 0.6);
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

function resetNextShot(s) {
  s.nextShotIn = s.size === 'small' ? 2.3 + Math.random() * 0.9 : s.size === 'medium' ? 1.4 + Math.random() * 0.6 : 1.2 + Math.random() * 0.6;
}

function updateMiddle2Burst(s, dt) {
  if (s.dying || s.name !== 'middle2' || !s.bursting) return false;
  if (s.shooting > 0) s.shooting -= dt;
  else if (s.burstShotsLeft > 0) {
    s.burstGapTimer -= dt;
    if (s.burstGapTimer <= 0) {
      triggerEnemyShot(s);
      s.burstShotsLeft--;
      s.burstGapTimer = 0.07 + Math.random() * 0.04;
    }
  } else {
    s.bursting = false;
    s.nextShotIn = 1.4 + Math.random() * 0.8;
  }
  return true;
}

function updateStandardEnemyState(s, dt) {
  if (s.dying) return;
  if (s.shooting > 0) s.shooting -= dt;
  else if (s.nextShotIn <= 0) {
    if (s.name === 'front1') {
      s.aiming = 0.35;
      s.nextShotIn = 1.2 + Math.random() * 0.7;
    } else if (s.name === 'middle2') {
      s.bursting = true;
      s.burstShotsLeft = 3 + ((Math.random() * 3) | 0);
      s.burstGapTimer = 0;
      triggerEnemyShot(s);
      s.burstShotsLeft--;
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
  tickSoldierSpawnTimer('small', dt, 6, 4);
  tickSoldierSpawnTimer('medium', dt, 7, 5);
  tickSoldierSpawnTimer('large', dt, 8, 6);

  state.soldiers.forEach(s => {
    updateDyingSoldier(s, dt);
    s.nextShotIn -= dt;

    const currentAnimRow = getAnimRow(s);
    if (s.usesSheet) {
      const rowLimit = getRowFrameCount(s, currentAnimRow);
      if (s.frame >= rowLimit) s.frame = 0;
    }

    updateFar2Roll(s, dt);
    if (!updateMiddle2Burst(s, dt)) updateStandardEnemyState(s, dt);
    updateSoldierAnimation(s, dt);
  });

  state.soldiers = state.soldiers.filter(s => !s.dead && (s.dir === -1 ? (s.x + s.w > -40) : (s.x < state.W + 40)));
}

function spawnFlier() {
  const side = (Math.random() * 3) | 0;
  const r = 60;
  const speed = 180 + Math.random() * 120;
  let x, y, vx, vy;
  const startY = Math.random() * state.H * 0.35 + 10;
  if (side === 0) { x = -40; y = startY; vx = speed; vy = 40 - 80 * Math.random(); }
  else if (side === 1) { x = state.W + 40; y = startY; vx = -speed; vy = 40 - 80 * Math.random(); }
  else { x = Math.random() * state.W; y = -40; vx = 80 - 160 * Math.random(); vy = speed; }
  state.fliers.push({ x, y, vx, vy, r, hp: 5, turnIn: 3.0 + Math.random() * 3.0, shoot: 0, dead: false });
}

export function updateFliers(dt) {
  state.flyingTimer -= dt;
  if (state.flyingTimer <= 0) {
    if (state.fliers.length === 0) {
      spawnFlier();
      state.flyingTimer = 6 + Math.random() * 6;
    } else {
      state.flyingTimer = 1.5;
    }
  }
  state.fliers.forEach(f => {
    if (f.dead) return;
    f.turnIn -= dt;
    if (f.turnIn <= 0) {
      const tx = state.cross.x || state.W / 2;
      const maxTY = state.H * 0.3;
      const ty = Math.min(state.cross.y || state.H / 3, maxTY);
      const dx = tx - f.x, dy = ty - f.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const sp = Math.hypot(f.vx, f.vy);
      f.vx = (dx / len) * sp;
      f.vy = (dy / len) * sp;
      f.turnIn = 3.0 + Math.random() * 3.0;
      f.shoot = 0.3;
    }
    if (f.shoot > 0) {
      f.shoot -= dt;
      if (f.shoot <= 0) {
        state.effects.push({ type: 'flash', x: f.x + Math.sign(f.vx) * f.r, y: f.y, t: 0, dur: 0.12 });
        damagePlayer(1);
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const yMax = state.H * 0.33;
    if (f.y > yMax) { f.y = yMax; if (f.vy > 0) f.vy = -Math.abs(f.vy) * 0.6; }
  });
  state.fliers = state.fliers.filter(f => !f.dead && f.x > -80 && f.x < state.W + 80 && f.y > -80 && f.y < state.H + 80);
}

export function resetSpawnTimers() {
  const scale = state.spawnScale || 1;
  state.soldierTimers.small = (6 + Math.random() * 4) * scale;
  state.soldierTimers.medium = (7 + Math.random() * 5) * scale;
  state.soldierTimers.large = (8 + Math.random() * 6) * scale;
  state.flyingTimer = 6 + Math.random() * 6;
}

export function configureLevel(lvl) {
  const cfg = LEVEL_CONFIG[lvl] || LEVEL_CONFIG[1];
  state.enemiesLeft = cfg.enemies;
  state.spawnScale = cfg.spawnScale;
  state.health = state.maxHealth;
  state.soldiers.length = 0;
  state.fliers.length = 0;
  state.effects.length = 0;
  if (state.bands[0] && state.bands[0].objects) state.bands[0].objects.length = 0;
  resetSpawnTimers();
  setHud();
}

export { MAX_LEVEL };
