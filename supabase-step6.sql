-- ============================================================================
-- Continua — Step 6: Team Foundation (Phase G)
--
-- Per docs/CONTINUA_CORE_ARCHITECTURE.md:
--   S5  relational membership replaces jsonb members
--   §7  legacy retirement = archive → revoke → defer drop
--   §S1 RLS mirrors lib/authz.ts rules as defense-in-depth; the TS gate
--       is normative. Admin-key server paths bypass RLS by design.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Legacy retirement — filmmaker-era tables replaced by the org model.
--    Archived once into `_archive`, then client DML is revoked so no anon/
--    authenticated path can write them again. Physical DROP is deferred to a
--    later step gated on a written kernel-parity checklist. Tables still
--    referenced by live code paths (events, presence, snapshots, files) are
--    intentionally left untouched.
-- ----------------------------------------------------------------------------

create schema if not exists _archive;

do $$
begin
  if to_regclass('_archive.workspaces') is null then
    create table _archive.workspaces as select * from public.workspaces;
  end if;
  if to_regclass('_archive.projects') is null then
    create table _archive.projects as select * from public.projects;
  end if;
  if to_regclass('_archive.invites') is null then
    create table _archive.invites as select * from public.invites;
  end if;
end $$;

revoke insert, update, delete, truncate on public.workspaces  from anon, authenticated;
revoke insert, update, delete, truncate on public.projects    from anon, authenticated;
revoke insert, update, delete, truncate on public.invites     from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Organizations & memberships (relational — the S5 model)
-- ----------------------------------------------------------------------------

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_organizations_owner on public.organizations (owner_id);

create table if not exists public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists idx_org_members_user on public.org_members (user_id);

-- ----------------------------------------------------------------------------
-- 3. Membership predicate functions (single source of truth inside Postgres).
--    SECURITY DEFINER so RLS policies can consult them without recursion.
--    Created after the tables because `language sql` bodies are validated
--    at CREATE time.
-- ----------------------------------------------------------------------------

create schema if not exists app;

create or replace function app.org_role(p_org uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.org_members
  where org_id = p_org and user_id = p_user
$$;

create or replace function app.is_org_member(p_org uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = p_user
  )
$$;

grant usage on schema app to authenticated;
grant execute on function app.org_role(uuid, uuid) to authenticated;
grant execute on function app.is_org_member(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. RLS — mirrors lib/authz.ts (defense-in-depth; admin paths bypass)
-- ----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;

drop policy if exists "orgs: read owner or member"  on public.organizations;
drop policy if exists "orgs: insert owner"          on public.organizations;
drop policy if exists "orgs: update owner"          on public.organizations;
drop policy if exists "orgs: delete owner"          on public.organizations;

create policy "orgs: read owner or member" on public.organizations
  for select using (
    owner_id = auth.uid()
    or app.is_org_member(id, auth.uid())
  );

create policy "orgs: insert owner" on public.organizations
  for insert with check (owner_id = auth.uid());

create policy "orgs: update owner" on public.organizations
  for update using (owner_id = auth.uid());

create policy "orgs: delete owner" on public.organizations
  for delete using (owner_id = auth.uid());

drop policy if exists "members: read fellow members" on public.org_members;
drop policy if exists "members: admins manage"       on public.org_members;
drop policy if exists "members: self leave"          on public.org_members;

create policy "members: read fellow members" on public.org_members
  for select using (
    user_id = auth.uid()
    or app.is_org_member(org_id, auth.uid())
  );

create policy "members: admins manage" on public.org_members
  for all using (
    app.org_role(org_id, auth.uid()) in ('owner','admin')
  )
  with check (
    app.org_role(org_id, auth.uid()) in ('owner','admin')
  );

create policy "members: self leave" on public.org_members
  for delete using (user_id = auth.uid());
