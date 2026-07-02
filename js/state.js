import { SPEEDS } from './config.js';

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
  bands: [
    { y: 0, h: 0, off: 0, speed: SPEEDS[0], pattern: null, name: 'Band 0', objects: [], spawnIn: 200 },
    { y: 0, h: 0, off: 0, speed: SPEEDS[1], pattern: null, name: 'Band 1' },
    { y: 0, h: 0, off: 0, speed: SPEEDS[2], pattern: null, name: 'Band 2' }
  ],
  soldiers: [],
  soldierTimers: { small: 6, medium: 7, large: 8 },
  soldierSprites: null,
  fliers: [],
  flyingTimer: 6,
  cross: { visible: false, x: 0, y: 0 },
  effects: [],
  enemiesLeft: 10,
  spawnScale: 1,
  rafId: null,
  showLabels: true,
  showBaselines: true,
  showNames: true,
  showHitboxes: false,
  maxHealth: 10,
  health: 10
};
