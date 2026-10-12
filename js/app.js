import { canvas, state, startBtn, menu, levelmap } from './state.js?v=sfx29';
import { buildSoldierSprites } from './sprites.js?v=sfx26';
import {
  initBackgroundImages, resize, updateBands,
  spawnHouses, updateHouses
} from './background.js?v=sfx111';
import { updateSoldiers, updateFliers, handleShoot, handleReload, handleReloadWheel, configureLevel, setOnLevelComplete, MAX_LEVEL } from './enemies.js?v=sfx96';
import { startDesertMusic, unlockAudio } from './audio.js?v=sfx51';
import { render, updateEffects } from './render.js?v=sfx82';
import {
  setHud, setFade, updateMissionTitle,
  positionLevelArrows, blinkForLevel
} from './ui.js?v=sfx32';

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

let mapStartTimer = null;
let mapShowTimer = null;

function clearMapTimers() {
  if (mapShowTimer != null) { clearTimeout(mapShowTimer); mapShowTimer = null; }
  if (mapStartTimer != null) { clearTimeout(mapStartTimer); mapStartTimer = null; }
}

function showLevelMap(thenStart) {
  state.phase = 'map';
  stopLoop();
  clearMapTimers();
  mapShowTimer = setTimeout(() => {
    mapShowTimer = null;
    menu.style.display = 'none';
    // Show map immediately — no opacity fade (avoids flashing the bright canvas).
    levelmap.style.transition = 'none';
    levelmap.style.display = 'flex';
    levelmap.style.opacity = '1';
    void levelmap.offsetWidth;
    levelmap.style.transition = '';
    updateMissionTitle();
    positionLevelArrows();
    blinkForLevel(state.currentLevel);
    if (thenStart) {
      mapStartTimer = setTimeout(() => {
        mapStartTimer = null;
        startGame();
      }, 3200);
    }
  }, 0);
}

function goToLevelMap() {
  // Skip map intro — go straight into the current level.
  state.phase = 'play';
  stopLoop();
  clearMapTimers();
  setFade(true);
  setTimeout(() => {
    menu.style.display = 'none';
    levelmap.style.display = 'none';
    levelmap.style.opacity = '0';
    state.last = 0;
    configureLevel(state.currentLevel);
    updateMissionTitle();
    if (state.currentLevel === 1) startDesertMusic();
    startLoop();
    setFade(false);
  }, 300);
}

function startGame() {
  clearMapTimers();
  setFade(true);
  setTimeout(() => {
    levelmap.style.opacity = '0';
    levelmap.style.display = 'none';
    state.phase = 'play';
    state.last = 0;
    configureLevel(state.currentLevel);
    updateMissionTitle();
    if (state.currentLevel === 1) startDesertMusic();
    startLoop();
    setFade(false);
  }, 300);
}

function endLevel() {
  state.currentLevel = Math.min(MAX_LEVEL, state.currentLevel + 1);
  configureLevel(state.currentLevel);
  showLevelMap(true);
}

function init() {
  setOnLevelComplete(endLevel);

  startBtn.onclick = () => {
    unlockAudio();
    goToLevelMap();
  };
  addEventListener('pointerdown', unlockAudio, { once: true });
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
    unlockAudio();
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    state.cross.x = x;
    state.cross.y = y;
    if (e.button === 2) handleReload();
    else if (e.button === 0) handleShoot(x, y);
  };
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    handleReloadWheel(e.deltaY);
  }, { passive: false });
  canvas.oncontextmenu = e => e.preventDefault();

  const debugToggles = {
    l: 'showLabels',
    b: 'showBoundingBoxes',
    n: 'showNames',
    h: 'showHitboxes',
    o: 'showPropHitboxes',
    e: 'showLanes'
  };
  const debugButtons = document.querySelectorAll('#debugBar [data-toggle]');
  const syncDebugButtons = () => {
    debugButtons.forEach(btn => btn.classList.toggle('on', !!state[btn.dataset.toggle]));
  };
  debugButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      state[key] = !state[key];
      syncDebugButtons();
      btn.blur();
    });
  });
  addEventListener('keydown', e => {
    const key = debugToggles[e.key.toLowerCase()];
    if (!key) return;
    state[key] = !state[key];
    syncDebugButtons();
  });
  syncDebugButtons();

  state.soldierSprites = buildSoldierSprites();
  initBackgroundImages(render);
  resize();
  setHud();
  render();

  // Skip start/level menus — jump straight into play.
  goToLevelMap();
}

init();
