#!/usr/bin/env node
/**
 * Export the first attack-animation frame from each dragon spritesheet layer
 * as separate transparent PNGs for Photoshop.
 *
 * Sheet layout (wandbody): 7×6 cells of 100×100 → attack is row 3, frame 0.
 *
 * Usage:
 *   node scripts/export-attack-frame-layers.mjs
 *   node scripts/export-attack-frame-layers.mjs --size 400
 *
 * Output:
 *   assets/gotchis/layers/quickswap-dragon-attack-f0/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = path.join(ROOT, "tools", "aavegotchi-game-sprites");
const TOOL_MODULES = path.join(TOOLS, "node_modules");
const TRAITS = path.join(TOOLS, "Trait Files", "Sprites");

const CELL = 100;
const ATTACK_ROW = 3;
const ATTACK_FRAME = 0;
const LEFT = ATTACK_FRAME * CELL;
const TOP = ATTACK_ROW * CELL;

const args = process.argv.slice(2);
const sizeIdx = args.indexOf("--size");
const SIZE = sizeIdx >= 0 ? Number(args[sizeIdx + 1]) || 100 : Number(process.env.GOTCHI_LAYER_SIZE || 100);

const { default: sharp } = await import(
  pathToFileURL(path.join(TOOL_MODULES, "sharp", "lib", "index.js")).href
);

/** Dragon layers in draw order (bottom → top), matching generator stack. */
const LAYERS = [
  { name: "01-base-body", file: path.join(TRAITS, "wandbody", "Base Body", "amWMATIC.png") },
  { name: "02-eye-shape", file: path.join(TRAITS, "wandbody", "common", "amWMATIC", "uncommon_low_3.png") },
  { name: "03-body-dragon-wings", file: path.join(TRAITS, "wandbody", "Wearable (Body)", "Dragon Wings.png") },
  { name: "04-head-dragon-horns", file: path.join(TRAITS, "wandbody", "Wearable (Head)", "Dragon Horns.png") },
  { name: "05-hands-l-fireball", file: path.join(TRAITS, "wandbody", "Wearable (Hands) L", "Fireball.png") },
  { name: "06-hands-r-fireball", file: path.join(TRAITS, "wandbody", "Wearable (Hands) R", "Fireball.png") },
];

const outDir = path.join(ROOT, "assets", "gotchis", "layers", "quickswap-dragon-attack-f0");
fs.mkdirSync(outDir, { recursive: true });

async function cropFrame(srcPath) {
  return sharp(srcPath)
    .extract({ left: LEFT, top: TOP, width: CELL, height: CELL })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function resizeIfNeeded(buf) {
  if (SIZE === CELL) return buf;
  return sharp(buf)
    .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
}

const composites = [];
let i = 0;
for (const layer of LAYERS) {
  if (!fs.existsSync(layer.file)) {
    console.error(`Missing: ${layer.file}`);
    process.exit(1);
  }
  const frame = await cropFrame(layer.file);
  const out = await resizeIfNeeded(frame);
  const dest = path.join(outDir, `${layer.name}.png`);
  fs.writeFileSync(dest, out);
  console.log(`Wrote ${path.relative(ROOT, dest)} (${SIZE}×${SIZE})`);
  composites.push({ input: frame, blend: "over" });
  i++;
}

// Full composite of attack frame 0 (native 100×100, then scaled)
const compositeBuf = await sharp({
  create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .png()
  .toBuffer();

const fullOut = await resizeIfNeeded(compositeBuf);
const fullPath = path.join(outDir, "00-full.png");
fs.writeFileSync(fullPath, fullOut);
console.log(`Wrote ${path.relative(ROOT, fullPath)} (${SIZE}×${SIZE})`);

// Also crop from the final game sheet for reference
const sheetPath = path.join(ROOT, "assets", "gotchis", "quickswap-dragon.png");
if (fs.existsSync(sheetPath)) {
  const sheetFrame = await resizeIfNeeded(await cropFrame(sheetPath));
  const refPath = path.join(outDir, "00-full-from-sheet.png");
  fs.writeFileSync(refPath, sheetFrame);
  console.log(`Wrote ${path.relative(ROOT, refPath)} (${SIZE}×${SIZE})`);
}

console.log(`\nDone → ${path.relative(ROOT, outDir)}`);
