// Generate js/us-latlng.js — simplified geographic (lng/lat) outlines per state,
// used to turn a photo's GPS coordinate into the state it was taken in.
// Run:  cd tools && npm run build:geo
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const DECIMALS = 2; // ~1.1 km — plenty to decide which state a photo is in
const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;

const FIPS = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

const us = JSON.parse(readFileSync(here("./node_modules/us-atlas/states-10m.json")));
const feats = feature(us, us.objects.states).features;

// dedupe consecutive identical points after rounding
function simplifyRing(ring) {
  const out = [];
  let prev = null;
  for (const [lng, lat] of ring) {
    const p = [q(lng), q(lat)];
    if (!prev || p[0] !== prev[0] || p[1] !== prev[1]) out.push(p);
    prev = p;
  }
  return out.length >= 4 ? out : null;
}

const out = {};
let rings = 0, points = 0;
for (const f of feats) {
  const code = FIPS[f.id];
  if (!code) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const stateRings = [];
  for (const poly of polys) {
    const ring = simplifyRing(poly[0]); // outer ring only (states have no meaningful holes)
    if (ring) { stateRings.push(ring); rings++; points += ring.length; }
  }
  out[code] = stateRings;
}

const js = "// AUTO-GENERATED from us-atlas (public domain). Geographic outlines per\n" +
  "// state for GPS → state lookup. [code]: array of [lng,lat] rings.\n" +
  "export const US_LATLNG = " + JSON.stringify(out) + ";\n";
writeFileSync(here("../js/us-latlng.js"), js);
console.log(`Wrote js/us-latlng.js — ${Object.keys(out).length} states, ${rings} rings, ${points} points, ${js.length} bytes`);
