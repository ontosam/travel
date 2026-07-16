// Regenerate the app icons from the real US silhouette (js/us-geo.js).
// Run:  cd tools && npm install && npm run build
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { US_OUTLINE } from "../js/us-geo.js";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const PAPER = "#f7f0dd", GREEN = "#3f8f63", DEEP = "#2f6f4f";

// Fit the 975x610 map into a square tile with `pad` px of padding.
function mapGroup(size, pad) {
  const scale = (size - pad * 2) / 975;
  const ty = (size - 610 * scale) / 2;
  return `<g transform="translate(${pad.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">` +
    `<path d="${US_OUTLINE}" fill="${GREEN}" stroke="${DEEP}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`;

const badge = svg(`<rect x="8" y="8" width="496" height="496" rx="112" fill="${PAPER}" stroke="${DEEP}" stroke-width="10"/>${mapGroup(512, 96)}`);
const square = svg(`<rect width="512" height="512" fill="${PAPER}"/>${mapGroup(512, 74)}`);
const maskable = svg(`<rect width="512" height="512" fill="${PAPER}"/>${mapGroup(512, 128)}`);

writeFileSync(here("../icons/icon.svg"), badge + "\n");

const png = (svgStr, size, out) =>
  sharp(Buffer.from(svgStr), { density: 384 }).resize(size, size).png().toFile(here(out));

await png(square, 512, "../icons/icon-512.png");
await png(square, 192, "../icons/icon-192.png");
await png(square, 180, "../icons/apple-touch-icon.png");
await png(maskable, 512, "../icons/icon-maskable-512.png");
console.log("Wrote icons/ (icon.svg, icon-192/512, apple-touch-icon, maskable-512)");
