#!/usr/bin/env node
/**
 * Split a gotchi front SVG into separate transparent PNG layers for Photoshop.
 *
 * Usage:
 *   node scripts/export-svg-layers.mjs assets/gotchis/quickswap-dragon-front.svg
 *   node scripts/export-svg-layers.mjs assets/gotchis/desert-basic-front.svg --size 512
 *
 * Output:
 *   assets/gotchis/layers/<name>/00-full.png
 *   assets/gotchis/layers/<name>/01-body.png
 *   ...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_MODULES = path.join(ROOT, "tools", "aavegotchi-game-sprites", "node_modules");

const args = process.argv.slice(2);
const sizeIdx = args.indexOf("--size");
const SIZE = sizeIdx >= 0 ? Number(args[sizeIdx + 1]) || 256 : Number(process.env.GOTCHI_LAYER_SIZE || 256);
const inputArg = args.find((a, i) => !a.startsWith("--") && (sizeIdx < 0 || i !== sizeIdx + 1));

if (!inputArg) {
  console.error("Usage: node scripts/export-svg-layers.mjs <front.svg> [--size 256]");
  process.exit(1);
}

const inputPath = path.resolve(ROOT, inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const { default: sharp } = await import(
  pathToFileURL(path.join(TOOL_MODULES, "sharp", "lib", "index.js")).href
);

const svgText = fs.readFileSync(inputPath, "utf8");
const baseName = path.basename(inputPath, path.extname(inputPath));
const outDir = path.join(ROOT, "assets", "gotchis", "layers", baseName);
fs.mkdirSync(outDir, { recursive: true });

function extractViewBox(svg) {
  const m = svg.match(/viewBox="([^"]+)"/);
  return m ? m[1] : "0 0 64 64";
}

function extractStyle(svg) {
  const m = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : "";
}

/** Find matching closing tag for an element starting at `start` (<g ...> or <path ...>). */
function sliceElement(svg, start) {
  const openMatch = svg.slice(start).match(/^<(g|path|svg)\b/i);
  if (!openMatch) return null;
  const tag = openMatch[1].toLowerCase();

  // Self-closing path/svg
  const selfClose = svg.slice(start).match(/^<[^>]*\/>/);
  if (selfClose && tag !== "g") {
    return { end: start + selfClose[0].length, html: selfClose[0] };
  }

  if (tag === "path" || (tag === "svg" && /^<[^>]*\/>/.test(svg.slice(start)))) {
    const close = svg.indexOf(">", start);
    if (close < 0) return null;
    // non-self-closing path is unusual; treat through >
    const chunk = svg.slice(start, close + 1);
    if (chunk.endsWith("/>")) return { end: close + 1, html: chunk };
    const endTag = `</${tag}>`;
    const end = svg.indexOf(endTag, close);
    if (end < 0) return null;
    return { end: end + endTag.length, html: svg.slice(start, end + endTag.length) };
  }

  // Balanced <g>...</g> (and nested <svg>...</svg> inside)
  let i = start;
  let depth = 0;
  const re = /<\/?g\b[^>]*>/gi;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(svg))) {
    const token = m[0];
    if (token.startsWith("</")) depth -= 1;
    else if (!token.endsWith("/>")) depth += 1;
    if (depth === 0) {
      const end = m.index + token.length;
      return { end, html: svg.slice(start, end) };
    }
    i = re.lastIndex;
  }
  return null;
}

function classSlug(className) {
  return className
    .replace(/gotchi-/g, "")
    .replace(/wearable-/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .toLowerCase() || "layer";
}

const viewBox = extractViewBox(svgText);
const style = extractStyle(svgText);

// Walk top-level content after <style>...</style> (or after opening svg tag)
const styleEnd = svgText.search(/<\/style>/i);
let cursor = styleEnd >= 0 ? styleEnd + "</style>".length : svgText.indexOf(">") + 1;
const endSvg = svgText.lastIndexOf("</svg>");
const layers = [];

while (cursor < endSvg) {
  const next = svgText.slice(cursor).search(/<(g|path)\b/i);
  if (next < 0) break;
  const start = cursor + next;
  const sliced = sliceElement(svgText, start);
  if (!sliced) break;

  const html = sliced.html;
  const classMatch = html.match(/\bclass="([^"]+)"/);
  const className = classMatch ? classMatch[1] : "unnamed";

  // Skip tiny nested-looking fragments that aren't top-level useful layers:
  // keep top-level gotchi-* and wearable groups / cheek path
  const isTop =
    /^(gotchi-body|gotchi-cheek|gotchi-primary-mouth|gotchi-collateral|gotchi-eyeColor|gotchi-handsDownClosed|gotchi-handsDownOpen|gotchi-handsUp|gotchi-wearable\b)/.test(
      className
    ) || className === "gotchi-cheek";

  if (isTop || (html.startsWith("<path") && className.includes("cheek"))) {
    layers.push({ className, html });
  }

  cursor = sliced.end;
}

function wrapLayer(innerHtml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<style>${style}</style>
${innerHtml}
</svg>`;
}

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { kernel: "nearest", fit: "fill" })
    .png()
    .toFile(outPath);
}

// Full composite
const fullOut = path.join(outDir, "00-full.png");
await renderPng(svgText, fullOut);
console.log(`Wrote ${path.relative(ROOT, fullOut)}`);

let index = 1;
const manifest = [
  { file: "00-full.png", className: "(composite)", note: "All layers combined" }
];

for (const layer of layers) {
  const slug = classSlug(layer.className);
  const file = `${String(index).padStart(2, "0")}-${slug}.png`;
  const outPath = path.join(outDir, file);
  await renderPng(wrapLayer(layer.html), outPath);
  console.log(`Wrote ${path.relative(ROOT, outPath)}  [${layer.className}]`);
  manifest.push({ file, className: layer.className });
  index += 1;
}

// Also write a stackable "visible hands" convenience set:
// body + features + head/body wearables + preferred hand pose + hand wearables
const preferredHands =
  layers.find((l) => l.className.includes("handsDownOpen")) ||
  layers.find((l) => l.className.includes("handsDownClosed")) ||
  null;

const coreParts = layers.filter((l) =>
  /gotchi-body|gotchi-cheek|gotchi-primary-mouth|gotchi-collateral|gotchi-eyeColor|wearable-head|wearable-body|wearable-hand/.test(
    l.className
  )
);
if (preferredHands && !coreParts.includes(preferredHands)) {
  coreParts.push(preferredHands);
}

const stackSvg = wrapLayer(coreParts.map((l) => l.html).join("\n"));
const stackOut = path.join(outDir, "99-photoshop-stack-preview.png");
await renderPng(stackSvg, stackOut);
console.log(`Wrote ${path.relative(ROOT, stackOut)}`);

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(
    {
      source: path.relative(ROOT, inputPath),
      size: SIZE,
      viewBox,
      layers: manifest,
      note: "Import PNGs into Photoshop as layers (same canvas size). Hand pose groups are alternatives — usually keep only one of handsDownClosed / handsDownOpen / handsUp."
    },
    null,
    2
  )
);

console.log(`\nDone. Folder: ${path.relative(ROOT, outDir)}`);
console.log("Tip: In Photoshop, File → Scripts → Load Files into Stack, or drag PNGs onto one document.");
