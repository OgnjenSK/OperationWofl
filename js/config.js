export const DPR = window.devicePixelRatio || 1;
export const SPEEDS = [44, 96, 190];
export const BAND_FRAC = [0.18, 0.25, 0.32];
export const SIZE_COLOR = {
  small: ['#19C3FF', '#0055FF'],
  medium: ['#FF3E9E', '#B00074'],
  large: ['#FFD400', '#D27C00']
};
export const TYPE_NAMES = {
  small: ['far1', 'far2'],
  medium: ['middle1', 'middle2'],
  large: ['front1', 'front2']
};
export const TYPE_SPEEDS = {
  far1: 130, far2: 150,
  middle1: 200, middle2: 500,
  front1: 270, front2: 300
};
export const HOUSE_COLORS = ['#b6c2d9', '#d4dee8', '#9fb7d1', '#c1c8da'];
export const SOLDIER_FRAME_MS = { small: 140, medium: 110, large: 90 };
export const GOTCHI_TEST_URL = 'https://gotchi.lol/api/gotchi-sprites/2729';
export const GOTCHI_ALT_URL = 'https://gotchi.lol/api/gotchi-sprites/2731';
export const DESERT_FAR_URL = 'assets/backgrounds/desert/desertfar.png';
export const DESERT_MID_URL = 'assets/backgrounds/desert/desertmid.png';
export const DESERT_FRONT_URL = 'assets/backgrounds/desert/desertfront.png';
export const FAR1_SHEET_W = 100;
export const FAR1_SHEET_H = 100;
export const FAR1_FRAMES = 7;
export const FAR1_ROW_FRAME_COUNTS = [6, 7, 3, 6, 4, 4];
export const FAR1_WALK_ROW = 1;
export const FAR1_ATTACK_ROW = 3;
export const FAR1_HURT_ROW = 4;
export const FAR1_DEATH_ROW = 5;
export const FAR1_FRAME_MS = 180;
export const FAR1_WALK_FRAME_MS = 60;
export const FAR1_DRAW_SCALE = 1.4;
export const CROUCH_SCALE_Y = 0.7;
export const ENEMY_Y_SHIFT = 0.10;
export const MAX_LEVEL = 6;
export const LEVEL_CONFIG = {
  1: { enemies: 10, spawnScale: 1.0 },
  2: { enemies: 14, spawnScale: 0.9 },
  3: { enemies: 18, spawnScale: 0.8 },
  4: { enemies: 22, spawnScale: 0.7 },
  5: { enemies: 26, spawnScale: 0.6 },
  6: { enemies: 30, spawnScale: 0.55 }
};
