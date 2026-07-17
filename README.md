# Fill Your Map

A simple, intuitive web app for filling in the US states you've visited — a
digital version of a fill-in wall map with peel-and-stick state stickers.
**Drag a state's sticker onto its outline** to fill it in; drop it wrong and it
politely tells you where it goes. Progress is saved on your device, and the app
installs to a phone's home screen like a native app.

## How it works

The map is the whole stage. The stickers live in a **"sticker sheet" that
slides up from the bottom only when you're adding a place** — summoned by the
**"＋ Add a sticker"** button or by tapping the empty state you visited. The map
gracefully shrinks to make room, so it's never hidden behind the sheet.

Three ways to place a sticker (all end in the same place):

- **Drag** a sticker up from the sheet onto the matching state.
- **Tap** the sticker, then **tap its state** — easiest on a phone.
- **Tap an empty state** to open the sheet at its sticker.

Tap a filled-in state to peel its sticker back off.

## Features

- **Full-view outline map** — a clean white board with each state's bold
  outline (and abbreviation), filled by a little postcard-style sticker clipped
  to that state's real shape.
- **Adventures per state** — tap a filled state to add photos, a first-visited
  date, and a short memory. The photos live in the card; the pretty sticker
  stays on the map.
- **Add where you are** — "Add where I am now" (in the ⋯ menu) drops the state
  you're currently in, using the browser's location (no Google needed).
- **On-demand sticker sheet** — a bottom drawer that appears only when you're
  adding a state, keeping the map front and center.
- **Drag-and-drop that works on touch** — built on pointer events, so it works
  with a mouse, a finger, or the keyboard. Wrong drops are gently rejected.
- **Live progress** — "23 / 50" with a bar. DC is a bonus sticker that doesn't
  count against the 50.
- **Search** the sheet to find a state fast.
- **Personalized** — put a name on the map ("Grandpa Joe").
- **Works offline & installs** — it's a PWA: "Add to Home Screen" gives it an
  app icon, and it keeps working without a connection.
- **Back up / restore** your progress to a JSON file.

## About the sticker art

The stickers are **generated placeholders** — a postcard scene (mountains,
desert, coast, plains, forest) assigned to each state by region and clipped to
its silhouette. They're built to be swapped for final illustrated artwork:

- Drop one image per state into [`art/`](art/) (named `CO.png`, `TX.png`, …).
- List those codes in `ART_CODES` in [`js/scenes.js`](js/scenes.js).

Listed states use the real art on the map, in the tray, and on the drag ghost;
everything else keeps its generated scene, so art can roll in a few states at a
time. See [`art/README.md`](art/README.md) for the file spec.

## Adventures & photos

Tap a filled-in state to open its **adventure card** — add photos from the trip,
a first-visited date, and a short memory. The map keeps its sticker; the photos
live here in the card.

**Auto-sort by location.** Tap **"Add trip photos"** in the sticker sheet and
pick a whole batch at once — each photo is matched to the state it was taken in
(by reading its GPS metadata with `js/exif.js` and testing the coordinate
against the state outlines in `js/geo-locate.js`) and lands there automatically.
Photos with no location info are counted so you can place them by hand. All of
this runs on-device — no photo leaves the browser.

For this prototype, photos are downscaled and saved **on the device**
(localStorage), which is space-limited — it's here to prove the experience. In
the real version, photos will live in the user's **own Google account** so we
host nothing and only store a reference:

- **Google Photos** — as of March 2025 the API only allows reading a user's
  existing library through the **Picker API** (temporary access), or reading
  media the app itself **uploaded** (`appendonly`). So the durable path is:
  upload the attached photo into a "Fill Your Map" album in the user's Photos,
  store only the media-item id, and re-fetch the display URL on demand.
- **Google Drive** (`drive.file`) — a simpler, stabler alternative: the app
  stores photos in a folder in the user's own Drive and reads back what it
  created.

Either way, only `photo.src` in the data model changes (from a data URL to a
reference); the map, adventure card, and everything else stay the same. Both
require Google sign-in and (for public launch) Google's OAuth verification.

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

The map geometry (`js/us-geo.js`), the geographic outlines used for GPS→state
photo sorting (`js/us-latlng.js`), and the icons (`icons/`) are generated from
the public-domain [us-atlas](https://github.com/topojson/us-atlas) dataset (US
Census Bureau). See [`tools/`](tools/) to rebuild them (`npm run build`).
Sticker scenes are generated at runtime by `js/scenes.js`.

## Credits

- Map data: [us-atlas](https://github.com/topojson/us-atlas) / US Census Bureau
  (public domain), projected with [d3-geo](https://github.com/d3/d3-geo).
