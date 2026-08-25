# Phase 1: Device Trust & Schema Consolidation — Implementation Checklist

## Overview
Every machine gets an identity. The schema has a single source of truth.
Estimated: ~1 week of focused work.

## Tasks

### 1.1 Schema Consolidation
- [ ] Create `supabase/schema.sql` by merging step1–step9
- [ ] Add `devices` table (see schema below)
- [ ] Add `workspace_shares` table (for Phase 5, but schema now)
- [ ] Mark step1–step9 files as deprecated with comments
- [ ] Update `supabase-schema.sql` (full reset) to include all tables
- [ ] **User action required:** Run consolidated schema in Supabase SQL Editor

### 1.2 Device Registry API
- [ ] `POST /api/devices/register` — register device, set trust level
- [ ] `GET /api/devices` — list user's devices
- [ ] `PATCH /api/devices/[id]` — update trust level
- [ ] `DELETE /api/devices/[id]` — revoke device
- [ ] `POST /api/devices/[id]/heartbeat` — update last_seen_at

### 1.3 Device Capability Detection
- [ ] Create `lib/capabilities.ts` — `detectCapabilities()` function
- [ ] Create `lib/stores/device.store.ts` — device identity + capabilities store
- [ ] Auto-register device on first auth
- [ ] Auto-heartbeat every 5 minutes when app is active

### 1.4 Device Trust UI
- [ ] Add "Devices" section to Settings app
- [ ] Show list of registered devices with trust levels
- [ ] Allow toggle between trusted/temporary
- [ ] Allow revoke (with confirmation)
- [ ] Show device info: platform, browser, last seen

### 1.5 Integration
- [ ] Wire device store to auth flow (auto-register after login)
- [ ] Wire heartbeat to window focus/visibility events
- [ ] Store device capabilities in `devices.capabilities` column
- [ ] Export device capabilities for Phase 2/3 use

## Database Schema

```sql
-- Device Registry
CREATE TABLE IF NOT EXISTS devices (
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

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devices" ON devices
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_fingerprint ON devices(user_id, fingerprint);
```

## Files to Create
- `lib/capabilities.ts`
- `lib/stores/device.store.ts`
- `app/api/devices/register/route.ts`
- `app/api/devices/route.ts`
- `app/api/devices/[id]/route.ts`
- `app/api/devices/[id]/heartbeat/route.ts`
- `components/settings/device-manager.tsx`

## Files to Modify
- `lib/stores/auth.store.ts` — trigger device registration after auth
- `components/apps/settings.tsx` — add Devices section
- `supabase/schema.sql` — merge all steps + add devices table
- `supabase-schema.sql` — update full reset

## Validation
After completion:
1. Login → device auto-registers in `devices` table
2. Settings → Devices shows the registered device
3. Can toggle trust level between trusted/temporary
4. Can revoke a device
5. Heartbeat updates `last_seen_at` every 5 minutes
6. `detectCapabilities()` returns correct platform/browser/features
