// ---------------------------------------------------------------------------
// Sticker artwork
//
// Each state's "sticker" is a little postcard scene clipped to that state's
// real silhouette. The scenes are generated (flat-illustration style) and
// assigned a biome by region, so the set looks varied and cohesive without
// needing 50 external image files.
//
// To swap in FINAL art later: replace `stickerSVG(state)` / `mapSceneGroup(state)`
// so that instead of the generated scene they reference a real per-state image
// (e.g. <image href="art/AZ.png" clip-path="url(#...)"/>). Nothing else changes.
// ---------------------------------------------------------------------------
import { US_STATES } from "./us-geo.js";

// Region → scene type. Chosen to look plausible and varied (AZ red canyon,
// IA fields, FL coast, CO peaks, ...).
export const BIOME = {
  WA: "alpine", OR: "alpine", ID: "alpine", MT: "alpine", WY: "alpine", CO: "alpine",
  VT: "alpine", NH: "alpine", AK: "alpine",
  UT: "desert", NV: "desert", AZ: "desert", NM: "desert",
  CA: "coast", LA: "coast", MI: "coast", MS: "coast", AL: "coast", GA: "coast",
  FL: "coast", SC: "coast", NC: "coast", VA: "coast", MD: "coast", DE: "coast",
  NJ: "coast", CT: "coast", RI: "coast", MA: "coast", ME: "coast", HI: "coast",
  TX: "plains", OK: "plains", KS: "plains", NE: "plains", SD: "plains", ND: "plains",
  MN: "plains", IA: "plains", MO: "plains", IL: "plains", IN: "plains",
  AR: "forest", WI: "forest", OH: "forest", KY: "forest", TN: "forest",
  WV: "forest", PA: "forest", NY: "forest",
  DC: "city",
};

const PAL = {
  alpine: { sky: "#bfe3f2", sky2: "#e6f4fb", ground: "#6f9560", mtn: "#8391a2", mtnDark: "#5d6b7b", sun: "#fdf1c0" },
  desert: { sky: "#ffd8a6", sky2: "#ffe9cf", ground: "#d98f4f", mtn: "#c85f38", mtnDark: "#9e4828", cactus: "#4f7a4a", sun: "#ffcf72" },
  plains: { sky: "#c2e6f4", sky2: "#e9f6fb", ground: "#8bbf58", mtn: "#a6cd66", mtnDark: "#6e9e43", barn: "#b1512c", sun: "#fdf1c0" },
  coast: { sky: "#c1e6f4", sky2: "#eaf7fb", sea: "#4fb0c6", seaDark: "#2f8fa8", sand: "#ecdca6", sun: "#fdf1c0" },
  forest: { sky: "#cdeaf0", sky2: "#eef8f4", ground: "#3f7a4e", mtn: "#5c9a5f", mtnDark: "#356b40", tree: "#2f6f4f", trunk: "#6b4a2f", sun: "#fdf1c0" },
  city: { sky: "#cfe0f0", sky2: "#eef3fb", ground: "#5c6b7a", bld: "#93a2b1", bldDark: "#6d7c8b", win: "#fdf1c0", sun: "#fdf1c0" },
};

const f1 = (n) => (Math.round(n * 10) / 10).toString();
const rect = (x, y, w, h, fill) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}"/>`;
const poly = (pts, fill) => `<polygon points="${pts}" fill="${fill}"/>`;
const circ = (cx, cy, r, fill) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}"/>`;
const ell = (cx, cy, rx, ry, fill) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}"/>`;

