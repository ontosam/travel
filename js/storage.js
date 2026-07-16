// ---------------------------------------------------------------------------
// Storage layer
//
// The app talks to a small async interface so the backend can change without
// touching the UI. Today it's LocalStore (browser localStorage). When we add
// Google sign-in, drop in a FirestoreStore with the SAME shape and swap the one
// line in `createStore()` — nothing else in the app needs to change.
//
//   interface Store {
//     load(): Promise<AppData>
//     save(data: AppData): Promise<void>
//   }
//
//   AppData = {
//     version: number,
//     travelerName: string,
//     visited: { [postalCode: string]: { date: string | null } }
//   }
//
// `visited[code]` present  => that state is marked visited.
// `visited[code].date`     => optional "first visited" date (YYYY-MM-DD) or null.
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1;

export function emptyData() {
  return { version: SCHEMA_VERSION, travelerName: "", visited: {} };
}

// Guard against malformed / tampered / partial data so the UI never crashes.
function normalize(raw) {
  const data = emptyData();
  if (raw && typeof raw === "object") {
    if (typeof raw.travelerName === "string") data.travelerName = raw.travelerName;
    if (raw.visited && typeof raw.visited === "object") {
      for (const [code, entry] of Object.entries(raw.visited)) {
        if (typeof code !== "string") continue;
        const key = code.toUpperCase();
        const date =
          entry && typeof entry === "object" && typeof entry.date === "string"
            ? entry.date
            : null;
        data.visited[key] = { date };
      }
    }
  }
  return data;
}

class LocalStore {
  constructor(key = "us-states-tracker/v1") {
    this.key = key;
  }

  async load() {
    try {
      const raw = localStorage.getItem(this.key);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (err) {
      console.warn("Could not read saved data; starting fresh.", err);
      return emptyData();
    }
  }

  async save(data) {
    const clean = normalize(data);
    clean.version = SCHEMA_VERSION;
    try {
      localStorage.setItem(this.key, JSON.stringify(clean));
    } catch (err) {
      // e.g. private-mode quota errors — surface without losing the session.
      console.error("Could not save data.", err);
      throw err;
    }
  }
}

// The single swap point for cloud sync later:
//   return new FirestoreStore(user.uid);
export function createStore() {
  return new LocalStore();
}
