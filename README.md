# Fill Your Map

A simple, intuitive web app for filling in the US states you've visited — a
digital version of a fill-in wall map with peel-and-stick state stickers.
**Drag a state's sticker onto its outline** to fill it in; drop it wrong and it
politely tells you where it goes. Progress is saved on your device, and the app
installs to a phone's home screen like a native app.

## How it works

Three ways to place a sticker (all end in the same place):

- **Drag** a sticker from the tray onto the matching state.
- **Tap** the sticker, then **tap its state** — easiest on a phone.
- **Tap an empty state** to jump to its sticker in the tray.

Tap a filled-in state to peel its sticker back off.

## Features

- **Outline map + scenic stickers** — a clean white board with each state's
  bold outline (and abbreviation), filled by a little postcard-style sticker
  clipped to that state's real shape.
- **Drag-and-drop that works on touch** — built on pointer events, so it works
  with a mouse, a finger, or the keyboard. Wrong drops are gently rejected.
- **Live progress** — "23 / 50 · 46%" with a bar. DC is a bonus sticker that
  doesn't count against the 50.
- **Search** the tray to find a state fast.
- **Personalized** — put a name on the map ("Grandpa Joe").
- **Works offline & installs** — it's a PWA: "Add to Home Screen" gives it an
  app icon, and it keeps working without a connection.
- **Back up / restore** your progress to a JSON file.

## About the sticker art

The stickers are **generated placeholders** — a postcard scene (mountains,
desert, coast, plains, forest) assigned to each state by region and clipped to
its silhouette. They're meant to be swapped for final artwork. To drop in real
art, replace `stickerSVG()` / `mapSceneGroup()` in `js/scenes.js` so they point
at a real per-state image (e.g. `<image href="art/AZ.png" clip-path="…"/>`)
instead of the generated scene. Nothing else changes — the map, tray, and
drag-and-drop stay exactly the same.

## Run it locally

Plain HTML/CSS/JS, **no build step**. Because it uses ES modules, serve it over
HTTP (not a `file://` path):

```bash
python3 -m http.server 8000     # from the repo root
# then open http://localhost:8000
```

## Deploy it (free)

Fully static — publish the repo root to any static host:

- **GitHub Pages** — Settings → Pages → deploy from branch.
- **Netlify / Cloudflare Pages** — no build command, publish directory `/`.
- **Firebase Hosting** — `firebase deploy` (a natural fit if you add sign-in).

## How data is stored

Everything lives in the browser's `localStorage`, behind a small storage module
(`js/storage.js`). No account, no server. Use **Back up** to save a copy.

## Roadmap: Google sign-in + cloud sync

Persistence goes through one interface so this is a contained change:

```js
interface Store { load(): Promise<AppData>; save(data: AppData): Promise<void>; }
```

To sync across devices with Google sign-in (recommended: **Firebase**): create
a project, enable **Authentication → Google** and **Firestore**, add a
`FirestoreStore` implementing that interface keyed by the user's `uid`, and swap
the one line in `createStore()`. The UI never touches storage directly, so
nothing else changes.

## Regenerating the map & stickers

The map geometry (`js/us-geo.js`) and icons (`icons/`) are generated from the
public-domain [us-atlas](https://github.com/topojson/us-atlas) dataset (US
Census Bureau). See [`tools/`](tools/) to rebuild them. Sticker scenes are
generated at runtime by `js/scenes.js`.

## Credits

- Map data: [us-atlas](https://github.com/topojson/us-atlas) / US Census Bureau
  (public domain), projected with [d3-geo](https://github.com/d3/d3-geo).
