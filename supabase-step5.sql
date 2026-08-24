-- ============================================================================
-- ContinuaOS — Step 5: Context tombstones
-- ============================================================================
-- Run this FIFTH in Supabase SQL Editor.
-- Adds the soft-delete flag required by lib/context-kernel/supabase-driver.ts
-- (saves were failing with "Could not find the 'deleted' column").
-- ============================================================================

alter table public.context_records
  add column if not exists deleted boolean not null default false;

create index if not exists idx_context_records_deleted
  on public.context_records(deleted);
