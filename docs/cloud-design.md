# Login & photos — design

How Google sign-in + cloud sync + cloud photos fit onto the app, and the one
decision that shapes the setup.

## What we're adding

- **Google sign-in.** Signed in → your map (states, dates, notes) and photos
  sync to a **private, per-user** record in the cloud, across all your devices.
- **Signed out still works.** No account needed — the app keeps running fully
  on-device (localStorage), exactly as it does today.
- **Nothing lands in git. Nothing sits on our own servers.** Other users can't
  see your data (enforced by per-user security rules).

## How it maps onto the app (already built for this)

Every read/write already goes through one seam in [`js/storage.js`](../js/storage.js):

```js
Store { load(): Promise<AppData>; save(data): Promise<void> }
```

Cloud sync is just a `CloudStore` implementing that same interface, selected
when a user is signed in (and `LocalStore` when signed out). Photos get one
extra capability: `uploadPhoto(blob) -> reference`.

## Data model (per user)

- Record `maps/{userId}` = `{ travelerName, visited: { CODE: { date, note,
  photos: [{ id, ref }] } } }`.
- Photo **files** live in cloud storage at `photos/{userId}/{photoId}.jpg`; the
  record stores only the `ref` (a path). Display resolves `ref` → a URL.
- On first sign-in: offer to push the current on-device map up (a one-time
  merge), so nothing already filled in is lost.

## Security

Per-user rules only: a signed-in user can read/write **only** their own
`maps/{userId}` record and `photos/{userId}/**`. No public browsing, no
cross-user access.

## The one decision: which backend

Both are free-tier, private-per-user, support Google sign-in, and host nothing
of ours in git:

| | **Firebase** | **Supabase** |
|---|---|---|
| Google sign-in | smoothest | supported (a couple extra steps) |
| Database | Firestore (free) | Postgres (free) |
| Photo storage | Cloud Storage — **now needs the Blaze plan: a card on file, $0 within a 5 GB free tier + a budget cap** | Storage included, **free, no credit card** |
| Feel | one Google console, most common | one console, all-in-one free |

- Pick **Firebase** if a $0 card-on-file (with a spending cap) is acceptable —
  it's the smoothest Google integration.
- Pick **Supabase** to avoid a credit card entirely — fully free, photos
  included.

## Next step

Once the backend is chosen, the build is: an `auth.js` (Google sign-in +
sign-out + "who's signed in") and a `CloudStore` behind the existing interface,
plus a sign-in control in the UI. Then a click-by-click console guide (create
project, enable Google auth + database + storage, paste the security rules,
paste the config). The local app keeps working the entire time; cloud switches
on only when signed in.
