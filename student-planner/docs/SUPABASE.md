# Plan: cloud sync with Supabase

**Status: not implemented.** The app currently stores data only in the browser of each device.
This document describes how sync will be added without rewriting the app.

## Why the current code is ready for it

- The UI never touches `localStorage` directly. It only uses the `Repository` interface
  (`src/storage/repository.ts`): `load()`, `save(data)`, optional `subscribe(onChange)`.
- `src/storage/index.ts → createRepository()` is the single place that picks the storage.
- Every event, task and checklist item has a globally unique `id` (UUID) and an `updatedAt`
  timestamp, which is what a merge between devices needs.
- All data is plain JSON and is validated on load (`src/domain/validation.ts`), so data from the
  cloud goes through the same checks as local data.

## Steps

1. Create a free project at <https://supabase.com>. Copy the **Project URL** and the **anon public key**
   (never the `service_role` key — it must not be in a website).
2. Put them into `student-planner/.env.local` (this file is git-ignored):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. Create the tables (SQL editor):

   ```sql
   create table public.events (
     id uuid primary key,
     user_id uuid not null references auth.users on delete cascade default auth.uid(),
     data jsonb not null,           -- the ScheduleEvent object
     updated_at timestamptz not null,
     deleted boolean not null default false
   );
   create table public.tasks (like public.events including all);
   create table public.settings (
     user_id uuid primary key references auth.users on delete cascade default auth.uid(),
     data jsonb not null,
     updated_at timestamptz not null
   );

   alter table public.events enable row level security;
   alter table public.tasks enable row level security;
   alter table public.settings enable row level security;

   create policy "own rows" on public.events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
   create policy "own rows" on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
   create policy "own rows" on public.settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
   ```

4. Add login (email magic link) with `@supabase/supabase-js`.
5. Implement `SupabaseRepository` + a `SyncedRepository` that:
   - keeps `LocalRepository` as an offline cache (the app keeps working without internet);
   - pushes changed records, pulls records changed since the last sync;
   - resolves conflicts per record by the newest `updatedAt` ("last write wins");
   - uses `deleted = true` (soft delete) so deletions also sync.
6. Return it from `createRepository()` when the user is logged in.
7. **Test before claiming it works:** change an event on Windows → it appears on iPhone; edit offline on
   iPhone → it syncs after reconnecting; delete on one device → gone on the other.
