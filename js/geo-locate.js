// Turn a GPS coordinate into the US state (postal code) it falls in, using the
// generated geographic outlines. Ray-casting point-in-polygon with a per-ring
// bounding-box fast path so batches of photos sort quickly.
import { US_LATLNG } from "./us-latlng.js";

// Precompute [minLng, minLat, maxLng, maxLat] for each ring once.
const BBOX = {};
for (const [code, rings] of Object.entries(US_LATLNG)) {
  BBOX[code] = rings.map((ring) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < x0) x0 = lng; if (lng > x1) x1 = lng;
      if (lat < y0) y0 = lat; if (lat > y1) y1 = lat;
    }
    return [x0, y0, x1, y1];
  });
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Returns a 2-letter state code, or null if the point isn't inside any state.
export function stateAtLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const [code, rings] of Object.entries(US_LATLNG)) {
    const boxes = BBOX[code];
    for (let i = 0; i < rings.length; i++) {
      const [x0, y0, x1, y1] = boxes[i];
      if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
      if (pointInRing(lng, lat, rings[i])) return code;
    }
  }
  return null;
}
