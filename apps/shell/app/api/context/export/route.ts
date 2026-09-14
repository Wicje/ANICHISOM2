/**
 * Context Protocol — Export
 *
 * GET /api/context/export
 * Export all user context as a downloadable JSON snapshot.
 * Uses the Context Kernel protocol.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const decision = authorize(
      { userId: auth.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.read',
      { type: 'context', owner: auth.userId }
    );
    if (!decision.ok) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const repo = getContextRepository();
    const snapshot = await repo.exportAll(auth.userId);

    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="continua-context-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e) {
    console.error('[context/export] Error:', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