function peaks(x, w, baseY, peakH, count) {
  const step = w / count;
  let pts = `${f1(x)},${f1(baseY)} `;
  for (let i = 0; i < count; i++) {
    const px = x + step * i + step / 2;
    pts += `${f1(px)},${f1(baseY - peakH)} ${f1(x + step * (i + 1))},${f1(baseY)} `;
  }
  pts += `${f1(x + w)},${f1(baseY + peakH)} ${f1(x)},${f1(baseY + peakH)}`;
  return pts;
}
function snowCaps(x, w, baseY, peakH, count) {
  const step = w / count;
  let s = "";
  for (let i = 0; i < count; i++) {
    const px = x + step * i + step / 2, apexY = baseY - peakH;
    const capH = peakH * 0.3, capW = step * 0.2;
    s += poly(`${f1(px)},${f1(apexY)} ${f1(px - capW)},${f1(apexY + capH)} ${f1(px + capW)},${f1(apexY + capH)}`, "#ffffff");
  }
  return s;
}
function tree(cx, baseY, th, P) {
  const tw = th * 0.55;
  return rect(cx - th * 0.06, baseY - th * 0.2, th * 0.12, th * 0.22, P.trunk) +
    poly(`${f1(cx)},${f1(baseY - th)} ${f1(cx - tw / 2)},${f1(baseY)} ${f1(cx + tw / 2)},${f1(baseY)}`, P.tree);
}

// Build the scene shapes for a biome inside bbox [x,y,w,h]. Shapes may overflow
// the bbox — they get cropped by the sticker viewBox and the state clip-path.
function scene(biome, [x, y, w, h]) {
  const P = PAL[biome] || PAL.plains;
  const hz = y + h * 0.6;
  const ox = x - w * 0.15, ow = w * 1.3; // draw wider than bbox so clip edges stay covered
  let s = rect(x - w, y - h, w * 3, h * 3, P.sky);           // sky (generous)
  s += rect(ox, y + h * 0.28, ow, h * 0.34, P.sky2 || P.sky); // haze near horizon
  const sun = circ(x + w * 0.24, y + h * 0.24, Math.min(w, h) * 0.13, P.sun);

  if (biome === "alpine") {
    s += sun;
    s += poly(peaks(ox, ow, hz, h * 0.5, 3), P.mtnDark);
    s += poly(peaks(ox, ow, hz, h * 0.36, 4), P.mtn);
    s += snowCaps(ox, ow, hz, h * 0.36, 4);
    s += rect(ox, hz, ow, h, P.ground);
  } else if (biome === "desert") {
    s += sun;
    s += rect(ox, hz, ow, h, P.ground);
    s += poly(`${f1(x + w * 0.08)},${f1(hz)} ${f1(x + w * 0.08)},${f1(hz - h * 0.26)} ${f1(x + w * 0.36)},${f1(hz - h * 0.26)} ${f1(x + w * 0.36)},${f1(hz)}`, P.mtnDark);
    s += poly(`${f1(x + w * 0.5)},${f1(hz)} ${f1(x + w * 0.5)},${f1(hz - h * 0.4)} ${f1(x + w * 0.9)},${f1(hz - h * 0.4)} ${f1(x + w * 0.9)},${f1(hz)}`, P.mtn);
    // saguaro
    const cx = x + w * 0.7, ch = h * 0.3, tw = ch * 0.16, base = y + h * 0.92;
    s += rect(cx - tw / 2, base - ch, tw, ch, P.cactus);
    s += rect(cx - tw / 2 - ch * 0.24, base - ch * 0.6, ch * 0.24, tw, P.cactus) + rect(cx - tw / 2 - ch * 0.24, base - ch * 0.82, tw, ch * 0.24, P.cactus);
    s += rect(cx + tw / 2, base - ch * 0.7, ch * 0.24, tw, P.cactus) + rect(cx + tw / 2 + ch * 0.24 - tw, base - ch * 0.9, tw, ch * 0.2, P.cactus);
  } else if (biome === "plains") {
    s += sun;
    s += rect(ox, hz, ow, h, P.ground);
    s += ell(x + w * 0.3, hz + h * 0.02, w * 0.5, h * 0.16, P.mtn);
    s += ell(x + w * 0.78, hz + h * 0.03, w * 0.45, h * 0.13, P.mtnDark);
    // barn + silo
    const bx = x + w * 0.5, by = hz - h * 0.02, bw = w * 0.14, bh = h * 0.15;
    s += rect(bx, by - bh, bw, bh, P.barn);
    s += poly(`${f1(bx)},${f1(by - bh)} ${f1(bx + bw / 2)},${f1(by - bh * 1.5)} ${f1(bx + bw)},${f1(by - bh)}`, P.barn);
    s += rect(bx + bw * 1.2, by - bh * 1.2, bw * 0.5, bh * 1.2, "#d9c9a0");
  } else if (biome === "coast") {
    const sea = y + h * 0.42, sand = y + h * 0.7;
    s = rect(x - w, y - h, w * 3, h * 3, P.sky);
    s += sun;
    s += rect(ox, sea, ow, sand - sea, P.sea);
    s += ell(x + w * 0.5, sand, w * 0.9, h * 0.05, P.seaDark);
    s += rect(ox, sand, ow, h, P.sand);
    s += ell(x + w * 0.35, sand + h * 0.02, w * 0.4, h * 0.03, "#ffffff");
  } else if (biome === "forest") {
    s += sun;
    s += rect(ox, hz, ow, h, P.ground);
    s += ell(x + w * 0.28, hz, w * 0.55, h * 0.2, P.mtn);
    s += ell(x + w * 0.8, hz + h * 0.02, w * 0.5, h * 0.17, P.mtnDark);
    s += tree(x + w * 0.3, y + h * 0.86, h * 0.34, P);
    s += tree(x + w * 0.58, y + h * 0.92, h * 0.42, P);
    s += tree(x + w * 0.78, y + h * 0.86, h * 0.32, P);
  } else if (biome === "city") {
    s += sun;
    s += rect(ox, hz, ow, h, P.ground);
    const bases = [[0.14, 0.34], [0.3, 0.5], [0.46, 0.28], [0.58, 0.46], [0.74, 0.36]];
    bases.forEach(([bx, bh], i) => {
      const X = x + w * bx, W = w * 0.13, H = h * bh;
      s += rect(X, hz - H, W, H, i % 2 ? P.bldDark : P.bld);
      s += rect(X + W * 0.2, hz - H + H * 0.12, W * 0.2, H * 0.1, P.win) + rect(X + W * 0.6, hz - H + H * 0.12, W * 0.2, H * 0.1, P.win);
    });
  }
  return s;
}

