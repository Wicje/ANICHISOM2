/**
 * Context Protocol — Import
 *
 * POST /api/context/import
 * Import context from a snapshot (merge mode).
 * Uses the Context Kernel protocol.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import type { ContextSnapshot } from '@/lib/context-kernel';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const decision = authorize(
      { userId: auth.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.write',
      { type: 'context', owner: auth.userId }
    );
    if (!decision.ok) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { snapshot, mode = 'merge' } = body;

    if (!snapshot || typeof snapshot !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid snapshot data' }, { status: 400 });
    }

    const repo = getContextRepository();

    if (snapshot.domains && Array.isArray(snapshot.domains)) {
      const result = await repo.importAll(auth.userId, snapshot as ContextSnapshot);
      return NextResponse.json({
        ok: true,
        imported: result.imported,
        conflicts: result.conflicts,
      });
    }

    const legacySnapshot: ContextSnapshot = {
      id: crypto.randomUUID(),
      userId: auth.userId,
      createdAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      deviceId: 'import-legacy',
      domains: Object.entries(snapshot).map(([domain, data]) => ({
        id: `${auth.userId}:${domain}`,
        userId: auth.userId,
        domain,
        data,
        version: 0,
        deviceId: 'import-legacy',
        updatedAt: new Date().toISOString(),
        schemaVersion: '1.0.0',
        deleted: false,
      })),
      metadata: {
        domainCount: Object.keys(snapshot).length,
        totalSizeBytes: new TextEncoder().encode(JSON.stringify(snapshot)).length,
      },
    };

    const result = await repo.importAll(auth.userId, legacySnapshot);
    return NextResponse.json({
      ok: true,
      imported: result.imported,
      conflicts: result.conflicts,
    });
  } catch (e) {
    console.error('[context/import] Error:', e);
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
