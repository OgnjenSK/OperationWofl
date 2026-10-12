export const DPR = window.devicePixelRatio || 1;
export const SPEEDS = [44, 96, 155];
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
// Quickswap Dragon — flying enemy only
export const GOTCHI_TEST_URL = 'assets/gotchis/quickswap-dragon.png';
// Desert basic Gotchi — all ground lane soldiers
export const GOTCHI_ALT_URL = 'assets/gotchis/desert-basic.png';
export const DESERT_SKY_URL = 'assets/backgrounds/desert/desertsky.png';
export const DESERT_FAR_URL = 'assets/backgrounds/desert/desertfar.png';
export const DESERT_CITY_URL = 'assets/backgrounds/desert/desertcitybckg.png';
export const CITY_DRAW_SCALE = 0.5;
export const DESERT_MID_URL = 'assets/backgrounds/desert/desertmid.png';
export const DESERT_FRONT_URL = 'assets/backgrounds/desert/desertfront.png';
export const DESERT_SHOOT_FRONT_URL = 'assets/backgrounds/desert/desertshootfront.png?v=5';
export const PALM_TREE_URL = 'assets/backgrounds/desert/palm_tree.png';
export const PALM_TREE_HIT_URL = 'assets/backgrounds/desert/palm_tree_hit.png';
export const PALM_HIT_FRAME_W = 1086;
export const PALM_HIT_FRAMES = 3;
export const PALM_HIT_FRAME_MS = 70;
export const PALM_HIT_LOOP_FROM = 1;
export const PALM_HIT_LOOP_TO = 2;
export const PALM_HIT_LOOPS = 2;
export const COCONUT_URL = 'assets/backgrounds/desert/coconut.png';
export const CACTUS_URL = 'assets/backgrounds/desert/cactus.png';
export const CACTUS_HAND_LEFT_URL = 'assets/backgrounds/desert/cactus hand left .png';
export const CACTUS_HAND_RIGHT_URL = 'assets/backgrounds/desert/cactus hand right .png';
export const CACTUS_HAND_CENTER_URL = 'assets/backgrounds/desert/cactus hand center.png';
export const CACTUS_HIT_URL = 'assets/backgrounds/desert/cactushitanim.png';
export const CACTUS_HIT_FRAME_W = 78;
export const CACTUS_HIT_FRAMES = 4;
export const CACTUS_HIT_FRAME_MS = 70;
export const CACTUS_HIT_LOOPS = 2;
/** Shots while intact before parts become destructible. */
export const CACTUS_INTACT_HITS = 3;
export const CACTUS_BURST_URL = 'assets/backgrounds/desert/cactus burst2.png?v=3';
export const CACTUS_BURST_FRAME_W = 542;
export const CACTUS_BURST_FRAME_H = 725;
export const CACTUS_BURST_FRAMES = 4;
export const CACTUS_BURST_FRAME_MS = 55;
export const PYRAMID_URL = 'assets/backgrounds/desert/pyramid.png';
export const PYRAMID2_URL = 'assets/backgrounds/desert/pyramid 2.png';
export const DESERT_MUSIC_URL = 'assets/backgrounds/desert/desertmusic.wav';
export const RADAR_URL = 'assets/backgrounds/desert/radar.png?v=4';
export const RADAR_FRAME_W = 440;
export const RADAR_FRAME_H = 655;
export const RADAR_FRAMES = 5;
export const RADAR_IDLE_FRAME = 1;
export const RADAR_HIT_FRAME_MS = 45;
export const RADAR_HIT_LOOPS = 2;
export const RADAR_SLOW_FRAME_MS = 170;
export const RADAR_SLOW_LOOPS = 1;
export const SAND_SPLASH_FRAME_W = 222;
export const SAND_SPLASH_FRAME_H = 527;
export const SAND_SPLASH_FRAMES = 8;
export const SAND_SPLASH_FRAME_MS = 55;
export const SAND_SPLASH_GROUND_Y = 524;
export const SAND_SPLASH_DRAW_SCALE = 0.62;
/** Far / mid / front — same unit scale as ground enemies. */
export const BAND_UNIT_SCALE = [2, 3, 6];
export const FAR1_SHEET_W = 100;
export const FAR1_SHEET_H = 100;
export const FAR1_FRAMES = 7;
export const FAR1_ROW_FRAME_COUNTS = [6, 7, 6, 6, 4, 4];
export const FAR1_IDLE_ROW = 0;   // 1st row
export const FAR1_WALK_ROW = 1;   // 2nd row
export const FAR1_STANCE_ROW = 2; // 3rd row — desert prepare(0–2) / reset(3–5)
export const FAR1_ATTACK_ROW = 3; // 4th row — desert attack (cut on frame 3 when last)
export const FAR1_HURT_ROW = 4;   // 5th row
export const FAR1_DEATH_ROW = 5;  // 6th row
export const FAR1_FRAME_MS = 60;
export const FAR1_WALK_FRAME_MS = 60;
// Desert basic attack is slower than dragon (still uses walk at 60).
export const DESERT_ATTACK_FRAME_MS = 90;
// Hit/death keeps a slower pace than attack/walk (60), but not the old 180.
export const FAR1_HURT_FRAME_MS = 90;
export const FAR1_DRAW_SCALE = 1.4;
export const CROUCH_SCALE_Y = 0.7;
export const AMMO_URL = 'assets/backgrounds/desert/ammo.png';
export const AMMO_ROWS = 3;
export const AMMO_PER_ROW = 5;
export const MAG_SIZE = AMMO_ROWS * AMMO_PER_ROW;
// Racks per level; reload moves to the next rack. When the last rack is empty,
// all racks refill after AMMO_REFILL_MS.
export const AMMO_MAGS = 2;
export const AMMO_REFILL_MS = 2000;
export const PLAYER_MAX_HEALTH = 30;
export const AMMO_DRAW_SCALE = 0.5;
export const JAM_CHANCE = 0.02;
export const ENEMY_Y_SHIFT = 0.10;
export const MAX_LEVEL = 6;
export const LEVEL_CONFIG = {
  1: { enemies: 20, spawnScale: 1.0 },
  2: { enemies: 28, spawnScale: 0.9 },
  3: { enemies: 36, spawnScale: 0.8 },
  4: { enemies: 44, spawnScale: 0.7 },
  5: { enemies: 52, spawnScale: 0.6 },
  6: { enemies: 60, spawnScale: 0.55 }
};
