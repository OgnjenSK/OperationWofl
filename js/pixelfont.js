// Pixel Combat by Pixel Sagas (assets/fonts/PixelCombat-License.txt: free for personal use,
// commercial use needs a paid licence). One font pixel = 1/10.24 em; caps are 7x7 on an 8px advance.
// Strings are rasterised once at native size (1 canvas px per font pixel) as white masks,
// tinted at draw time, and scaled up with nearest-neighbour so they stay perfectly sharp.

const FAMILY = 'PixelCombat';
const NATIVE_SIZE = 10.24;
const CAP_H = 7;
const DESCENT = 2;
const masks = new Map();
const outlines = new Map();
const scratch = document.createElement('canvas');
const sc = scratch.getContext('2d');
let ready = false;

const face = new FontFace(FAMILY, 'url(assets/fonts/PixelCombat.otf)');
face.load().then(f => {
  document.fonts.add(f);
  masks.clear();
  outlines.clear();
  ready = true;
});

function remember(map, key, cv) {
  if (map.size > 200) map.clear();
  map.set(key, cv);
  return cv;
}

function textMask(text) {
  const hit = masks.get(text);
  if (hit) return hit;
  const font = NATIVE_SIZE + 'px ' + FAMILY;
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d');
  c.font = font;
  cv.width = Math.max(1, Math.ceil(c.measureText(text).width));
  cv.height = CAP_H + DESCENT;
  c.font = font;
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#fff';
  c.fillText(text, 0, CAP_H);
  const img = c.getImageData(0, 0, cv.width, cv.height);
  const px = img.data;
  for (let i = 3; i < px.length; i += 4) px[i] = px[i] >= 128 ? 255 : 0;
  c.putImageData(img, 0, 0);
  return remember(masks, text, cv);
}

// The mask grown by one font pixel in every direction (offset by -1,-1).
function outlineMask(text) {
  const hit = outlines.get(text);
  if (hit) return hit;
  const m = textMask(text);
  const cv = document.createElement('canvas');
  cv.width = m.width + 2;
  cv.height = m.height + 2;
  const c = cv.getContext('2d');
  for (let dy = 0; dy <= 2; dy++) for (let dx = 0; dx <= 2; dx++) c.drawImage(m, dx, dy);
  return remember(outlines, text, cv);
}

function blitTinted(g, mask, color, x, y, scale, alpha) {
  scratch.width = mask.width;
  scratch.height = mask.height;
  sc.drawImage(mask, 0, 0);
  sc.globalCompositeOperation = 'source-in';
  sc.fillStyle = color;
  sc.fillRect(0, 0, mask.width, mask.height);
  sc.globalCompositeOperation = 'source-over';
  g.globalAlpha = alpha;
  g.drawImage(scratch, x, y, mask.width * scale, mask.height * scale);
}

export function measurePixelText(text, scale = 2) {
  return ready && text ? textMask(text).width * scale : 0;
}

/**
 * Draws Pixel Combat text. `scale` = screen px per font pixel (use whole numbers).
 * `align` is left or center; `baseline` places y at the top, middle or bottom of the capitals.
 * `outline` (a colour) adds a one-font-pixel border drawn at `outlineAlpha`.
 */
export function drawPixelText(g, text, x, y, {
  scale = 2, color = '#ffffff', align = 'left', baseline = 'top', outline = null, outlineAlpha = 1
} = {}) {
  if (!ready || !text) return;
  const mask = textMask(text);
  const capH = CAP_H * scale;
  if (align === 'center') x -= (mask.width * scale) / 2;
  if (baseline === 'middle') y -= capH / 2;
  else if (baseline === 'bottom') y -= capH;
  x = Math.round(x);
  y = Math.round(y);
  g.save();
  g.imageSmoothingEnabled = false;
  if (outline) blitTinted(g, outlineMask(text), outline, x - scale, y - scale, scale, outlineAlpha);
  blitTinted(g, mask, color, x, y, scale, 1);
  g.restore();
}
