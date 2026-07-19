-- ============================================================================
-- ContinuaOS — Step 3: Waitlist Table
-- ============================================================================
-- Run this THIRD in Supabase SQL Editor (after Steps 1 & 2 succeeded)
-- ============================================================================

-- Waitlist — collect beta access requests
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'invited', 'rejected')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_waitlist_status on public.waitlist(status);
create index if not exists idx_waitlist_email on public.waitlist(email);

-- RLS
alter table public.waitlist enable row level security;

-- Anyone can submit to waitlist (insert only)
create policy "Waitlist: anyone can submit"
  on public.waitlist for insert
  with check (true);

-- Only admins can read waitlist entries
create policy "Waitlist: admins can read"
  on public.waitlist for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()::text
      and users.is_admin = true
    )
  );

-- Only admins can update waitlist status
create policy "Waitlist: admins can update"
  on public.waitlist for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()::text
      and users.is_admin = true
    )
  );
