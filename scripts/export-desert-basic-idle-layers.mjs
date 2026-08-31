#!/usr/bin/env node
/**
 * Export desert-basic (gotchi #2731) side-view idle frame 0 as separate PNG layers.
 *
 * Source: Trait Files sprite sheets (700×600, 7×6 cells of 100×100).
 * Idle = row 0, frame 0.
 *
 * Usage:
 *   node scripts/export-desert-basic-idle-layers.mjs
 *   node scripts/export-desert-basic-idle-layers.mjs --size 400
 *
 * Output:
 *   assets/gotchis/layers/desert-basic-idle-f0/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = path.join(ROOT, "tools", "aavegotchi-game-sprites");
const TOOL_MODULES = path.join(TOOLS, "node_modules");
const TRAITS = path.join(TOOLS, "Trait Files", "Sprites");

const CELL = 100;
const IDLE_ROW = 0;
const IDLE_FRAME = 0;
const LEFT = IDLE_FRAME * CELL;
const TOP = IDLE_ROW * CELL;

const args = process.argv.slice(2);
const sizeIdx = args.indexOf("--size");
const SIZE = sizeIdx >= 0 ? Number(args[sizeIdx + 1]) || 100 : Number(process.env.GOTCHI_LAYER_SIZE || 100);

const { default: sharp } = await import(
  pathToFileURL(path.join(TOOL_MODULES, "sharp", "lib", "index.js")).href
);

// Gotchi #2731 (desert-basic): aWETH + common_3 eyes + rare_low eye color.
// Layer paths match aavegotchi-game-sprites resolution for this gotchi.
const LAYERS = [
  {
    name: "01-base-body",
    file: path.join(TRAITS, "punchbody", "Base Body", "aWETH.png"),
    className: "Base Body: aWETH",
  },
  {
    name: "02-eye-shape",
    file: path.join(TRAITS, "punchbody", "rare_low", "common_3.png"),
    className: "Eye Shape: common_3",
  },
  {
    name: "03-eye-color",
    file: path.join(TRAITS, "punchbody", "mythic_high_aWETH", "rare_low.png"),
    className: "Eye Color: rare_low",
  },
];

const outDir = path.join(ROOT, "assets", "gotchis", "layers", "desert-basic-idle-f0");
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
const manifest = [
  {
    file: "00-full.png",
    className: "(composite)",
    note: "Idle row 0 frame 0 — all layers combined",
  },
];

for (const layer of LAYERS) {
  if (!fs.existsSync(layer.file)) {
    console.error(`Missing: ${layer.file}`);
    process.exit(1);
  }
  const frame = await cropFrame(layer.file);
  const out = await resizeIfNeeded(frame);
  const file = `${layer.name}.png`;
  const dest = path.join(outDir, file);
  fs.writeFileSync(dest, out);
  console.log(`Wrote ${path.relative(ROOT, dest)} (${SIZE}×${SIZE})  [${layer.className}]`);
  composites.push({ input: frame, blend: "over" });
  manifest.push({
    file,
    className: layer.className,
    source: path.relative(ROOT, layer.file),
  });
}

const compositeBuf = await sharp({
  create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .png()
  .toBuffer();

fs.writeFileSync(path.join(outDir, "00-full.png"), await resizeIfNeeded(compositeBuf));
console.log(`Wrote ${path.relative(ROOT, path.join(outDir, "00-full.png"))} (${SIZE}×${SIZE})`);

const sheetPath = path.join(ROOT, "assets", "gotchis", "desert-basic.png");
if (fs.existsSync(sheetPath)) {
  const sheetFrame = await resizeIfNeeded(await cropFrame(sheetPath));
  fs.writeFileSync(path.join(outDir, "00-full-from-sheet.png"), sheetFrame);
  console.log(`Wrote ${path.relative(ROOT, path.join(outDir, "00-full-from-sheet.png"))}`);
  manifest.splice(1, 0, {
    file: "00-full-from-sheet.png",
    className: "(from final sheet)",
    note: "Cropped from assets/gotchis/desert-basic.png for reference",
  });
}

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(
    {
      gotchiId: 2731,
      name: "desert-basic",
      view: "side",
      animation: "idle",
      row: IDLE_ROW,
      frame: IDLE_FRAME,
      cell: CELL,
      size: SIZE,
      layers: manifest,
      note: "Side-view idle frame 0 from Trait Files spritesheets (not front SVG).",
    },
    null,
    2
  )
);

console.log(`\nDone → ${path.relative(ROOT, outDir)}`);
