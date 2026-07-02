import { canvas, state, startBtn, menu, levelmap } from './state.js';
import { buildSoldierSprites } from './sprites.js';
import {
  initBackgroundImages, resize, updateBands,
  spawnHouses, updateHouses
} from './background.js';
import { updateSoldiers, updateFliers, handleShoot, configureLevel, setOnLevelComplete, MAX_LEVEL } from './enemies.js';
import { render, updateEffects } from './render.js';
import {
  setHud, setFade, updateMissionTitle,
  positionLevelArrows, blinkForLevel
} from './ui.js';

function startLoop() {
  if (state.rafId == null) state.rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (state.rafId != null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function update(dt) {
  updateBands(dt);
  if (state.phase === 'play') {
    updateHouses(dt);
    spawnHouses(dt);
    updateSoldiers(dt);
    updateFliers(dt);
  }
  updateEffects(dt);
}

function loop(t) {
  if (!state.last) state.last = t;
  const dt = Math.min(0.05, (t - state.last) / 1000);
  state.last = t;
  update(dt);
  render();
  state.rafId = requestAnimationFrame(loop);
}

function goToLevelMap() {
  state.phase = 'map';
  stopLoop();
  setFade(true);
  setTimeout(() => {
    menu.style.display = 'none';
    levelmap.style.display = 'flex';
    levelmap.style.opacity = '1';
    positionLevelArrows();
    blinkForLevel(state.currentLevel);
    setFade(false);
    setTimeout(startGame, 3200);
  }, 400);
}

function startGame() {
  setFade(true);
  setTimeout(() => {
    levelmap.style.opacity = '0';
    levelmap.style.display = 'none';
    state.phase = 'play';
    state.last = 0;
    configureLevel(state.currentLevel);
    updateMissionTitle();
    startLoop();
    setFade(false);
  }, 300);
}

function endLevel() {
  state.phase = 'map';
  stopLoop();
  setFade(true);
  setTimeout(() => {
    state.currentLevel = Math.min(MAX_LEVEL, state.currentLevel + 1);
    configureLevel(state.currentLevel);
    updateMissionTitle();
    levelmap.style.display = 'flex';
    levelmap.style.opacity = '1';
    positionLevelArrows();
    blinkForLevel(state.currentLevel);
    setFade(false);
    setTimeout(startGame, 3200);
  }, 600);
}

function init() {
  setOnLevelComplete(endLevel);

  startBtn.onclick = goToLevelMap;
  addEventListener('resize', resize);

  canvas.onmouseenter = () => {
    state.cross.visible = true;
    canvas.style.cursor = 'none';
    document.body.style.cursor = 'none';
  };
  canvas.onmouseleave = () => {
    state.cross.visible = false;
    canvas.style.cursor = '';
    document.body.style.cursor = '';
  };
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect();
    state.cross.x = e.clientX - r.left;
    state.cross.y = e.clientY - r.top;
  };
  canvas.onmousedown = e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    state.cross.x = x;
    state.cross.y = y;
    handleShoot(x, y);
  };
  canvas.oncontextmenu = e => e.preventDefault();

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'l') state.showLabels = !state.showLabels;
    else if (k === 'b') state.showBaselines = !state.showBaselines;
    else if (k === 'n') state.showNames = !state.showNames;
    else if (k === 'h') state.showHitboxes = !state.showHitboxes;
  });

  state.soldierSprites = buildSoldierSprites();
  initBackgroundImages(render);
  resize();
  setHud();
  render();
}

init();
