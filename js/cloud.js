// ---------------------------------------------------------------------------
// Supabase cloud layer — Google sign-in + map sync (Postgres) + photos (Storage).
//
// Loaded lazily, and ONLY when js/supabase-config.js holds real values, so the
// app runs fully on-device until cloud is configured. See docs/supabase-setup.md.
// ---------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let sb = null;

export function initCloud(config) {
  sb = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return sb;
}

// cb(event, user|null). Fires once on load with the restored session, then on
// every sign-in / sign-out.
export function onAuthChange(cb) {
  sb.auth.onAuthStateChange((event, session) => cb(event, session?.user ?? null));
}

export async function signIn(redirectTo) {
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) throw error;
}
export async function signOut() {
  await sb.auth.signOut();
}

// --- photos (Storage bucket "photos", files at <userId>/<photoId>.jpg) -------
export async function signedUrl(path) {
  const { data } = await sb.storage.from("photos").createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}
export async function uploadPhoto(userId, id, blob) {
  const path = `${userId}/${id}.jpg`;
  const { error } = await sb.storage.from("photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}
export async function deletePhoto(path) {
  try { await sb.storage.from("photos").remove([path]); } catch { /* best-effort */ }
}

// --- map data (row per user in the "maps" table) -----------------------------
// Implements the same load()/save() interface as the local store.
export function cloudStore(user) {
  return {
    async load() {
      const { data, error } = await sb
        .from("maps").select("traveler_name, visited").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      const visited = (data && data.visited) || {};
      // resolve stored photo paths into temporary display URLs
      for (const code of Object.keys(visited)) {
        for (const p of visited[code].photos || []) {
          if (p.path) p.src = await signedUrl(p.path);
        }
      }
      return { version: 1, travelerName: (data && data.traveler_name) || "", visited };
    },
    async save(appData) {
      const visited = {};
      for (const [code, e] of Object.entries(appData.visited || {})) {
        visited[code] = {
          date: e.date ?? null,
          note: e.note ?? "",
          // store only the durable reference, never the (transient) signed URL
          photos: (e.photos || []).filter((p) => p.path).map((p) => ({ id: p.id, path: p.path })),
        };
      }
      const { error } = await sb.from("maps").upsert({
        user_id: user.id,
        traveler_name: appData.travelerName || "",
        visited,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}
