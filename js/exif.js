// Minimal EXIF GPS reader — no dependencies. Given a JPEG's ArrayBuffer, returns
// { lat, lng } in decimal degrees, or null if the photo carries no location.
// Parses only what we need: JPEG APP1 → TIFF header → GPS IFD.

function ifdEntries(view, ifd, le) {
  const count = view.getUint16(ifd, le);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    entries.push({ tag: view.getUint16(e, le), valOff: e + 8 });
  }
  return entries;
}

function parseGps(view, tiff, gpsIfd, le) {
  const u32 = (o) => view.getUint32(o, le);
  const rat = (a) => { const d = u32(a + 4); return d ? u32(a) / d : 0; };
  const map = {};
  for (const e of ifdEntries(view, gpsIfd, le)) map[e.tag] = e;
  const latE = map[0x0002], lngE = map[0x0004], latR = map[0x0001], lngR = map[0x0003];
  if (!latE || !lngE || !latR || !lngR) return null;
  const dms = (entry) => {
    const base = tiff + u32(entry.valOff); // 3 RATIONALs: deg, min, sec
    return rat(base) + rat(base + 8) / 60 + rat(base + 16) / 3600;
  };
  let lat = dms(latE), lng = dms(lngE);
  if (String.fromCharCode(view.getUint8(latR.valOff)) === "S") lat = -lat;
  if (String.fromCharCode(view.getUint8(lngR.valOff)) === "W") lng = -lng;
  if (!lat && !lng) return null;
  return { lat, lng };
}

function parseTiff(view, tiff) {
  const bo = view.getUint16(tiff);
  const le = bo === 0x4949; // "II" little-endian; "MM" (0x4D4D) big-endian
  if (!le && bo !== 0x4d4d) return null;
  if (view.getUint16(tiff + 2, le) !== 0x002a) return null;
  const ifd0 = tiff + view.getUint32(tiff + 4, le);
  for (const e of ifdEntries(view, ifd0, le)) {
    if (e.tag === 0x8825) { // GPS IFD pointer
      return parseGps(view, tiff, tiff + view.getUint32(e.valOff, le), le);
    }
  }
  return null;
}

export function readGps(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda) break; // start of scan — metadata is done
      const size = view.getUint16(offset + 2);
      if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966) { // "Exif"
        return parseTiff(view, offset + 10);
      }
      offset += 2 + size;
    }
  } catch { /* malformed — treat as no location */ }
  return null;
}
