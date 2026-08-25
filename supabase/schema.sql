-- Continua Schema Consolidation
-- Merged from step1-step9 + new devices + workspace_shares tables
-- Run this in Supabase SQL Editor to set up the full schema.

-- ============================================================
-- CORE TABLES (from step1)
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Waitlist (from step3)
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  referral_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORG MODEL (from step6)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORG MANIFESTS (from step8)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  layout TEXT DEFAULT 'default',
  preferred_mode TEXT DEFAULT 'local',
  apps_to_include JSONB DEFAULT '[]',
  excluded_apps JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORG PRESENCE (from step9)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT,
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTEXT & JOURNAL (from step2, step5, step7)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.context_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  version TEXT DEFAULT '1',
  schema_version TEXT DEFAULT '1.0',
  device_id TEXT,
  deleted BOOLEAN DEFAULT false,
  vector_clock JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, domain)
);

CREATE TABLE IF NOT EXISTS public.context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  importance INTEGER DEFAULT 0,
  project_tag TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB DEFAULT '{}',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAIRING (from step4)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pairing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash TEXT NOT NULL,
  device_name TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DEVICE REGISTRY (NEW — Phase 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  trust_level TEXT NOT NULL DEFAULT 'temporary'
    CHECK (trust_level IN ('trusted', 'temporary', 'revoked')),
  platform TEXT,
  browser TEXT,
  fingerprint TEXT NOT NULL,
  capabilities JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, fingerprint)
);

-- ============================================================
-- WORKSPACE SHARES (NEW — Phase 5 foundation)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view'
    CHECK (permission IN ('view', 'edit', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_context_records_user_domain ON context_records(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_context_records_user_updated ON context_records(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_events_user_created ON journal_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_events_org_created ON journal_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(user_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_org_presence_user_org ON org_presence(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_workspace_shares_workspace ON workspace_shares(workspace_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_shares ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Organizations
CREATE POLICY "Members read own orgs" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "Users create orgs" ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Org Members
CREATE POLICY "Members read org membership" ON org_members FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "Org owners manage members" ON org_members FOR ALL
  USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

-- Org Manifests
CREATE POLICY "Members read org manifests" ON org_manifests FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Org Presence
CREATE POLICY "Members read org presence" ON org_presence FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "Members update own presence" ON org_presence FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Members insert own presence" ON org_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Context Records
CREATE POLICY "Users manage own context" ON context_records FOR ALL
  USING (user_id = auth.uid());

-- Context Snapshots
CREATE POLICY "Users manage own snapshots" ON context_snapshots FOR ALL
  USING (user_id = auth.uid());

-- Journal Events
CREATE POLICY "Users manage own journal" ON journal_events FOR ALL
  USING (user_id = auth.uid());

-- Devices
CREATE POLICY "Users manage own devices" ON devices FOR ALL
  USING (user_id = auth.uid());

-- Workspace Shares
CREATE POLICY "Users read shares they own or receive" ON workspace_shares FOR SELECT
  USING (shared_by = auth.uid() OR shared_with = auth.uid()
    OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY "Users create shares for own workspaces" ON workspace_shares FOR INSERT
  WITH CHECK (shared_by = auth.uid());
CREATE POLICY "Users delete shares they created" ON workspace_shares FOR DELETE
  USING (shared_by = auth.uid());

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON audit_log(org_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit log" ON audit_log FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "System inserts audit log" ON audit_log FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Org admins read org audit log" ON audit_log FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));

-- ============================================================
-- JOURNAL RETENTION (90 days)
-- ============================================================

-- Note: Run this as a cron job in Supabase:
-- SELECT cron.schedule('journal-cleanup', '0 3 * * *',
--   $$DELETE FROM journal_events WHERE created_at < now() - interval '90 days'$$);
