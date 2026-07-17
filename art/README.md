# State sticker art

Drop the final illustrated stickers here — **one image per state** — and they
replace the generated placeholder scenes on the map and in the tray.

## What makes a file usable

- **One state per file.** Not a sheet of six. The composite "Set 1 / Set 2"
  pages can't be sliced into clean stickers automatically (they share a binder
  background, labels, and overlapping die-cut borders), so each state needs its
  own image.
- **Named by 2-letter postal code:** `AZ.png`, `CO.png`, `TX.png`, … (uppercase).
  Optional: `DC.png`.
- **Transparent background (PNG or WebP).** Just the sticker — **no label text,
  no binder/page, no drop shadow** baked in (the app adds its own shadow).
- **Roughly the state's silhouette.** A scene that fills the state shape works
  best, since the app can clip it cleanly to the real outline. Art that spills
  well outside the state (mascots, signs) will get trimmed on the map.
- **~800–1200 px** on the long side is plenty. Keep a consistent art style
  across states so the finished map looks like one set.

## Turning them on

1. Save the files here (e.g. `art/CO.png`).
2. Add those codes to `ART_CODES` in [`js/scenes.js`](../js/scenes.js):
   ```js
   export const ART_CODES = new Set(["CO", "TX", "AZ"]);
   ```
   Any state not listed keeps its generated scenic sticker, so you can roll art
   in a few states at a time.
3. If you use `.webp` instead of `.png`, change `ART_EXT` in the same file.

That's the whole switch — the map fill, the tray sticker, and the drag ghost all
pick up the real art automatically.