const pad = (b, p = 7) => `${f1(b[0] - p)} ${f1(b[1] - p)} ${f1(b[2] + 2 * p)} ${f1(b[3] + 2 * p)}`;

// Clip + scene for drawing a placed sticker directly on the big map (global coords).
export function mapSceneGroup(state) {
  const id = `mclip-${state.code}`;
  return `<clipPath id="${id}"><path d="${state.d}"/></clipPath>` +
    `<g clip-path="url(#${id})">${scene(BIOME[state.code], state.bbox)}</g>`;
}

// A real photo, cover-fit into the state's bounding box and clipped to its
// silhouette — the state "filled" with a memory instead of a generated scene.
export function mapPhotoGroup(state, href) {
  const id = `pclip-${state.code}`;
  const [x, y, w, h] = state.bbox;
  return `<clipPath id="${id}"><path d="${state.d}"/></clipPath>` +
    `<image href="${href}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" ` +
    `preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
}

// Standalone sticker SVG (tray + drag ghost): white die-cut border + scene + dark edge.
export function stickerSVG(state, cls = "sticker-svg") {
  const id = `sclip-${state.code}`;
  const d = state.d;
  return `<svg class="${cls}" viewBox="${pad(state.bbox)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<path d="${d}" fill="#ffffff" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/>` +
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<g clip-path="url(#${id})">${scene(BIOME[state.code], state.bbox)}</g>` +
    `<path d="${d}" fill="none" stroke="#26311f" stroke-width="1.6" stroke-linejoin="round"/>` +
    `</svg>`;
}

export const STATES = US_STATES;
