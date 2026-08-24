-- ============================================================
-- Continua — Step 9: Org Presence (Phase J v1)
-- Who's online, derived from explicit heartbeats. No websockets,
-- no third-party relay; a boot-time ping is enough for v1.
-- Run in Supabase SQL editor (idempotent).
-- ============================================================

create table if not exists public.org_presence (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  device text,
  primary key (org_id, user_id)
);

alter table public.org_presence enable row level security;

drop policy if exists "presence_read_members" on public.org_presence;
create policy "presence_read_members" on public.org_presence
  for select using (app.is_org_member(org_id));

drop policy if exists "presence_write_own" on public.org_presence;
create policy "presence_write_own" on public.org_presence
  for insert with check (user_id = auth.uid());

drop policy if exists "presence_update_own" on public.org_presence;
create policy "presence_update_own" on public.org_presence
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
