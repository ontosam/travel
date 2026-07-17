# Supabase setup (login + cloud sync + photos)

One-time setup, all on the **free** plan, **no credit card**. When you're done,
sign-in appears in the app's ⋯ menu and each person's map + photos sync
privately to their own account.

The code is already written and gated: until you paste real keys into
[`js/supabase-config.js`](../js/supabase-config.js), the app just runs on-device.
You can either edit that file yourself, or send me the **Project URL** and
**anon key** (both are public/safe) and I'll drop them in and push.

---

## 1. Create the project

1. Go to **supabase.com** → sign in → **New project**.
2. Name it (e.g. `fill-your-map`), set a database password (keep it somewhere),
   pick a region near you → **Create**. Give it a minute to provision.

## 2. Grab your keys

Project → **Settings → API**. Copy two values:
- **Project URL** — `https://xxxxxxxx.supabase.co`
- **anon public key** — a long `eyJ...` string (the "anon"/"public" one, **not**
  the service role key).

These go in `js/supabase-config.js`.

## 3. Create the map table + rules

Project → **SQL Editor** → New query → paste and **Run**:

```sql
create table if not exists public.maps (
  user_id uuid primary key references auth.users(id) on delete cascade,
  traveler_name text not null default '',
  visited jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.maps enable row level security;

create policy "read own map"   on public.maps for select
  using (auth.uid() = user_id);
create policy "insert own map" on public.maps for insert
  with check (auth.uid() = user_id);
create policy "update own map" on public.maps for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 4. Create the photos bucket + rules

1. Project → **Storage → New bucket** → name it exactly **`photos`**, leave
   **Public** **OFF** (private) → Create.
2. Back in **SQL Editor**, run:

```sql
create policy "read own photos" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own photos" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own photos" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

Photos are stored at `photos/<your-user-id>/<photo>.jpg`, and these rules mean
**each person can only ever touch their own folder**.

## 5. Turn on Google sign-in

This is the fiddly part (Google's side), but you only do it once.

1. In Supabase: **Authentication → Providers → Google** → toggle **Enable**.
   Copy the **Callback URL** it shows (looks like
   `https://xxxxxxxx.supabase.co/auth/v1/callback`).
2. In **Google Cloud Console** (console.cloud.google.com):
   - Create/pick a project.
   - **APIs & Services → OAuth consent screen** → External → fill app name +
     your email → save. (You can leave it in "Testing" — add your + his Google
     accounts as test users. **No Google verification is needed**, because we
     only use basic sign-in, not Photos/Drive.)
   - **APIs & Services → Credentials → Create credentials → OAuth client ID →
     Web application.**
     - **Authorized JavaScript origins:** `https://ontosam.github.io`
     - **Authorized redirect URIs:** paste the Supabase **Callback URL** from
       step 1.
     - Create → copy the **Client ID** and **Client secret**.
3. Back in Supabase's Google provider: paste the **Client ID** + **Client
   secret** → **Save**.

## 6. Tell Supabase where the app lives

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://ontosam.github.io/travel/`
- **Redirect URLs:** add `https://ontosam.github.io/travel/`
  (and `http://localhost:8137/` too if you want to test locally).

## 7. Flip it on

Put your two keys into [`js/supabase-config.js`](../js/supabase-config.js):

```js
export const supabaseConfig = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi...your anon public key...",
};
```

Commit + push (or send me the values). The live site redeploys within a minute,
and **"Sign in with Google"** shows up in the ⋯ menu.

---

### What happens after

- Signed out → the app works exactly as now, on-device.
- First sign-in → your current on-device map is pushed up to your account.
- Signed in → map (states, dates, notes) and photos live in your private
  Supabase project; a photo stores only a reference, and the map still shows the
  sticker. Same map on every device.
- Free-tier limits are generous; downscaled photos keep storage tiny.
