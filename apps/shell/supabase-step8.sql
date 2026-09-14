-- ============================================================================
-- Continua — Step 8: Workspace Assembly (Phase H)
--
-- Role manifests are declarative workspace definitions per org role.
-- Assembly is DERIVED at boot from membership + manifest — nothing is
-- materialized into personal state at grant time, so offboarding remains
-- "delete one seat row" (architecture invariant: onboarding-as-consequence).
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- Seat = permission rank (owner/admin/member, step 6). The OPTIONAL
-- manifest_role points at which workspace definition this person assembles;
-- null means derive from a default mapping of the seat.
alter table public.org_members add column if not exists manifest_role text;

create table if not exists public.org_manifests (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       text not null check (role ~ '^[a-z0-9-]{1,32}$'),
  manifest   jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (org_id, role)
);

alter table public.org_manifests enable row level security;

drop policy if exists "manifests: members read"    on public.org_manifests;
drop policy if exists "manifests: admins manage"   on public.org_manifests;

create policy "manifests: members read" on public.org_manifests
  for select using (app.is_org_member(org_id, auth.uid()));

create policy "manifests: admins manage" on public.org_manifests
  for all using (app.org_role(org_id, auth.uid()) in ('owner','admin'))
  with check (app.org_role(org_id, auth.uid()) in ('owner','admin'));
