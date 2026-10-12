import { SPEEDS } from './config.js?v=sfx24';

export const canvas = document.getElementById('game');
export const g = canvas.getContext('2d');
export const menu = document.getElementById('menu');
export const levelmap = document.getElementById('levelmap');
export const startBtn = document.getElementById('startBtn');
export const fade = document.getElementById('fade');
export const hud = document.getElementById('enemyHud');
export const missionTitle = document.getElementById('missionTitle');

export const audio = { ctx: null };

export const state = {
  phase: 'menu',
  currentLevel: 1,
  W: 0,
  H: 0,
  last: 0,
  sky: { y: 0, h: 0, off: 0, speed: 18, image: null },
  city: { y: 0, h: 0, off: 0, x: null, speed: 18, image: null, tileW: 0 },
  bands: [
    { y: 0, h: 0, off: 0, speed: SPEEDS[0], pattern: null, name: 'Band 0', objects: [], spawnIn: 420 },
    { y: 0, h: 0, off: 0, speed: SPEEDS[1], pattern: null, name: 'Band 1', objects: [], spawnIn: 420 },
    { y: 0, h: 0, off: 0, speed: SPEEDS[2], pattern: null, name: 'Band 2', objects: [], spawnIn: 420 }
  ],
  soldiers: [],
  soldierTimers: { small: 3, medium: 3.5, large: 4 },
  soldierSprites: null,
  fliers: [],
  flyingTimer: 3,
  cross: { visible: false, x: 0, y: 0 },
  effects: [],
  enemiesLeft: 20,
  spawnScale: 1,
  rafId: null,
  showLabels: false,
  showNames: true,
  showBoundingBoxes: false,
  showHitboxes: false,
  showPropHitboxes: false,
  showLanes: false,
  maxHealth: 10,
  health: 10,
  magSize: 20,
  ammo: 20,
  jammed: false,
  reloadDir: 0
};
