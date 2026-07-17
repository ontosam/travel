// Supabase project keys. Fill these in from your project's
// Settings → API (see docs/supabase-setup.md).
//
// These two values are PUBLIC and safe to commit — the anon key is meant to be
// in client code; your data is protected by Row Level Security, not by hiding
// this key. Until real values are in here, the app just runs on-device (local).
export const supabaseConfig = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY",
};
