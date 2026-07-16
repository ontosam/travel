// Regenerate js/us-geo.js from the public-domain us-atlas TopoJSON.
// Run:  cd tools && npm install && npm run build
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const FIPS = {
  "01": ["AL", "Alabama"], "02": ["AK", "Alaska"], "04": ["AZ", "Arizona"],
  "05": ["AR", "Arkansas"], "06": ["CA", "California"], "08": ["CO", "Colorado"],
  "09": ["CT", "Connecticut"], "10": ["DE", "Delaware"], "11": ["DC", "District of Columbia"],
  "12": ["FL", "Florida"], "13": ["GA", "Georgia"], "15": ["HI", "Hawaii"],
  "16": ["ID", "Idaho"], "17": ["IL", "Illinois"], "18": ["IN", "Indiana"],
  "19": ["IA", "Iowa"], "20": ["KS", "Kansas"], "21": ["KY", "Kentucky"],
  "22": ["LA", "Louisiana"], "23": ["ME", "Maine"], "24": ["MD", "Maryland"],
  "25": ["MA", "Massachusetts"], "26": ["MI", "Michigan"], "27": ["MN", "Minnesota"],
  "28": ["MS", "Mississippi"], "29": ["MO", "Missouri"], "30": ["MT", "Montana"],
  "31": ["NE", "Nebraska"], "32": ["NV", "Nevada"], "33": ["NH", "New Hampshire"],
  "34": ["NJ", "New Jersey"], "35": ["NM", "New Mexico"], "36": ["NY", "New York"],
  "37": ["NC", "North Carolina"], "38": ["ND", "North Dakota"], "39": ["OH", "Ohio"],
  "40": ["OK", "Oklahoma"], "41": ["OR", "Oregon"], "42": ["PA", "Pennsylvania"],
  "44": ["RI", "Rhode Island"], "45": ["SC", "South Carolina"], "46": ["SD", "South Dakota"],
  "47": ["TN", "Tennessee"], "48": ["TX", "Texas"], "49": ["UT", "Utah"],
  "50": ["VT", "Vermont"], "51": ["VA", "Virginia"], "53": ["WA", "Washington"],
  "54": ["WV", "West Virginia"], "55": ["WI", "Wisconsin"], "56": ["WY", "Wyoming"],
};

const us = JSON.parse(readFileSync(here("./node_modules/us-atlas/states-albers-10m.json")));
const nation = JSON.parse(readFileSync(here("./node_modules/us-atlas/nation-albers-10m.json")));
const path = geoPath(); // us-atlas albers files are pre-projected onto a 975x610 canvas

const states = feature(us, us.objects.states).features
  .filter((f) => FIPS[f.id])
  .map((f) => {
    const [code, name] = FIPS[f.id];
    const [cx, cy] = path.centroid(f);
    const b = path.bounds(f);
    const r1 = (n) => Math.round(n * 10) / 10;
    const big = b[1][0] - b[0][0] > 26 && b[1][1] - b[0][1] > 20;
    return {
      code, name, d: path(f),
      bbox: [r1(b[0][0]), r1(b[0][1]), r1(b[1][0] - b[0][0]), r1(b[1][1] - b[0][1])],
      labelX: r1(cx), labelY: r1(cy), big,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const out =
  `// AUTO-GENERATED from us-atlas (public domain). Do not edit by hand.\n` +
  `// 50 states + DC, Albers USA projection, 975x610 canvas.\n` +
  `export const US_VIEWBOX = "0 0 975 610";\n` +
  `export const US_OUTLINE = ${JSON.stringify(path(feature(nation, nation.objects.nation)))};\n` +
  `export const US_BORDERS = ${JSON.stringify(path(mesh(us, us.objects.states, (a, b) => a !== b)))};\n` +
  `export const US_STATES = ${JSON.stringify(states)};\n`;

writeFileSync(here("../js/us-geo.js"), out);
console.log(`Wrote js/us-geo.js — ${states.length} states, ${out.length} bytes`);
