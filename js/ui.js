import { state, hud, fade, menu, levelmap, missionTitle } from './state.js';

export function setHud() {
  hud.textContent = 'ENEMIES: ' + state.enemiesLeft;
}

export function damagePlayer(amount) {
  if (state.health > 0) state.health = Math.max(0, state.health - amount);
}

export function setFade(on) {
  if (on) {
    fade.style.pointerEvents = 'auto';
    fade.style.opacity = '1';
  } else {
    fade.style.opacity = '0';
    setTimeout(() => { fade.style.pointerEvents = 'none'; }, 600);
  }
}

export function updateMissionTitle() {
  missionTitle.textContent = 'Start Mission ' + state.currentLevel;
}

export function positionLevelArrows() {
  const wrap = document.getElementById('levelWrap');
  if (!wrap) return;
  const cells = [...wrap.getElementsByClassName('cell')];
  if (cells.length < 6) return;
  const rect = wrap.getBoundingClientRect();
  const R = cells.map(c => {
    const r = c.getBoundingClientRect();
    return {
      left: r.left - rect.left, top: r.top - rect.top,
      right: r.right - rect.left, bottom: r.bottom - rect.top,
      cx: (r.left + r.right) / 2 - rect.left,
      cy: (r.top + r.bottom) / 2 - rect.top
    };
  });
  const cell = { 5: R[0], 4: R[1], 1: R[2], 6: R[3], 3: R[4], 2: R[5] };
  const c1 = cell[1], c2 = cell[2], c3 = cell[3], c4 = cell[4], c5 = cell[5], c6 = cell[6];
  const svg = document.getElementById('levelArrows');
  svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
  const setArrow = (id, x1, y1, x2, y2) => {
    const L = document.getElementById(id);
    if (L) { L.setAttribute('x1', x1); L.setAttribute('y1', y1); L.setAttribute('x2', x2); L.setAttribute('y2', y2); }
  };
  const w = (c1.right - c1.left), h = (c1.bottom - c1.top), mH = 0.12 * w, mV = 0.12 * h;
  setArrow('entry', c1.right + w * 0.18, c1.cy, c1.right - mH, c1.cy);
  const x12 = (c1.cx + c2.cx) / 2;
  setArrow('a12', x12, c1.bottom - mV, x12, c2.top + mV);
  const y23 = (c2.cy + c3.cy) / 2;
  setArrow('a23', c2.left + mH, y23, c3.right - mH, y23);
  const x34 = (c3.cx + c4.cx) / 2;
  setArrow('a34', x34, c3.top + mV, x34, c4.bottom - mV);
  const y45 = (c4.cy + c5.cy) / 2;
  setArrow('a45', c4.left + mH, y45, c5.right - mH, y45);
  const x56 = (c5.cx + c6.cx) / 2;
  setArrow('a56', x56, c5.bottom - mV, x56, c6.top + mV);
}

export function blinkForLevel(level) {
  ['entry', 'a12', 'a23', 'a34', 'a45', 'a56'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('blink-arrow');
  });
  const id = (level <= 1) ? 'entry' : (level === 2 ? 'a12' : (level === 3 ? 'a23' : (level === 4 ? 'a34' : (level === 5 ? 'a45' : 'a56'))));
  const el = document.getElementById(id);
  if (el) el.classList.add('blink-arrow');
}

export { menu, levelmap };
