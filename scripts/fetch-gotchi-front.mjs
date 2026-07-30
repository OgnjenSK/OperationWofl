#!/usr/bin/env node
/**
 * Fetch front-facing Aavegotchi SVGs from Base chain and save as local PNGs.
 * Usage: node scripts/fetch-gotchi-front.mjs 2729 2731
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_MODULES = path.join(ROOT, "tools", "aavegotchi-game-sprites", "node_modules");
const OUT_DIR = path.join(ROOT, "assets", "gotchis");
const DIAMOND = "0xA99c4B08201F2913Db8D28e71d020c4298F29dBF";
const RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const SIZE = Number(process.env.GOTCHI_FRONT_SIZE || 256);

const { ethers } = await import(pathToFileURL(path.join(TOOL_MODULES, "ethers", "lib.esm", "index.js")).href);
const { default: sharp } = await import(pathToFileURL(path.join(TOOL_MODULES, "sharp", "lib", "index.js")).href);

const ids = process.argv.slice(2).map((n) => Number(n)).filter((n) => Number.isFinite(n));
if (!ids.length) {
  console.error("Usage: node scripts/fetch-gotchi-front.mjs <id> [id...]");
  process.exit(1);
}

const abi = ["function getAavegotchiSvg(uint256 _tokenId) external view returns (string svg_)"];
const provider = new ethers.JsonRpcProvider(RPC);
const facet = new ethers.Contract(DIAMOND, abi, provider);

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const id of ids) {
  const svg = await facet.getAavegotchiSvg(id);
  const svgPath = path.join(OUT_DIR, `${id}-front.svg`);
  const pngPath = path.join(OUT_DIR, `${id}-front.png`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { kernel: "nearest" })
    .png()
    .toFile(pngPath);
  console.log(`Gotchi #${id}: ${pngPath}`);
}
