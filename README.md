# US States Tracker

A simple, intuitive web app for filling in the US states you've visited — a
digital version of the classic scratch-off / peel map. Tap a state on the map
(or in the list) to mark it visited; tap again to clear it. Your progress is
saved on your device, and the app installs to a phone's home screen like a
native app.

![The app: a parchment-style US map with visited states filled in green, a
progress counter, and a searchable list of all states.](icons/icon.svg)

## Features

- **Tap-to-fill map** — a geographically accurate US map (proper Alaska &
  Hawaii insets) where each state is individually tappable.
- **Live progress** — "23 / 50 · 46%" counter with a progress bar. DC is
  visitable as a bonus and doesn't count against the 50.
- **Searchable state list** — every state as a chip, kept in sync with the
  map; handy for the tiny New England states and for accessibility.
- **First-visited dates** — optionally record when you first reached a state.
- **Personalized** — put a name on the map ("Grandpa Joe's Travels").
- **Works offline & installs** — it's a PWA: "Add to Home Screen" gives it an
  app icon, and it keeps working without a connection.
- **Back up / restore** — export your data to a JSON file and re-import it.

## Run it locally

The app is plain HTML/CSS/JS with **no build step**. Because it uses ES
modules, it must be served over HTTP (not opened as a `file://` path):

```bash
# from the repo root — any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy it (free)

It's a fully static site, so any static host works — just publish the repo
root:

- **GitHub Pages** — Settings → Pages → deploy from branch.
- **Netlify / Cloudflare Pages** — point at the repo, no build command, publish
  directory `/`.
- **Firebase Hosting** — `firebase deploy` (a natural fit if you add sign-in
  below).

## How data is stored

Today everything lives in the browser's `localStorage` on the device you use,
behind a small storage module (`js/storage.js`). No account, no server, nothing
leaves the device. Use **Back up** periodically to save a copy.

## Roadmap: Google sign-in + cloud sync

The app was built so this is a contained change. All persistence goes through
one interface in `js/storage.js`:

```js
interface Store {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}
```

To sync across devices with Google sign-in (recommended: **Firebase**), the
plan is:

1. Create a Firebase project and enable **Authentication → Google** and
   **Firestore**.
2. Add the Firebase SDK and a `FirestoreStore` class implementing the same
   `load()` / `save()` interface, keyed by the signed-in user's `uid`.
3. Swap the one line in `createStore()` to return the `FirestoreStore` once a
   user is signed in (falling back to `LocalStore` when signed out).

Nothing in the UI (`js/app.js`) needs to change — it only talks to the
interface. The footer already notes "cloud sync & Google sign-in coming soon."

## Regenerating the map & icons

The map geometry (`js/us-geo.js`) and icons (`icons/`) are generated from the
public-domain [us-atlas](https://github.com/topojson/us-atlas) dataset (US
Census Bureau). See [`tools/`](tools/) to rebuild them.

## Credits

- Map data: [us-atlas](https://github.com/topojson/us-atlas) / US Census Bureau
  (public domain), projected with [d3-geo](https://github.com/d3/d3-geo).
